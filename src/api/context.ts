import type { Issue, PullRequest } from '../types';
import type { PullRequestSnapshot } from './snapshots';
import { referencedIdentifiers } from '../pull-request-matching';
import { ISSUE_FIELDS, PAGE } from './linear';
import { queryLinear } from './transport';

type Page<T> = {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};
type Attachment = { issue: Issue | null };
type ContextResponse = Record<string, Page<Attachment>> & { references?: Page<Issue> };

/** Attachments are authoritative; text identifiers are a fallback, never a visibility filter. */
export async function resolveLinearContexts(
  key: string,
  snapshots: PullRequestSnapshot[],
): Promise<PullRequest[]> {
  const open = snapshots.filter((snapshot) => snapshot.pullRequest !== null);
  const results: PullRequest[] = [];
  for (let start = 0; start < open.length; start += 100) {
    const batch = open.slice(start, start + 100);
    const identifiers = [
      ...new Set(batch.flatMap((snapshot) => referencedIdentifiers(snapshot.remote))),
    ];
    const filters = identifiers.map((identifier) => {
      const split = identifier.lastIndexOf('-');
      return {
        and: [
          { number: { eq: Number(identifier.slice(split + 1)) } },
          { team: { key: { eq: identifier.slice(0, split) } } },
        ],
      };
    });
    const fields = batch
      .map(
        (snapshot, index) =>
          `p${index}:attachmentsForURL(url:${JSON.stringify(snapshot.remote.html_url)},first:5,includeArchived:true){nodes{issue{${ISSUE_FIELDS}}} ${PAGE}}`,
      )
      .join('\n');
    const response = await queryLinear<ContextResponse>(
      key,
      `query ResolvePullRequestContexts${filters.length ? '($filter:IssueFilter!)' : ''}{${fields} ${filters.length ? `references:issues(first:100,includeArchived:true,filter:$filter){nodes{${ISSUE_FIELDS}} ${PAGE}}` : ''}}`,
      filters.length ? { filter: { or: filters } } : {},
    );
    const referenced = [...(response.references?.nodes ?? [])];
    let referencePage = response.references?.pageInfo;
    while (referencePage?.hasNextPage) {
      if (!referencePage.endCursor) {
        throw new Error('Missing Linear reference cursor.');
      }
      const next = await queryLinear<{ issues: Page<Issue> }>(
        key,
        `query($filter:IssueFilter!,$after:String!){issues(first:100,includeArchived:true,after:$after,filter:$filter){nodes{${ISSUE_FIELDS}} ${PAGE}}}`,
        { filter: { or: filters }, after: referencePage.endCursor },
      );
      referenced.push(...next.issues.nodes);
      referencePage = next.issues.pageInfo;
    }
    const issuesByIdentifier = new Map(
      referenced.map((issue) => [issue.identifier.toUpperCase(), issue]),
    );
    for (const [index, snapshot] of batch.entries()) {
      const connection = response[`p${index}`];
      if (!connection) {
        throw new Error(`Missing Linear context for ${snapshot.remote.html_url}.`);
      }
      const attachments = [...connection.nodes];
      let page = connection.pageInfo;
      while (page.hasNextPage) {
        if (!page.endCursor) {
          throw new Error('Missing Linear attachment cursor.');
        }
        const next = await queryLinear<{ attachmentsForURL: Page<Attachment> }>(
          key,
          `query($url:String!,$after:String!){attachmentsForURL(url:$url,first:100,includeArchived:true,after:$after){nodes{issue{${ISSUE_FIELDS}}} ${PAGE}}}`,
          { url: snapshot.remote.html_url, after: page.endCursor },
        );
        attachments.push(...next.attachmentsForURL.nodes);
        page = next.attachmentsForURL.pageInfo;
      }
      const linked = attachments
        .map((attachment) => attachment.issue)
        .filter((issue): issue is Issue => !!issue);
      const fallback = referencedIdentifiers(snapshot.remote)
        .map((id) => issuesByIdentifier.get(id))
        .filter((issue): issue is Issue => !!issue);
      const source = linked.length
        ? 'attachment'
        : fallback.length
          ? 'reference'
          : 'none';
      const issues = [
        ...new Map(
          (linked.length ? linked : fallback).map((issue) => [issue.id, issue]),
        ).values(),
      ].sort((left, right) => left.identifier.localeCompare(right.identifier));
      const issue = issues[0];
      results.push({
        ...snapshot.pullRequest!,
        linearContext: { issues, source },
        issueId: issue?.id ?? '',
        issueTitle: issue?.title,
        issueUrl: issue?.url,
        groupId: issue
          ? (issue.parent?.id ?? issue.project?.id ?? 'unparented')
          : 'unlinked',
        groupTitle: issue
          ? (issue.parent?.title ?? issue.project?.name ?? 'Unparented issues')
          : '',
        groupUrl: issue ? (issue.parent?.url ?? issue.project?.url ?? '') : '',
      });
    }
  }
  return results;
}
