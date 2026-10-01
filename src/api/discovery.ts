import { fetchAuthoredSnapshots, fetchSnapshots } from './snapshots';
import { resolveLinearContexts } from './context';
import type { PullRequest, Credentials } from '../types';

/** Discover the account's complete open PR set, then batch its Linear associations. */
export async function discover(
  credentials: Credentials,
): Promise<{ prs: PullRequest[]; errors: string[] }> {
  const snapshots = await fetchAuthoredSnapshots(credentials.githubKey);
  const prs = await resolveLinearContexts(credentials.linearKey, snapshots);
  return { prs, errors: [] };
}

/** Existing groups refresh from one GitHub snapshot query, without repeating discovery. */
export async function refreshPrs(
  credentials: Credentials,
  previous: PullRequest[],
): Promise<PullRequest[]> {
  const snapshots = await fetchSnapshots(credentials.githubKey, previous);
  return snapshots
    .map((snapshot) => snapshot.pullRequest)
    .filter((pullRequest): pullRequest is PullRequest => pullRequest !== null);
}
