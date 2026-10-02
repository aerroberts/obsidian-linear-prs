import { mergeWindow } from '../merge-activity';
import type { PullRequest } from '../types';
import type { GitHubPullRequest, GraphqlResponse } from './responses';
import { requestJson } from './transport';
import { parsePullRequestUrl } from '../pull-request-matching';
import { forEachConcurrent } from '../async';

type Actor = { login: string; __typename: string } | null;
interface Connection<T> {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}
interface Review {
  author: Actor;
  state: string;
  body: string;
}
interface Comment {
  author: Actor;
}
interface Check {
  __typename: 'CheckRun' | 'StatusContext';
  id?: string;
  name?: string;
  context?: string;
  status?: string;
  state?: string;
  conclusion?: string | null;
  title?: string | null;
  summary?: string | null;
  text?: string | null;
  description?: string | null;
}
interface Snapshot {
  id: string;
  number: number;
  title: string;
  body: string;
  url: string;
  state: string;
  isDraft: boolean;
  createdAt: string;
  headRefOid: string;
  headRefName: string;
  baseRefName: string;
  baseRef: { target: { oid: string } } | null;
  mergeable: string;
  autoMergeRequest: { enabledAt: string } | null;
  mergeQueueEntry: { id: string } | null;
  reviews: Connection<Review>;
  reviewRequests: Connection<{ requestedReviewer: Actor }>;
  comments: Connection<Comment>;
  reviewThreads: Connection<{ id: string; comments: Connection<Comment> }>;
  statusCheckRollup: { id: string; contexts: Connection<Check> } | null;
}

const PAGE = 'pageInfo { hasNextPage endCursor }';
const ACTOR = 'author { login __typename }';
const CHECK_FIELDS = `__typename
  ... on CheckRun { id name status conclusion title summary }
  ... on StatusContext { context state description }`;
const FIELDS = `id number title body url state isDraft createdAt headRefOid headRefName
  baseRefName baseRef { target { oid } } mergeable autoMergeRequest { enabledAt }
  mergeQueueEntry { id }
  reviews(first:20) { nodes { ${ACTOR} state body } ${PAGE} }
  reviewRequests(first:20) { nodes { requestedReviewer { __typename ... on User { login } ... on Bot { login } } } ${PAGE} }
  comments(first:20) { nodes { ${ACTOR} } ${PAGE} }
  reviewThreads(first:10) { nodes { id comments(first:5) { nodes { ${ACTOR} } ${PAGE} } } ${PAGE} }
  statusCheckRollup { id contexts(first:50) { nodes { ${CHECK_FIELDS} } ${PAGE} } }`;

async function graphql<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const result = await requestJson<GraphqlResponse<T>>(
    'https://api.github.com/graphql',
    'POST',
    `Bearer ${token}`,
    { query, variables },
  );
  if (result.errors?.length) {
    throw new Error([...new Set(result.errors.map((error) => error.message))].join('; '));
  }
  if (!result.data) {
    throw new Error('GitHub returned no snapshot data.');
  }
  return result.data;
}

async function completeConnection<T>(
  token: string,
  id: string,
  type: string,
  field: string,
  fields: string,
  connection: Connection<T>,
): Promise<T[]> {
  const nodes = [...connection.nodes];
  let page = connection.pageInfo;
  while (page.hasNextPage) {
    if (!page.endCursor) {
      throw new Error(`Missing GitHub cursor for ${field}.`);
    }
    const result = await graphql<{ node: Record<string, Connection<T>> }>(
      token,
      `query($id:ID!,$after:String!){node(id:$id){... on ${type}{${field}(first:100,after:$after){nodes{${fields}} ${PAGE}}}}}`,
      { id, after: page.endCursor },
    );
    const next = result.node[field];
    nodes.push(...next.nodes);
    page = next.pageInfo;
  }
  return nodes;
}

export interface PullRequestSnapshot {
  pullRequest: PullRequest | null;
  remote: GitHubPullRequest;
}

