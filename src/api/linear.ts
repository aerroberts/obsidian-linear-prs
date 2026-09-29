import type { Issue } from '../types';
import { queryLinear } from './transport';

export const ISSUE_FIELDS =
  'id identifier title url state { type } project { id name url } parent { id title url }';

export const PAGE = 'pageInfo { hasNextPage endCursor }';

export async function assignedRoots(key: string): Promise<Issue[]> {
  const roots: Issue[] = [];
  let after: string | null = null;
  do {
    const data = await queryLinear<{
      viewer: {
        assignedIssues: {
          nodes: Issue[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      };
    }>(
      key,
      `query($after:String){viewer{assignedIssues(first:100,after:$after){nodes{${ISSUE_FIELDS}} ${PAGE}}}}`,
      { after },
    );
    const page = data.viewer.assignedIssues as {
      nodes: Issue[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
    roots.push(
      ...page.nodes.filter(
        (i) => !['completed', 'canceled'].includes(i.state?.type ?? ''),
      ),
    );
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return roots;
}

export async function issueChildren(key: string, id: string): Promise<Issue[]> {
  const children: Issue[] = [];
  let after: string | null = null;
  do {
    const data = await queryLinear<{
      issue: {
        children: {
          nodes: Issue[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      };
    }>(
      key,
      `query($id:String!,$after:String){issue(id:$id){children(first:100,after:$after){nodes{${ISSUE_FIELDS}} ${PAGE}}}}`,
      { id, after },
    );
    const page = data.issue.children as {
      nodes: Issue[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
    children.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return children;
}

export async function projectIssues(key: string, id: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  let after: string | null = null;
  do {
    const data = await queryLinear<{
      project: {
        issues: {
          nodes: Issue[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      };
    }>(
      key,
      `query($id:String!,$after:String){project(id:$id){issues(first:100,after:$after){nodes{${ISSUE_FIELDS}} ${PAGE}}}}`,
      { id, after },
    );
    const page = data.project.issues as {
      nodes: Issue[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
    issues.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return issues;
}

export async function issueById(key: string, id: string): Promise<Issue | null> {
  const data = await queryLinear<{ issue: Issue | null }>(
    key,
    `query($id:String!){issue(id:$id){${ISSUE_FIELDS}}}`,
    { id },
  );
  return data.issue;
}

export async function attachmentUrls(key: string, id: string): Promise<string[]> {
  const urls: string[] = [];
  let after: string | null = null;
  do {
    const data = await queryLinear<{
      issue: {
        attachments: {
          nodes: { url: string }[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      };
    }>(
      key,
      `query($id:String!,$after:String){issue(id:$id){attachments(first:100,after:$after){nodes{url} ${PAGE}}}}`,
      { id, after },
    );
    const page = data.issue.attachments as {
      nodes: { url: string }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
    urls.push(...page.nodes.map((n) => n.url));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return urls;
}

export async function attachedPrUrls(key: string, urls: string[]): Promise<Set<string>> {
  const linked = new Set<string>();
  for (let start = 0; start < urls.length; start += 20) {
    const batch = urls.slice(start, start + 20);
    const fields = batch
      .map((url, i) => `a${i}:attachmentsForURL(url:${JSON.stringify(url)}){nodes{id}}`)
      .join(' ');
    const data = await queryLinear<Record<string, { nodes: { id: string }[] }>>(
      key,
      `query{${fields}}`,
    );
    batch.forEach((url, i) => {
      if (data[`a${i}`]?.nodes.length) {
        linked.add(url);
      }
    });
  }
  return linked;
}
