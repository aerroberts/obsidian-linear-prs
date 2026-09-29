import { rebasePullRequest, type RebaseResult } from './rebase';
import { parsePullRequestUrl } from '../pull-request-matching';
import type {
  GraphqlResponse,
  GitHubPullRequest,
  GitHubUser,
  GitHubReview,
  GitHubComment,
  GitHubCheckRun,
  GitHubStatus,
  GitHubAnnotation,
  GitHubSearchResult,
  MergeQueueResponse,
  ReadyForReviewResponse,
} from './responses';
import type { Issue, PullRequest, Credentials } from '../types';
import { requestJson, requestGitHub } from './transport';

export async function openRepoPulls(
  token: string,
  repo: string,
): Promise<GitHubPullRequest[]> {
  const pulls: GitHubPullRequest[] = [];
  for (let page = 1; ; page++) {
    const batch = await requestGitHub<GitHubPullRequest[]>(
      token,
      `/repos/${repo}/pulls?state=open&per_page=100&page=${page}`,
    );
    pulls.push(...batch);
    if (batch.length < 100) {
      break;
    }
  }
  return pulls;
}

export async function fetchPullRequest(
  token: string,
  repo: string,
  number: number,
  issue?: Issue,
  attached = true,
  prefetched?: GitHubPullRequest,
): Promise<PullRequest | null> {
  const path = `/repos/${repo}/pulls/${number}`;
  const pullRequest = prefetched ?? (await requestGitHub<GitHubPullRequest>(token, path));
  if (pullRequest.state !== 'open') {
    return null;
  }
  if (issue && !attached) {
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9])${issue.identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9]|$)`,
      'i',
    );
    if (
      !pattern.test(
        [pullRequest.title, pullRequest.body ?? '', pullRequest.head?.ref ?? ''].join(
          '\n',
        ),
      )
    ) {
      return null;
    }
  }
  const [reviews, checkRuns, status, reviewComments, issueComments] =
    await Promise.allSettled([
      requestGitHub<GitHubReview[]>(token, `${path}/reviews?per_page=100`),
      requestGitHub<{ check_runs: GitHubCheckRun[] }>(
        token,
        `/repos/${repo}/commits/${pullRequest.head.sha}/check-runs?per_page=100`,
      ),
      requestGitHub<{ statuses: GitHubStatus[] }>(
        token,
        `/repos/${repo}/commits/${pullRequest.head.sha}/status`,
      ),
      requestGitHub<GitHubComment[]>(token, `${path}/comments?per_page=100`),
      requestGitHub<GitHubComment[]>(
        token,
        `/repos/${repo}/issues/${number}/comments?per_page=100`,
      ),
    ]);
  const reviewerMap = new Map<string, string>();
  const reviewItems: GitHubReview[] = reviews.status === 'fulfilled' ? reviews.value : [];
  for (const review of reviewItems) {
    if (
      !review.user?.login ||
      !['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED'].includes(review.state)
    ) {
      continue;
    }
    const previous = reviewerMap.get(review.user.login);
    if (review.state === 'COMMENTED' && previous && previous !== 'commented') {
      continue;
    }
    reviewerMap.set(review.user.login, review.state.toLowerCase());
  }
  for (const review of pullRequest.requested_reviewers ?? []) {
    if (!reviewerMap.has(review.login)) {
      reviewerMap.set(review.login, 'requested');
    }
  }
  const checks: { name: string; status: string; detail?: string }[] = [];
  const missingCheckDetails: { id: number; index: number }[] = [];
  if (checkRuns.status === 'fulfilled') {
    for (const checkRun of checkRuns.value.check_runs ?? []) {
      const state =
        checkRun.status !== 'completed'
          ? 'pending'
          : ['success', 'neutral', 'skipped'].includes(checkRun.conclusion ?? '')
            ? 'success'
            : 'failure';
      const output = [
        checkRun.conclusion && checkRun.conclusion !== 'failure'
          ? String(checkRun.conclusion).replace(/_/g, ' ')
          : '',
        checkRun.output?.title !== checkRun.name ? checkRun.output?.title : '',
        checkRun.output?.summary,
        checkRun.output?.text,
      ]
        .filter(Boolean)
        .join(' — ')
        .replace(/\s+/g, ' ')
        .trim();
      if (state === 'failure' && !output && checkRun.id) {
        missingCheckDetails.push({ id: checkRun.id, index: checks.length });
      }
      checks.push({
        name: checkRun.name,
        status: state,
        detail: state === 'failure' ? output.slice(0, 240) : undefined,
      });
    }
  }
  await Promise.allSettled(
    missingCheckDetails.slice(0, 8).map(async ({ id, index }) => {
      const annotations = await requestGitHub<GitHubAnnotation[]>(
        token,
        `/repos/${repo}/check-runs/${id}/annotations?per_page=100`,
      );
      const failures = annotations.filter(
        (annotation: { annotation_level: string }) =>
          annotation.annotation_level === 'failure',
      );
      const first = failures[0];
      if (first) {
        checks[index].detail = [
          first.path && first.start_line ? `${first.path}:${first.start_line}` : '',
          first.message,
        ]
          .filter(Boolean)
          .join(' — ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 240);
      }
    }),
  );
  if (status.status === 'fulfilled') {
    for (const commitStatus of status.value.statuses ?? []) {
      const state =
        commitStatus.state === 'success'
          ? 'success'
          : commitStatus.state === 'pending'
            ? 'pending'
            : 'failure';
      checks.push({
        name: commitStatus.context,
        status: state,
        detail:
          state === 'failure'
            ? String(commitStatus.description ?? '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 240)
            : undefined,
      });
    }
  }
  const hasHumanComment =
    [reviewComments, issueComments].some(
      (result) =>
        result.status === 'fulfilled' &&
        result.value.some(
          (comment: { user?: { type?: string } }) => comment.user?.type === 'User',
        ),
    ) ||
    reviewItems.some(
      (review) => review.user?.type === 'User' && Boolean(review.body?.trim()),
    );
  const groupId = issue
    ? (issue.parent?.id ?? issue.project?.id ?? 'unparented')
    : 'unlinked';
  const groupTitle = issue
    ? (issue.parent?.title ?? issue.project?.name ?? 'Unparented issues')
    : '';
  const groupUrl = issue ? (issue.parent?.url ?? issue.project?.url ?? '') : '';
  return {
    id: `${repo}#${number}`,
    url: pullRequest.html_url,
    repo,
    number,
    title: pullRequest.title,
    draft: pullRequest.draft,
    state: pullRequest.draft ? 'draft' : 'open',
    createdAt: pullRequest.created_at,
    issueId: issue?.id ?? '',
    issueTitle: issue?.title,
    issueUrl: issue?.url,
    groupId,
    groupTitle,
    groupUrl,
    checks,
    reviewers: [...reviewerMap].map(([login, status]) => ({ login, status })),
    automerge: !!pullRequest.auto_merge,
    mergeQueued: false,
    conflicts: pullRequest.mergeable === false,
    comments: hasHumanComment,
  };
}