/** Read status, checks, reviewers, comments, and merge queue together; paginate only when needed. */
export async function fetchSnapshots(
  token: string,
  previous: PullRequest[],
): Promise<PullRequestSnapshot[]> {
  const snapshots: PullRequestSnapshot[] = [];
  for (let start = 0; start < previous.length; start += 100) {
    const batch = previous.slice(start, start + 100);
    const fields = batch
      .map((pr, index) => {
        const [owner, name] = pr.repo.split('/');
        return `p${index}:repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(name)}){pullRequest(number:${pr.number}){${FIELDS}}}`;
      })
      .join('\n');
    const result = await graphql<Record<string, { pullRequest: Snapshot | null } | null>>(
      token,
      `query RefreshPullRequestSnapshots {${fields}}`,
    );
    await forEachConcurrent(batch, 4, async (previousPr) => {
      const index = batch.indexOf(previousPr);
      const snapshot = result[`p${index}`]?.pullRequest;
      if (!snapshot) {
        throw new Error(`GitHub did not return ${previousPr.id}.`);
      }
      snapshots.push(await normalizeSnapshot(token, previousPr, snapshot));
    });
  }
  return snapshots;
}

/** One account-wide read operation, with cursor pages only when GitHub requires them. */
export async function fetchAuthoredSnapshots(
  token: string,
  options: { onMergedDates?: (dates: string[]) => void } = {},
): Promise<PullRequestSnapshot[]> {
  const snapshots: PullRequestSnapshot[] = [];
  let after: string | null = null;
  do {
    const includeMerges: boolean = !!options.onMergedDates && after === null;
    const mergeQuery = `is:pr is:merged author:@me merged:>=${mergeWindow().toISOString().slice(0, 10)}`;
    const result: {
      search: Connection<Snapshot> & { issueCount: number };
      merged?: Connection<{ mergedAt: string }> & { issueCount: number };
    } = await graphql(
      token,
      `query AuthoredPullRequestSnapshots($after:String){search(query:"is:pr is:open author:@me",type:ISSUE,first:100,after:$after){issueCount nodes{... on PullRequest{${FIELDS}}} ${PAGE}} ${includeMerges ? `merged:search(query:${JSON.stringify(mergeQuery)},type:ISSUE,first:100){issueCount nodes{... on PullRequest{mergedAt}} ${PAGE}}` : ''}}`,
      { after },
    );
    if (includeMerges) {
      if (!result.merged || result.merged.issueCount > 1000) {
        throw new Error('GitHub did not return complete merge activity.');
      }
      const dates = result.merged.nodes.map((pr) => pr.mergedAt);
      let page = result.merged.pageInfo;
      while (page.hasNextPage) {
        if (!page.endCursor) {
          throw new Error('Missing merge activity cursor.');
        }
        const next = await graphql<{ merged: Connection<{ mergedAt: string }> }>(
          token,
          `query($after:String!){merged:search(query:${JSON.stringify(mergeQuery)},type:ISSUE,first:100,after:$after){nodes{... on PullRequest{mergedAt}} ${PAGE}}}`,
          { after: page.endCursor },
        );
        dates.push(...next.merged.nodes.map((pr) => pr.mergedAt));
        page = next.merged.pageInfo;
      }
      options.onMergedDates?.(dates);
    }
    if (result.search.issueCount > 1000) {
      throw new Error(
        'GitHub search exceeds its 1,000-result limit; cached board was retained.',
      );
    }
    const page = result.search;
    await forEachConcurrent(page.nodes, 4, async (snapshot) => {
      const reference = parsePullRequestUrl(snapshot.url);
      if (!reference) {
        throw new Error(`Invalid GitHub PR URL: ${snapshot.url}`);
      }
      snapshots.push(
        await normalizeSnapshot(token, createPullRequestReference(reference), snapshot),
      );
    });
    if (page.pageInfo.hasNextPage && !page.pageInfo.endCursor) {
      throw new Error('Missing GitHub search cursor.');
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return snapshots;
}

export function createPullRequestReference(reference: {
  repo: string;
  number: number;
}): PullRequest {
  return {
    ...reference,
    id: `${reference.repo}#${reference.number}`,
    url: `https://github.com/${reference.repo}/pull/${reference.number}`,
    title: '',
    draft: false,
    state: 'open',
    createdAt: '',
    issueId: '',
    groupId: 'unlinked',
    groupTitle: '',
    groupUrl: '',
    checks: [],
    reviewers: [],
    automerge: false,
    conflicts: false,
    comments: false,
  };
}

async function normalizeSnapshot(
  token: string,
  previous: PullRequest,
  snapshot: Snapshot,
): Promise<PullRequestSnapshot> {
  const remote: GitHubPullRequest = {
    number: snapshot.number,
    node_id: snapshot.id,
    html_url: snapshot.url,
    title: snapshot.title,
    body: snapshot.body,
    state: snapshot.state.toLowerCase(),
    draft: snapshot.isDraft,
    created_at: snapshot.createdAt,
    head: { sha: snapshot.headRefOid, ref: snapshot.headRefName },
    base: { sha: snapshot.baseRef?.target.oid ?? '', ref: snapshot.baseRefName },
    auto_merge: snapshot.autoMergeRequest,
    mergeable:
      snapshot.mergeable === 'UNKNOWN' ? null : snapshot.mergeable === 'MERGEABLE',
  };
  if (snapshot.state !== 'OPEN') {
    return { remote, pullRequest: null };
  }
  const [reviews, requests, comments, threads, contexts] = await Promise.all([
    completeConnection(
      token,
      snapshot.id,
      'PullRequest',
      'reviews',
      `${ACTOR} state body`,
      snapshot.reviews,
    ),
    completeConnection(
      token,
      snapshot.id,
      'PullRequest',
      'reviewRequests',
      'requestedReviewer { __typename ... on User { login } ... on Bot { login } }',
      snapshot.reviewRequests,
    ),
    completeConnection(
      token,
      snapshot.id,
      'PullRequest',
      'comments',
      ACTOR,
      snapshot.comments,
    ),
    completeConnection(
      token,
      snapshot.id,
      'PullRequest',
      'reviewThreads',
      `id comments(first:5){nodes{${ACTOR}} ${PAGE}}`,
      snapshot.reviewThreads,
    ),
    snapshot.statusCheckRollup
      ? completeConnection(
          token,
          snapshot.statusCheckRollup.id,
          'StatusCheckRollup',
          'contexts',
          CHECK_FIELDS,
          snapshot.statusCheckRollup.contexts,
        )
      : [],
  ]);
  const reviewers = new Map<string, string>();
  for (const review of reviews) {
    if (
      !review.author ||
      !['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED'].includes(review.state)
    ) {
      continue;
    }
    const previousState = reviewers.get(review.author.login);
    if (review.state === 'COMMENTED' && previousState && previousState !== 'commented') {
      continue;
    }
    reviewers.set(review.author.login, review.state.toLowerCase());
  }
  for (const request of requests) {
    if (
      request.requestedReviewer?.login &&
      !reviewers.has(request.requestedReviewer.login)
    ) {
      reviewers.set(request.requestedReviewer.login, 'requested');
    }
  }
  let humanComments =
    comments.some((comment) => comment.author?.__typename === 'User') ||
    reviews.some(
      (review) => review.author?.__typename === 'User' && Boolean(review.body.trim()),
    );
  await forEachConcurrent(threads, 4, async (thread) => {
    if (humanComments) {
      return;
    }
    const comments = await completeConnection(
      token,
      thread.id,
      'PullRequestReviewThread',
      'comments',
      ACTOR,
      thread.comments,
    );
    if (comments.some((comment) => comment.author?.__typename === 'User')) {
      humanComments = true;
    }
  });
  const checks: PullRequest['checks'] = [];
  for (const context of contexts) {
    const pending =
      context.__typename === 'CheckRun'
        ? context.status !== 'COMPLETED'
        : ['PENDING', 'EXPECTED'].includes(context.state ?? '');
    const success =
      context.__typename === 'CheckRun'
        ? ['SUCCESS', 'NEUTRAL', 'SKIPPED'].includes(context.conclusion ?? '')
        : context.state === 'SUCCESS';
    const status = pending ? 'pending' : success ? 'success' : 'failure';
    const detail = [
      context.title !== context.name ? context.title : '',
      context.summary,
      context.text,
      context.description,
    ]
      .filter(Boolean)
      .join(' — ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);
    checks.push({
      name: context.name ?? context.context ?? 'Check',
      status,
      detail:
        status === 'failure'
          ? detail || context.conclusion?.toLowerCase().replace(/_/g, ' ')
          : undefined,
    });
  }
  return {
    remote,
    pullRequest: {
      ...previous,
      title: snapshot.title,
      url: snapshot.url,
      draft: snapshot.isDraft,
      state: snapshot.isDraft ? 'draft' : 'open',
      createdAt: snapshot.createdAt,
      automerge: Boolean(snapshot.autoMergeRequest),
      mergeQueued: Boolean(snapshot.mergeQueueEntry),
      conflicts: snapshot.mergeable === 'CONFLICTING',
      reviewers: [...reviewers].map(([login, status]) => ({ login, status })),
      checks,
      comments: humanComments,
    },
  };
}
