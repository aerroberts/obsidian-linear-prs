/** Response fields consumed by the plugin; remote payloads may contain more fields. */
export interface GraphqlResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

export interface GitHubUser {
  login: string;
  type?: string;
}

export interface GitHubPullRequest {
  number: number;
  node_id: string;
  html_url: string;
  title: string;
  body: string | null;
  state: string;
  draft: boolean;
  created_at: string;
  head: { sha: string; ref: string };
  base: { sha: string; ref: string };
  requested_reviewers?: GitHubUser[];
  auto_merge: object | null;
  mergeable: boolean | null;
}

export interface ReadyForReviewResponse {
  markPullRequestReadyForReview: { pullRequest: { isDraft: boolean } };
}
