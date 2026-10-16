import type { PullRequest } from '../types';
import type { GitHubPullRequest } from './responses';
import { requestGitHub, requestGitHubDiff } from './transport';

export async function fetchPullRequestDiff(token: string, pullRequest: PullRequest) {
  if (!token) {
    throw new Error('Enter a GitHub API key in Linear PRs settings.');
  }
  const path = `/repos/${pullRequest.repo}/pulls/${pullRequest.number}`;
  const [details, diff] = await Promise.all([
    requestGitHub<GitHubPullRequest>(token, path),
    requestGitHubDiff(token, path),
  ]);
  return { description: details.body ?? '', diff };
}
