import { requestUrl } from 'obsidian';
import type { GraphqlResponse } from './responses';

export async function requestJson<T = unknown>(
  url: string,
  method: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await requestUrl({
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
  if (res.status >= 400) {
    throw new Error(
      `${method} ${url}: ${res.status} ${JSON.stringify(res.json?.message ?? res.text).slice(0, 200)}`,
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