export async function markMergeQueued(token: string, prs: PullRequest[]): Promise<void> {
  for (let start = 0; start < prs.length; start += 50) {
    const batch = prs.slice(start, start + 50);
    const byRepo = new Map<string, PullRequest[]>();
    for (const pr of batch) {
      const items = byRepo.get(pr.repo) ?? [];
      items.push(pr);
      byRepo.set(pr.repo, items);
    }
    const groups = [...byRepo];
    const fields = groups
      .map(([repo, items], i) => {
        const [owner, name] = repo.split('/');
        const pulls = items
          .map((pr, j) => `p${j}:pullRequest(number:${pr.number}){mergeQueueEntry{id}}`)
          .join(' ');
        return `r${i}:repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(name)}){${pulls}}`;
      })
      .join(' ');
    const response = await requestJson<GraphqlResponse<MergeQueueResponse>>(
      'https://api.github.com/graphql',
      'POST',
      `Bearer ${token}`,
      { query: `query{${fields}}` },
    );
    if (response.errors?.length) {
      throw new Error(
        `GitHub merge queue lookup: ${response.errors.map((e: { message: string }) => e.message).join('; ')}`,
      );
    }
    groups.forEach(([, items], i) =>
      items.forEach((pr, j) => {
        pr.mergeQueued = !!response.data?.[`r${i}`]?.[`p${j}`]?.mergeQueueEntry;
      }),
    );
  }
}

