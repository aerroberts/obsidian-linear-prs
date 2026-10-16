import { requestUrl } from 'obsidian';
import type { GraphqlResponse } from './responses';
import { RequestQueue } from './request-queue';

const queues = new Map<string, RequestQueue>();

export async function requestJson<T = unknown>(
  url: string,
  method: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const host = new URL(url).hostname;
  let queue = queues.get(host);
  if (!queue) {
    queue = new RequestQueue(host === 'api.github.com' ? 'GitHub' : 'Linear');
    queues.set(host, queue);
  }
  const query = (body as { query?: string } | undefined)?.query;
  const retry =
    method === 'GET' || (method === 'POST' && !!query && /^\s*query\b/.test(query));
  const res = await queue.run(
    async () => {
      const response = await requestUrl({
        url,
        method,
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        throw: false,
      });
      // Obsidian's JSON getter throws for HTML/text gateway errors.
      let json: unknown;
      try {
        json = response.json;
      } catch {
        json = null;
      }
      return {
        status: response.status,
        headers: response.headers,
        text: response.text,
        json,
      };
    },
    { retry },
  );
  if (res.status >= 400) {
    throw new Error(
      `${method} ${url}: ${res.status} ${JSON.stringify((res.json as { message?: string } | null)?.message ?? res.text).slice(0, 200)}`,
    );
  }
  return res.json as T;
}

export async function queryLinear<T>(
  key: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const data = await requestJson<GraphqlResponse<T>>(
    'https://api.linear.app/graphql',
    'POST',
    key,
    {
      query,
      variables,
    },
  );
  if (data.errors?.length) {
    throw new Error(data.errors.map((e: { message: string }) => e.message).join('; '));
  }
  if (!data.data) {
    throw new Error('Linear returned no GraphQL data.');
  }
  return data.data;
}

export async function requestGitHub<T = unknown>(
  token: string,
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  return requestJson<T>(`https://api.github.com${path}`, method, `Bearer ${token}`, body);
}

export async function requestGitHubDiff(token: string, path: string): Promise<string> {
  const response = await requestUrl({
    url: `https://api.github.com${path}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.diff',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    throw: false,
  });
  if (response.status >= 400) {
    throw new Error(`GitHub diff: ${response.status} ${response.text.slice(0, 200)}`);
  }
  return response.text;
}
