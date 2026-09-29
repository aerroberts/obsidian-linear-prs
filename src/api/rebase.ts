import type { GitHubPullRequest, GraphqlResponse } from './responses';
import { requestGitHub, requestJson } from './transport';

export interface RebaseResult {
  status: 'up-to-date' | 'updated' | 'failed';
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
  options: { attempts?: number; intervalMs?: number } = {},
): Promise<RebaseResult> {
  try {
    if (pullRequest.mergeable === false) {
      throw new Error('The branch has merge conflicts with its base.');
    }
    const comparison = await compareWithCurrentBase(token, repo, pullRequest);
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
    const { attempts = 20, intervalMs = 1000 } = options;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const current = await requestGitHub<GitHubPullRequest>(
        token,
        `/repos/${repo}/pulls/${pullRequest.number}`,
      );
      if (current.state !== 'open') {
        throw new Error(
          `PR became ${current.state} before the rebase could be verified.`,
        );
      }
      const comparison = await compareWithCurrentBase(token, repo, current);
      if (current.head.sha !== pullRequest.head.sha && comparison.behind_by === 0) {
        return { status: 'updated' };
      }
      if (attempt + 1 < attempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    throw new Error(
      'GitHub accepted the rebase, but the branch update did not complete within the verification window. Retry Launch to check again.',
    );
  } catch (error) {
    return {
      status: 'failed',
      warning: `Could not rebase: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function compareWithCurrentBase(
  token: string,
  repo: string,
  pullRequest: GitHubPullRequest,
): Promise<{ behind_by: number }> {
  // Resolve the actual branch tip rather than relying on a PR response's base snapshot.
  const base = await requestGitHub<{ object: { sha: string } }>(
    token,
    `/repos/${repo}/git/ref/heads/${encodeURIComponent(pullRequest.base.ref)}`,
  );
  if (!base.object?.sha) {
    throw new Error('GitHub did not return the current base branch.');
  }
  return requestGitHub<{ behind_by: number }>(
    token,
    `/repos/${repo}/compare/${base.object.sha}...${pullRequest.head.sha}`,
  );
}
