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

export interface GitHubComment {
  user?: GitHubUser;
  body?: string | null;
}

export interface GitHubReview extends GitHubComment {
  state: string;
}

export interface GitHubCheckRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  output?: { title?: string; summary?: string; text?: string };
}

export interface GitHubStatus {
  context: string;
  state: string;
  description?: string | null;
}

export interface GitHubAnnotation {
  annotation_level: string;
  path: string;
  start_line: number;
  message: string;
}

export interface GitHubSearchResult {
  incomplete_results: boolean;
  items: { html_url: string; draft?: boolean }[];
}

export type MergeQueueResponse = Record<
  string,
  Record<string, { mergeQueueEntry: { id: string } | null }> | null
>;

export interface ReadyForReviewResponse {
  markPullRequestReadyForReview: { pullRequest: { isDraft: boolean } };
}
