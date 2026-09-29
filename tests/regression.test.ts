import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrateMetadata, createEmptyMetadata } from '../src/metadata';
import { parsePullRequestUrl, referencedIdentifiers } from '../src/pull-request-matching';
import { forEachConcurrent, withDeadline } from '../src/async';
import { fetchPullRequest, launchPr, markMergeQueued } from '../src/api/github';

function mockRequests(handler: (options: { url: string; body?: string }) => unknown) {
  Object.assign(globalThis, {
    requestMock: async (options: { url: string; body?: string }) => ({
      status: 200,
      json: handler(options),
      text: '',
    }),
  });
}

const remotePullRequest = {
  number: 42,
  node_id: 'PR_42',
  html_url: 'https://github.com/owner/repo/pull/42',
  title: 'Fix task ABC-123',
  body: null,
  state: 'open',
  draft: false,
  created_at: '2026-09-01T00:00:00Z',
  head: { sha: 'abc', ref: 'fix/abc-123' },
  requested_reviewers: [],
  auto_merge: null,
  mergeable: true,
};

function mockPullRequestDetails() {
  mockRequests(({ url }) => {
    if (url.endsWith('/pulls/42')) return remotePullRequest;
    if (url.includes('/reviews'))
      return [
        { user: { login: 'reviewer', type: 'User' }, state: 'APPROVED' },
        {
          user: { login: 'reviewer', type: 'User' },
          state: 'COMMENTED',
          body: 'Looks good',
        },
      ];
    if (url.includes('/check-runs'))
      return {
        check_runs: [
          { id: 1, name: 'Optional', status: 'completed', conclusion: 'skipped' },
          {
            id: 2,
            name: 'Lint',
            status: 'completed',
            conclusion: 'failure',
            output: { summary: 'Bad syntax' },
          },
        ],
      };
    if (url.endsWith('/status')) return { statuses: [] };
    return [];
  });
}

test('migrates legacy queues without losing board state or mutating input', () => {
  const saved = {
    ...createEmptyMetadata(),
    reviewTypes: { one: 'review' as const, two: 'stamp' as const, three: 'C' as const },
    collapsed: ['queue:review', 'queue:stamp', 'group'],
    hidden: ['closed'],
    reviewMessage: ['one'],
  };
  const migrated = migrateMetadata(saved);
  assert.deepEqual(migrated.reviewTypes, { one: 'A', two: 'B', three: 'C' });
  assert.deepEqual(migrated.collapsed, ['queue:A', 'queue:B', 'group']);
  assert.deepEqual(migrated.hidden, ['closed']);
  assert.deepEqual(migrated.reviewMessage, ['one']);
  assert.equal(saved.reviewTypes.one, 'review');
  assert.deepEqual(migrateMetadata(migrated), migrated);
});

test('fills defaults for metadata from older installs', () => {
  assert.deepEqual(migrateMetadata({}), createEmptyMetadata());
});

test('parses PR links and ignores unrelated links', () => {
  assert.deepEqual(parsePullRequestUrl('https://github.com/owner/repo/pull/42/files'), {
    repo: 'owner/repo',
    number: 42,
  });
  assert.equal(parsePullRequestUrl('https://github.com/owner/repo/issues/42'), null);
});

test('matches identifiers across title, body, and branch without duplicates', () => {
  assert.deepEqual(
    referencedIdentifiers({
      title: 'ABC-123',
      body: 'abc-123 DEF-7',
      head: { ref: 'fix/XYZ-9' },
    }),
    ['ABC-123', 'DEF-7', 'XYZ-9'],
  );
  assert.deepEqual(referencedIdentifiers({}), []);
});

test('bounded workers process every item exactly once', async () => {
  let active = 0;
  let peak = 0;
  const visited: number[] = [];
  await forEachConcurrent([1, 2, 3, 4, 5], 2, async (item) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    visited.push(item);
    active--;
  });
  assert.equal(peak, 2);
  assert.deepEqual(visited.sort(), [1, 2, 3, 4, 5]);
});

test('deadlines return results and reject stalled work', async () => {
  assert.equal(await withDeadline(Promise.resolve(42), 100, 'Lookup'), 42);
  await assert.rejects(
    withDeadline(new Promise(() => {}), 1, 'Lookup'),
    /Lookup timed out/,
  );
});

test('normalizes checks, preserves approval, and detects review comments', async () => {
  mockPullRequestDetails();
  const pullRequest = await fetchPullRequest('test-token', 'owner/repo', 42);
  assert.ok(pullRequest);
  assert.deepEqual(pullRequest.reviewers, [{ login: 'reviewer', status: 'approved' }]);
  assert.equal(pullRequest.comments, true);
  assert.equal(pullRequest.checks[0].status, 'success');
  assert.equal(pullRequest.checks[1].detail, 'Bad syntax');
  assert.equal(pullRequest.groupId, 'unlinked');
});

test('rejects false issue matches and ignores closed PRs', async () => {
  mockPullRequestDetails();
  const issue = {
    id: 'issue',
    identifier: 'ABC-12',
    title: 'Task',
    url: 'https://linear.app/issue/ABC-12',
  };
  assert.equal(
    await fetchPullRequest('test-token', 'owner/repo', 42, issue, false),
    null,
  );
  mockRequests(() => ({ ...remotePullRequest, state: 'closed' }));
  assert.equal(await fetchPullRequest('test-token', 'owner/repo', 42), null);
});

test('merge queue lookup updates only the returned PR entries', async () => {
  mockPullRequestDetails();
  const pullRequest = await fetchPullRequest('test-token', 'owner/repo', 42);
  assert.ok(pullRequest);
  mockRequests(() => ({ data: { r0: { p0: { mergeQueueEntry: { id: 'entry' } } } } }));
  await markMergeQueued('test-token', [pullRequest]);
  assert.equal(pullRequest.mergeQueued, true);
});

test('launch reports ready status when GitHub refuses auto-merge', async () => {
  mockPullRequestDetails();
  const pullRequest = await fetchPullRequest('test-token', 'owner/repo', 42);
  assert.ok(pullRequest);
  let markedReady = false;
  mockRequests(({ url, body }) => {
    if (url.endsWith('/pulls/42')) return { ...remotePullRequest, draft: true };
    if (body?.includes('markPullRequestReadyForReview')) {
      markedReady = true;
      return {
        data: { markPullRequestReadyForReview: { pullRequest: { isDraft: false } } },
      };
    }
    return { errors: [{ message: 'Auto-merge disabled' }] };
  });
  const result = await launchPr({ githubKey: 'test-token', linearKey: '' }, pullRequest);
  assert.equal(markedReady, true);
  assert.equal(result.readyForReview, true);
  assert.equal(result.automergeEnabled, false);
  assert.match(result.error ?? '', /Auto-merge disabled/);
});
