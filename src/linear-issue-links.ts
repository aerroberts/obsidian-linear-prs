import type { PullRequest } from './types';

export function linearIssueLinks(
  pullRequest: PullRequest,
): { identifier: string; title: string; url: string }[] {
  const issues = pullRequest.linearContext?.issues;
  if (issues?.length) {
    return [
      ...new Map(
        issues.map((issue) => [
          issue.identifier,
          { identifier: issue.identifier, title: issue.title, url: issue.url },
        ]),
      ).values(),
    ];
  }
  const identifier = pullRequest.issueUrl?.match(
    /\/issue\/([A-Z][A-Z0-9]*-\d+)(?:\/|$)/i,
  )?.[1];
  return identifier && pullRequest.issueUrl
    ? [
        {
          identifier: identifier.toUpperCase(),
          title: pullRequest.issueTitle ?? identifier,
          url: pullRequest.issueUrl,
        },
      ]
    : [];
}

export function rememberSearch(history: string[], query: string): string[] {
  const term = query.trim();
  return term
    ? [
        term,
        ...history.filter((entry) => entry.toLowerCase() !== term.toLowerCase()),
      ].slice(0, 10)
    : history;
}
