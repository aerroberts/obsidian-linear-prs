import { requestUrl } from 'obsidian';

/** Only GitHub repository images use the GitHub token; arbitrary image hosts never do. */
export function githubImagePaths(source: string): string[] {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return [];
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    return [];
  }
  const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const [owner, repository, ...rest] = segments;
  if (!owner || !repository) {
    return [];
  }
  let referenceAndPath: string[];
  if (url.hostname === 'github.com' && ['blob', 'raw'].includes(rest[0])) {
    referenceAndPath = rest.slice(1);
  } else if (url.hostname === 'raw.githubusercontent.com') {
    referenceAndPath = rest;
  } else {
    return [];
  }
  // GitHub blob URLs are ambiguous when branch names contain slashes. Try each
  // possible ref/path boundary, letting the contents API resolve the valid one.
  return referenceAndPath.slice(1).map((_, index) => {
    const boundary = index + 1;
    const reference = referenceAndPath.slice(0, boundary).join('/');
    const path = referenceAndPath.slice(boundary).map(encodeURIComponent).join('/');
    return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/${path}?ref=${encodeURIComponent(reference)}`;
  });
}

export async function fetchDescriptionImage(
  token: string,
  source: string,
): Promise<Blob | undefined> {
  const paths = githubImagePaths(source);
  for (const path of paths) {
    const response = await requestUrl({
      url: `https://api.github.com${path}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.raw',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      throw: false,
    });
    if (response.status === 404) {
      continue;
    }
    if (response.status >= 400) {
      throw new Error(`GitHub image: ${response.status}`);
    }
    const extension = new URL(source).pathname.split('.').pop()?.toLowerCase();
    const mime: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      avif: 'image/avif',
    };
    const contentType = response.headers['content-type']?.split(';')[0];
    const type = contentType?.startsWith('image/') ? contentType : mime[extension ?? ''];
    if (!type) {
      throw new Error('Unsupported GitHub image format');
    }
    return new Blob([response.arrayBuffer], { type });
  }
  if (paths.length) {
    throw new Error('GitHub image could not be found with the configured credentials');
  }
}
