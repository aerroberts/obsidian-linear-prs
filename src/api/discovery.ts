import { fetchAuthoredSnapshots, fetchSnapshots } from './snapshots';
import { resolveLinearContexts } from './context';
import type { PullRequest, Credentials } from '../types';

/** Discover the account's complete open PR set, then batch its Linear associations. */
export async function discover(
  credentials: Credentials,
): Promise<{ prs: PullRequest[]; errors: string[]; mergedDates: string[] }> {
  let mergedDates: string[] = [];
  const snapshots = await fetchAuthoredSnapshots(credentials.githubKey, {
    onMergedDates: (dates) => {
      mergedDates = dates;
    },
  });
  const prs = await resolveLinearContexts(credentials.linearKey, snapshots);
  return { prs, errors: [], mergedDates };
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
