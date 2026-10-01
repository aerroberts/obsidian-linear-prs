import { rebasePullRequest, type RebaseResult } from './rebase';
import type {
  GraphqlResponse,
  GitHubPullRequest,
  ReadyForReviewResponse,
} from './responses';
import type { PullRequest, Credentials } from '../types';
import { requestJson, requestGitHub } from './transport';

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
  prefetched?: GitHubPullRequest,
): Promise<LaunchResult> {
  let data =
    prefetched ??
    (await requestGitHub<GitHubPullRequest>(
      credentials.githubKey,
      `/repos/${pr.repo}/pulls/${pr.number}`,
    ));
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
