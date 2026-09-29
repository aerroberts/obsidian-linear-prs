export const prPattern = /https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i;

export function parsePullRequestUrl(
  url: string,
): { repo: string; number: number } | null {
  const m = url.match(prPattern);
  return m ? { repo: `${m[1]}/${m[2]}`, number: Number(m[3]) } : null;
}

export function referencedIdentifiers(pr: {
  title?: string;
  body?: string | null;
  head?: { ref?: string };
}): string[] {
  return [
    ...new Set(
      (
        [pr.title ?? '', pr.body ?? '', pr.head?.ref ?? '']
          .join('\n')
          .match(/\b[A-Z][A-Z0-9]{1,14}-\d+\b/gi) ?? []
      ).map((id) => id.toUpperCase()),
    ),
  ];
}
