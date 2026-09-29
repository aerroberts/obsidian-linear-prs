import type { GitHubPullRequest, GraphqlResponse } from './responses';
import { requestGitHub, requestJson } from './transport';

export interface RebaseResult {
  status: 'up-to-date' | 'requested' | 'failed';
  warning?: string;
}

interface BranchUpdateResponse {
  updatePullRequestBranch: { clientMutationId: string | null } | null;
}

/** Use the same guarded branch-update mutation as gh pr update-branch --rebase. */
export async function rebasePullRequest(
  token: string,
  repo: string,
  pullRequest: GitHubPullRequest,
): Promise<RebaseResult> {
  try {
    if (pullRequest.mergeable === false) {
      throw new Error('The branch has merge conflicts with its base.');
    }
    const comparison = await requestGitHub<{ behind_by: number }>(
      token,
      `/repos/${repo}/compare/${pullRequest.base.sha}...${pullRequest.head.sha}`,
    );
    if (!Number.isInteger(comparison.behind_by) || comparison.behind_by < 0) {
      throw new Error('GitHub did not return the branch comparison.');
    }
    if (comparison.behind_by === 0) {
      return { status: 'up-to-date' };
    }
    const result = await requestJson<GraphqlResponse<BranchUpdateResponse>>(
      'https://api.github.com/graphql',
      'POST',
      `Bearer ${token}`,
      {
        query: `mutation($input:UpdatePullRequestBranchInput!){updatePullRequestBranch(input:$input){clientMutationId}}`,
        variables: {
          input: {
            pullRequestId: pullRequest.node_id,
            expectedHeadOid: pullRequest.head.sha,
            updateMethod: 'REBASE',
          },
        },
      },
    );
    if (result.errors?.length) {
      throw new Error(result.errors.map((error) => error.message).join('; '));
    }
    if (!result.data?.updatePullRequestBranch) {
      throw new Error('GitHub did not accept the branch rebase.');
    }
    // GitHub processes branch updates asynchronously; acceptance is not completion.
    return { status: 'requested' };
  } catch (error) {
    return {
      status: 'failed',
      warning: `Could not rebase: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
