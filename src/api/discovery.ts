import { parsePullRequestUrl, referencedIdentifiers } from '../pull-request-matching';
import type { GitHubPullRequest } from './responses';
import type { Issue, PullRequest, Credentials } from '../types';
import { queryLinear, requestGitHub } from './transport';
import {
  ISSUE_FIELDS,
  assignedRoots,
  issueChildren,
  projectIssues,
  issueById,
  attachmentUrls,
  attachedPrUrls,
} from './linear';
import {
  authoredOpenPrs,
  fetchPullRequest,
  markMergeQueued,
  openRepoPulls,
} from './github';
import { forEachConcurrent } from '../async';

export async function referencedLinearIssue(
  key: string,
  pr: GitHubPullRequest,
  cache: Map<string, Issue | null>,
): Promise<Issue | null> {
  for (const id of referencedIdentifiers(pr)) {
    if (!cache.has(id)) {
      try {
        const result = await queryLinear<{ issue: Issue | null }>(
          key,
          `query($id:String!){issue(id:$id){${ISSUE_FIELDS}}}`,
          { id },
        );
        cache.set(id, result.issue);
      } catch (e) {
        if (!String(e).includes('Entity not found: Issue')) {
          throw e;
        }
        cache.set(id, null);
      }
    }
    const issue = cache.get(id);
    if (issue) {
      return issue;
    }
  }
  return null;
}

export async function discover(
  credentials: Credentials,
): Promise<{ prs: PullRequest[]; errors: string[] }> {
  const authoredOpen = await authoredOpenPrs(credentials.githubKey);
  const roots = await assignedRoots(credentials.linearKey);
  const seen = new Set<string>();
  const issues: Issue[] = [];
  const errors: string[] = [];
  let frontier = roots;
  while (frontier.length) {
    const batch = frontier.filter((i) => {
      if (seen.has(i.id)) {
        return false;
      }
      seen.add(i.id);
      return true;
    });
    issues.push(...batch);
    const next: Issue[] = [];
    await forEachConcurrent(batch, 6, async (issue) => {
      try {
        next.push(...(await issueChildren(credentials.linearKey, issue.id)));
      } catch (e) {
        errors.push(`${issue.identifier} children: ${String(e)}`);
      }
    });
    frontier = next;
  }
  const linked = await discoverLinked(credentials, issues, []);
  const prs = linked.prs;
  errors.push(...linked.errors);
  const associatedIds = new Set(prs.map((pr) => pr.id));
  const authored = authoredOpen.filter(
    (pr) => !associatedIds.has(`${pr.repo}#${pr.number}`),
  );
  const attached = await attachedPrUrls(
    credentials.linearKey,
    authored.map((pr) => pr.url),
  );
  const issueRefs = new Map<string, Issue | null>();
  await forEachConcurrent(authored, 6, async (ref) => {
    const pr = await requestGitHub<GitHubPullRequest>(
      credentials.githubKey,
      `/repos/${ref.repo}/pulls/${ref.number}`,
    );
    if (pr.state !== 'open') {
      return;
    }
    // Keep authored PRs visible when their Linear issue is outside the assigned
    // issue tree, and group them under that issue when its identifier is known.
    const issue = await referencedLinearIssue(credentials.linearKey, pr, issueRefs);
    if (attached.has(ref.url) && !issue && !pr.draft) {
      return;
    }
    const item = await fetchPullRequest(
      credentials.githubKey,
      ref.repo,
      ref.number,
      issue ?? undefined,
      true,
      pr,
    );
    if (item) {
      prs.push(item);
    }
  });
  await markMergeQueued(credentials.githubKey, prs);
  return { prs, errors };
}

