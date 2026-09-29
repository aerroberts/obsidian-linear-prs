export type Issue = {
  id: string;
  identifier: string;
  title: string;
  url: string;
  state?: { type: string };
  project?: { id: string; name: string; url: string } | null;
  parent?: { id: string; title: string; url: string } | null;
  attachments?: {
    nodes: { url: string }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
  children?: {
    nodes: Issue[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};
export type PullRequest = {
  id: string;
  url: string;
  repo: string;
  number: number;
  title: string;
  draft: boolean;
  state: string;
  createdAt: string;
  issueId: string;
  issueTitle?: string;
  issueUrl?: string;
  groupId: string;
  groupTitle: string;
  groupUrl: string;
  checks: { name: string; status: string; detail?: string }[];
  reviewers: { login: string; status: string }[];
  automerge: boolean;
  mergeQueued?: boolean;
  conflicts: boolean;
  comments: boolean;
};
export type Credentials = { linearKey: string; githubKey: string };