export async function authoredOpenPrs(
  token: string,
): Promise<{ repo: string; number: number; url: string; draft: boolean }[]> {
  const viewer = await requestGitHub<GitHubUser>(token, '/user');
  if (!viewer.login) {
    throw new Error('Could not identify the GitHub API key owner.');
  }
  const prs: { repo: string; number: number; url: string; draft: boolean }[] = [];
  for (let page = 1; page <= 10; page++) {
    const autoMergeQuery = encodeURIComponent(`is:pr is:open author:${viewer.login}`);
    const result = await requestGitHub<GitHubSearchResult>(
      token,
      `/search/issues?q=${autoMergeQuery}&per_page=100&page=${page}`,
    );
    if (result.incomplete_results) {
      throw new Error('GitHub returned incomplete pull request search results.');
    }
    for (const item of result.items ?? []) {
      const ref = parsePullRequestUrl(item.html_url);
      if (ref) {
        prs.push({ ...ref, url: item.html_url, draft: !!item.draft });
      }
    }
    if ((result.items ?? []).length < 100) {
      break;
    }
    if (page === 10) {
      throw new Error('GitHub search exceeded its 1,000 pull request result limit.');
    }
  }
  return prs;
}

export interface LaunchResult {
  readyForReview: boolean;
  automergeEnabled: boolean;
  rebaseStatus: RebaseResult['status'];
  warnings: string[];
  error?: string;
}

export async function launchPr(
  credentials: Credentials,
  pr: PullRequest,
): Promise<LaunchResult> {
  let data = await requestGitHub<GitHubPullRequest>(
    credentials.githubKey,
    `/repos/${pr.repo}/pulls/${pr.number}`,
  );
  if (data.state !== 'open') {
    throw new Error(`Pull request is ${data.state}, not open.`);
  }
  const rebase = await rebasePullRequest(credentials.githubKey, pr.repo, data);
  const branchUpdate = {
    rebaseStatus: rebase.status,
    warnings: rebase.warning ? [rebase.warning] : [],
  };
  if (rebase.status === 'updated') {
    data = rebase.remote ?? data;
    if (data.state !== 'open') {
      throw new Error(`Pull request became ${data.state} after rebasing.`);
    }
  }
  if (data.draft) {
    const readyQuery = `mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{id isDraft}}}`;
    const ready = await requestJson<GraphqlResponse<ReadyForReviewResponse>>(
      'https://api.github.com/graphql',
      'POST',
      `Bearer ${credentials.githubKey}`,
      { query: readyQuery, variables: { id: data.node_id } },
    );
    if (ready.errors?.length) {
      throw new Error(ready.errors.map((e: { message: string }) => e.message).join('; '));
    }
    if (ready.data?.markPullRequestReadyForReview?.pullRequest?.isDraft !== false) {
      throw new Error('GitHub did not mark the pull request ready for review.');
    }
  }
  if (data.auto_merge) {
    return { readyForReview: true, automergeEnabled: true, ...branchUpdate };
  }
  const autoMergeQuery = `mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:SQUASH}){clientMutationId}}`;
  try {
    const result = await requestJson<GraphqlResponse<unknown>>(
      'https://api.github.com/graphql',
      'POST',
      `Bearer ${credentials.githubKey}`,
      { query: autoMergeQuery, variables: { id: data.node_id } },
    );
    if (result.errors?.length) {
      throw new Error(
        result.errors.map((e: { message: string }) => e.message).join('; '),
      );
    }
    return { readyForReview: true, automergeEnabled: true, ...branchUpdate };
  } catch (e) {
    return {
      readyForReview: true,
      automergeEnabled: false,
      ...branchUpdate,
      error: `Ready for review, but auto-merge could not be enabled: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function requestReviewer(
  credentials: Credentials,
  pr: PullRequest,
  login: string,
): Promise<void> {
  await requestGitHub(
    credentials.githubKey,
    `/repos/${pr.repo}/pulls/${pr.number}/requested_reviewers`,
    'POST',
    { reviewers: [login] },
  );
}

export async function closePr(credentials: Credentials, pr: PullRequest): Promise<void> {
  await requestGitHub(
    credentials.githubKey,
    `/repos/${pr.repo}/pulls/${pr.number}`,
    'PATCH',
    {
      state: 'closed',
    },
  );
}

/** Refresh branch information before using its head SHA for a guarded update. */
export async function updatePrBranch(
  credentials: Credentials,
  pullRequest: PullRequest,
): Promise<RebaseResult> {
  const current = await requestGitHub<GitHubPullRequest>(
    credentials.githubKey,
    `/repos/${pullRequest.repo}/pulls/${pullRequest.number}`,
  );
  if (current.state !== 'open') {
    return {
      status: 'failed',
      warning: `PR is ${current.state}; its branch was not updated.`,
    };
  }
  return rebasePullRequest(credentials.githubKey, pullRequest.repo, current);
}