export async function discoverLinked(
  credentials: Credentials,
  issues: Issue[],
  knownRepos: string[],
): Promise<{ prs: PullRequest[]; errors: string[] }> {
  const prs: PullRequest[] = [];
  const used = new Set<string>();
  const errors: string[] = [];
  const refsByIssue = new Map<
    string,
    Map<string, { repo: string; number: number; attached: boolean }>
  >();
  const allowedRepos = new Set<string>();
  await forEachConcurrent(issues, 6, async (issue) => {
    const refs = new Map<string, { repo: string; number: number; attached: boolean }>();
    refsByIssue.set(issue.id, refs);
    try {
      for (const url of await attachmentUrls(credentials.linearKey, issue.id)) {
        const ref = parsePullRequestUrl(url);
        if (ref) {
          allowedRepos.add(ref.repo);
          refs.set(`${ref.repo}#${ref.number}`, { ...ref, attached: true });
        }
      }
    } catch (e) {
      errors.push(`${issue.identifier} attachments: ${String(e)}`);
    }
  });
  for (const repo of knownRepos) {
    allowedRepos.add(repo);
  }
  const issuesByIdentifier = new Map(
    issues.map((issue) => [issue.identifier.toUpperCase(), issue]),
  );
  await forEachConcurrent([...allowedRepos], 3, async (repo) => {
    try {
      for (const pull of await openRepoPulls(credentials.githubKey, repo)) {
        const issue = referencedIdentifiers(pull)
          .map((id) => issuesByIdentifier.get(id))
          .find((match): match is Issue => !!match);
        if (!issue) {
          continue;
        }
        const refs = refsByIssue.get(issue.id)!;
        const key = `${repo}#${pull.number}`;
        if (!refs.has(key)) {
          refs.set(key, { repo, number: pull.number, attached: false });
        }
      }
    } catch (e) {
      errors.push(`${repo} pull request list: ${String(e)}`);
    }
  });
  await forEachConcurrent(issues, 6, async (issue) => {
    const refs = refsByIssue.get(issue.id)!;
    for (const ref of refs.values()) {
      const key = `${ref.repo}#${ref.number}`;
      if (used.has(key)) {
        continue;
      }
      used.add(key);
      try {
        const pr = await fetchPullRequest(
          credentials.githubKey,
          ref.repo,
          ref.number,
          issue,
          ref.attached,
        );
        if (pr) {
          prs.push(pr);
        }
      } catch (e) {
        errors.push(`${key}: ${String(e)}`);
      }
    }
  });
  return { prs, errors };
}

export async function discoverGroup(
  credentials: Credentials,
  groupId: string,
  groupUrl: string,
  knownRepos: string[],
  knownIssueIds: string[],
): Promise<{ prs: PullRequest[]; errors: string[] }> {
  let issues: Issue[];
  if (groupUrl.includes('/project/')) {
    issues = (await projectIssues(credentials.linearKey, groupId)).filter(
      (issue) => !issue.parent,
    );
  } else if (groupUrl.includes('/issue/')) {
    issues = await issueChildren(credentials.linearKey, groupId);
  } else {
    issues = [];
    await forEachConcurrent(knownIssueIds, 6, async (id) => {
      const issue = await issueById(credentials.linearKey, id);
      if (issue) {
        issues.push(issue);
      }
    });
  }
  const result = await discoverLinked(credentials, issues, knownRepos);
  result.prs = result.prs.filter((pr) => pr.groupId === groupId);
  await markMergeQueued(credentials.githubKey, result.prs);
  return result;
}

export async function refreshPrs(
  credentials: Credentials,
  previous: PullRequest[],
): Promise<PullRequest[]> {
  const refreshed: PullRequest[] = [];
  const errors: string[] = [];
  await forEachConcurrent(previous, 4, async (old) => {
    try {
      const current = await fetchPullRequest(credentials.githubKey, old.repo, old.number);
      if (current) {
        refreshed.push({
          ...current,
          issueId: old.issueId,
          issueTitle: old.issueTitle,
          issueUrl: old.issueUrl,
          groupId: old.groupId,
          groupTitle: old.groupTitle,
          groupUrl: old.groupUrl,
        });
      }
    } catch (e) {
      errors.push(`${old.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
  if (errors.length) {
    throw new Error(
      `Pull request refresh failed: ${errors[0]}${errors.length > 1 ? ` (${errors.length} errors total)` : ''}`,
    );
  }
  await markMergeQueued(credentials.githubKey, refreshed);
  return refreshed;
}
