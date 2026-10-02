import { linearIssueLinks, rememberSearch } from '../src/linear-issue-links';
import {
  fetchSnapshots,
  fetchAuthoredSnapshots,
  createPullRequestReference,
} from '../src/api/snapshots';
import { discover, refreshPrs } from '../src/api/discovery';
import { resolveLinearContexts } from '../src/api/context';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrateMetadata, createEmptyMetadata } from '../src/metadata';
import { parsePullRequestUrl, referencedIdentifiers } from '../src/pull-request-matching';
import { forEachConcurrent, withDeadline } from '../src/async';
import { launchPr, updatePrBranch } from '../src/api/github';
import { rebasePullRequest } from '../src/api/rebase';

function mockRequests(
  handler: (options: { url: string; body?: string }) => unknown,
  options: { baseSha?: string } = {},
) {
  Object.assign(globalThis, {
    requestMock: async (request: { url: string; body?: string }) => ({
      status: 200,
      json: request.url.includes('/git/ref/heads/')
        ? { object: { sha: options.baseSha ?? 'base' } }
        : handler(request),
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
  base: { sha: 'base', ref: 'main' },
  requested_reviewers: [],
  auto_merge: null,
  mergeable: true,
};

test('migrates legacy queues without losing board state or mutating input', () => {
  const saved = {
    ...createEmptyMetadata(),
    reviewTypes: {
      one: 'review' as const,
      two: 'stamp' as const,
      three: 'C' as const,
      four: 'D' as const,
    },
    collapsed: ['queue:review', 'queue:stamp', 'group'],
    hidden: ['closed'],
    reviewMessage: ['one'],
  };
  const migrated = migrateMetadata(saved);
  assert.deepEqual(migrated.reviewTypes, { one: 'A', two: 'B', three: 'C', four: 'D' });
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
  mockRequests(() => ({ data: { p0: { pullRequest: graphSnapshot() } } }));
  const [snapshot] = await fetchSnapshots('github', [
    createPullRequestReference({ repo: 'owner/repo', number: 42 }),
  ]);
  const pullRequest = snapshot.pullRequest;
  assert.ok(pullRequest);
  assert.deepEqual(pullRequest.reviewers, [{ login: 'reviewer', status: 'approved' }]);
  assert.equal(pullRequest.comments, true);
  assert.equal(pullRequest.checks[0].status, 'success');
  assert.equal(pullRequest.checks[2].detail, 'Bad syntax');
});

test('launch reports ready status when GitHub refuses auto-merge', async () => {
  const pullRequest = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.ok(pullRequest);
  let markedReady = false;
  mockRequests(({ url, body }) => {
    if (url.endsWith('/pulls/42')) return { ...remotePullRequest, draft: true };
    if (url.includes('/compare/')) return { behind_by: 0 };
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

test('launch verifies a guarded rebase before ready and auto-merge', async () => {
  const pullRequest = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.ok(pullRequest);
  const actions: string[] = [];
  mockRequests(({ url, body }) => {
    if (url.endsWith('/pulls/42'))
      return {
        ...remotePullRequest,
        draft: true,
        head: {
          ...remotePullRequest.head,
          sha: actions.includes('rebase') ? 'rebased' : 'abc',
        },
      };
    if (url.includes('/compare/')) {
      return { behind_by: url.endsWith('...rebased') ? 0 : 2 };
    }
    if (body?.includes('updatePullRequestBranch')) {
      const payload = JSON.parse(body);
      assert.deepEqual(payload.variables.input, {
        pullRequestId: 'PR_42',
        expectedHeadOid: 'abc',
        updateMethod: 'REBASE',
      });
      actions.push('rebase');
      return { data: { updatePullRequestBranch: { clientMutationId: null } } };
    }
    if (body?.includes('markPullRequestReadyForReview')) {
      actions.push('ready');
      return {
        data: { markPullRequestReadyForReview: { pullRequest: { isDraft: false } } },
      };
    }
    actions.push('auto-merge');
    return { data: { enablePullRequestAutoMerge: { clientMutationId: null } } };
  });
  const result = await launchPr({ githubKey: 'test-token', linearKey: '' }, pullRequest);
  assert.deepEqual(actions, ['rebase', 'ready', 'auto-merge']);
  assert.equal(result.rebaseStatus, 'updated');
  assert.equal(result.automergeEnabled, true);
  assert.deepEqual(result.warnings, []);
});

test('launch skips rebasing an up-to-date branch', async () => {
  const pullRequest = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.ok(pullRequest);
  mockRequests(({ url, body }) => {
    if (url.endsWith('/pulls/42')) return remotePullRequest;
    if (url.includes('/compare/')) return { behind_by: 0 };
    assert.ok(!body?.includes('updatePullRequestBranch'));
    return { data: { enablePullRequestAutoMerge: { clientMutationId: null } } };
  });
  const result = await launchPr({ githubKey: 'test-token', linearKey: '' }, pullRequest);
  assert.equal(result.rebaseStatus, 'up-to-date');
  assert.deepEqual(result.warnings, []);
});

test('launch attempts rebasing even when auto-merge is already enabled', async () => {
  const pullRequest = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.ok(pullRequest);
  let requested = false;
  mockRequests(({ url, body }) => {
    if (url.endsWith('/pulls/42'))
      return {
        ...remotePullRequest,
        auto_merge: {},
        head: { ...remotePullRequest.head, sha: requested ? 'rebased' : 'abc' },
      };
    if (url.includes('/compare/')) return { behind_by: requested ? 0 : 1 };
    assert.ok(body?.includes('updatePullRequestBranch'));
    requested = true;
    return { data: { updatePullRequestBranch: { clientMutationId: null } } };
  });
  const result = await launchPr({ githubKey: 'test-token', linearKey: '' }, pullRequest);
  assert.equal(requested, true);
  assert.equal(result.automergeEnabled, true);
});

test('rebase conflicts warn while launch continues', async () => {
  const pullRequest = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.ok(pullRequest);
  mockRequests(({ url, body }) => {
    if (url.endsWith('/pulls/42')) return { ...remotePullRequest, mergeable: false };
    assert.ok(!body?.includes('updatePullRequestBranch'));
    return { data: { enablePullRequestAutoMerge: { clientMutationId: null } } };
  });
  const result = await launchPr({ githubKey: 'test-token', linearKey: '' }, pullRequest);
  assert.equal(result.rebaseStatus, 'failed');
  assert.match(result.warnings[0], /merge conflicts/);
  assert.equal(result.automergeEnabled, true);
});

test('rejected rebases warn without blocking remaining launch actions', async () => {
  const pullRequest = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.ok(pullRequest);
  for (const message of ['Resource not accessible', 'Head branch changed']) {
    mockRequests(({ url, body }) => {
      if (url.endsWith('/pulls/42')) return remotePullRequest;
      if (url.includes('/compare/')) return { behind_by: 1 };
      if (body?.includes('updatePullRequestBranch')) return { errors: [{ message }] };
      return { data: { enablePullRequestAutoMerge: { clientMutationId: null } } };
    });
    const result = await launchPr(
      { githubKey: 'test-token', linearKey: '' },
      pullRequest,
    );
    assert.equal(result.rebaseStatus, 'failed');
    assert.ok(result.warnings[0].includes(message));
    assert.equal(result.automergeEnabled, true);
  }
});

test('closed PRs never trigger a rebase or launch mutation', async () => {
  const pullRequest = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.ok(pullRequest);
  let requests = 0;
  mockRequests(({ url }) => {
    requests++;
    assert.ok(url.endsWith('/pulls/42'));
    return { ...remotePullRequest, state: 'closed' };
  });
  await assert.rejects(
    launchPr({ githubKey: 'test-token', linearKey: '' }, pullRequest),
    /not open/,
  );
  assert.equal(requests, 1);
});

test('rebase compares against the live base tip instead of the PR snapshot', async () => {
  let updated = false;
  mockRequests(
    ({ url, body }) => {
      if (url.includes('/compare/')) {
        assert.ok(url.includes('/compare/current-base...'));
        return { behind_by: updated ? 0 : 26 };
      }
      if (body) {
        updated = true;
        return { data: { updatePullRequestBranch: { clientMutationId: null } } };
      }
      return {
        ...remotePullRequest,
        head: { ...remotePullRequest.head, sha: 'rebased' },
      };
    },
    { baseSha: 'current-base' },
  );
  const result = await rebasePullRequest('test-token', 'owner/repo', remotePullRequest, {
    attempts: 2,
    intervalMs: 0,
  });
  assert.equal(updated, true);
  assert.equal(result.status, 'updated');
});

test('an accepted mutation with an unchanged branch is reported as failure', async () => {
  mockRequests(({ url, body }) => {
    if (url.includes('/compare/')) return { behind_by: 2 };
    if (body) return { data: { updatePullRequestBranch: { clientMutationId: null } } };
    return remotePullRequest;
  });
  const result = await rebasePullRequest('test-token', 'owner/repo', remotePullRequest, {
    attempts: 2,
    intervalMs: 0,
  });
  assert.equal(result.status, 'failed');
  assert.match(result.warning ?? '', /did not complete/);
});

test('verification waits for asynchronous branch updates', async () => {
  let reads = 0;
  mockRequests(({ url, body }) => {
    if (url.includes('/compare/')) return { behind_by: reads >= 2 ? 0 : 2 };
    if (body) return { data: { updatePullRequestBranch: { clientMutationId: null } } };
    reads++;
    return {
      ...remotePullRequest,
      head: { ...remotePullRequest.head, sha: reads >= 2 ? 'rebased' : 'abc' },
    };
  });
  const result = await rebasePullRequest('test-token', 'owner/repo', remotePullRequest, {
    attempts: 3,
    intervalMs: 0,
  });
  assert.equal(reads, 2);
  assert.equal(result.status, 'updated');
});

test('row branch refresh uses current GitHub state without ready or auto-merge mutations', async () => {
  const pullRequest = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.ok(pullRequest);
  let latestFetched = false;
  mockRequests(({ url, body }) => {
    assert.equal(body, undefined);
    if (url.endsWith('/pulls/42')) {
      latestFetched = true;
      return {
        ...remotePullRequest,
        draft: true,
        head: { ...remotePullRequest.head, sha: 'latest' },
      };
    }
    assert.ok(url.endsWith('/compare/base...latest'));
    return { behind_by: 0 };
  });
  const result = await updatePrBranch(
    { githubKey: 'test-token', linearKey: '' },
    pullRequest,
  );
  assert.equal(latestFetched, true);
  assert.equal(result.status, 'up-to-date');
});

function connection<T>(nodes: T[] = []) {
  return { nodes, pageInfo: { hasNextPage: false, endCursor: null as string | null } };
}
function graphSnapshot() {
  return {
    id: 'PR_42',
    number: 42,
    title: 'Updated title',
    body: '',
    url: remotePullRequest.html_url,
    state: 'OPEN',
    isDraft: true,
    createdAt: remotePullRequest.created_at,
    headRefOid: 'latest',
    headRefName: 'fix/abc-123',
    baseRefName: 'main',
    baseRef: { target: { oid: 'base' } },
    mergeable: 'MERGEABLE',
    autoMergeRequest: { enabledAt: '2026-09-01' },
    mergeQueueEntry: { id: 'queue' },
    reviews: connection([
      { author: { login: 'reviewer', __typename: 'User' }, state: 'APPROVED', body: '' },
      {
        author: { login: 'reviewer', __typename: 'User' },
        state: 'COMMENTED',
        body: 'Looks good',
      },
    ]),
    reviewRequests: connection(),
    comments: connection(),
    reviewThreads: connection(),
    statusCheckRollup: {
      id: 'rollup',
      contexts: connection([
        {
          __typename: 'CheckRun',
          id: 'check',
          name: 'Optional',
          status: 'COMPLETED',
          conclusion: 'SKIPPED',
        },
        { __typename: 'StatusContext', context: 'Deploy', state: 'PENDING' },
        {
          __typename: 'CheckRun',
          id: 'lint',
          name: 'Lint',
          status: 'COMPLETED',
          conclusion: 'FAILURE',
          summary: 'Bad syntax',
        },
      ]),
    },
  };
}

test('batched status read preserves associations and normalizes badges in one request', async () => {
  const previous = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.ok(previous);
  previous.groupId = 'linear-group';
  previous.issueId = 'linear-issue';
  let requests = 0;
  mockRequests(({ body }) => {
    requests++;
    assert.ok(body?.includes('RefreshPullRequestSnapshots'));
    return {
      data: {
        p0: { pullRequest: graphSnapshot() },
        p1: { pullRequest: graphSnapshot() },
      },
    };
  });
  const snapshots = await fetchSnapshots('test-token', [
    previous,
    { ...previous, number: 43, id: 'owner/repo#43' },
  ]);
  assert.equal(requests, 1);
  assert.equal(snapshots.length, 2);
  const current = snapshots[0].pullRequest;
  assert.ok(current);
  assert.equal(current.groupId, 'linear-group');
  assert.equal(current.issueId, 'linear-issue');
  assert.equal(current.draft, true);
  assert.equal(current.automerge, true);
  assert.equal(current.mergeQueued, true);
  assert.equal(current.comments, true);
  assert.deepEqual(current.reviewers, [{ login: 'reviewer', status: 'approved' }]);
  assert.deepEqual(
    current.checks.map((check) => check.status),
    ['success', 'pending', 'failure'],
  );
  assert.equal(current.checks[2].detail, 'Bad syntax');
});

test('snapshot errors reject rather than overwriting cached PRs with partial data', async () => {
  const previous = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.ok(previous);
  mockRequests(() => ({ errors: [{ message: 'Not accessible' }], data: { p0: null } }));
  await assert.rejects(fetchSnapshots('test-token', [previous]), /Not accessible/);
});

test('snapshots paginate additional reviews only when needed', async () => {
  const previous = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.ok(previous);
  let requests = 0;
  const snapshot = graphSnapshot();
  snapshot.reviews.pageInfo = { hasNextPage: true, endCursor: 'next' };
  mockRequests(({ body }) => {
    requests++;
    if (body?.includes('RefreshPullRequestSnapshots'))
      return { data: { p0: { pullRequest: snapshot } } };
    assert.equal(JSON.parse(body ?? '{}').variables.after, 'next');
    return {
      data: {
        node: {
          reviews: connection([
            {
              author: { login: 'reviewer', __typename: 'User' },
              state: 'CHANGES_REQUESTED',
              body: '',
            },
          ]),
        },
      },
    };
  });
  const [result] = await fetchSnapshots('test-token', [previous]);
  assert.equal(requests, 2);
  assert.equal(result.pullRequest?.reviewers[0].status, 'changes_requested');
});

test('closed snapshots remove PRs and an empty refresh makes no requests', async () => {
  const previous = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.ok(previous);
  let requests = 0;
  mockRequests(() => {
    requests++;
    return { data: { p0: { pullRequest: { ...graphSnapshot(), state: 'MERGED' } } } };
  });
  assert.equal((await fetchSnapshots('test-token', [previous]))[0].pullRequest, null);
  assert.deepEqual(await fetchSnapshots('test-token', []), []);
  assert.equal(requests, 1);
});

test('existing group refresh reads more than ten PRs in one GitHub query', async () => {
  const previous = Array.from({ length: 24 }, (_, index) => ({
    ...createPullRequestReference({ repo: 'owner/repo', number: index + 1 }),
    groupId: 'parent',
    issueId: 'issue',
  }));
  let calls = 0;
  mockRequests(({ url, body }) => {
    calls++;
    assert.equal(url, 'https://api.github.com/graphql');
    assert.match(JSON.parse(body!).query, /p23:/);
    return {
      data: Object.fromEntries(
        previous.map((pr, index) => [
          `p${index}`,
          { pullRequest: { ...graphSnapshot(), number: pr.number, url: pr.url } },
        ]),
      ),
    };
  });
  const result = await refreshPrs({ githubKey: 'github', linearKey: 'linear' }, previous);
  assert.equal(calls, 1);
  assert.equal(result.length, 24);
  assert.ok(result.every((pr) => pr.groupId === 'parent' && pr.issueId === 'issue'));
});

const linkedIssue = {
  id: 'issue',
  identifier: 'ENG-4777',
  title: 'Converge work contracts',
  url: 'https://linear.app/casco/issue/ENG-4777',
  parent: {
    id: 'parent',
    title: 'Data Access',
    url: 'https://linear.app/casco/issue/ENG-3856',
  },
};

test('full refresh uses two service queries and attaches PR context without text identifiers', async () => {
  let calls = 0;
  mockRequests(({ url, body }) => {
    calls++;
    const query = JSON.parse(body!).query;
    if (url.includes('github.com')) {
      assert.match(query, /author:@me/);
      return {
        data: {
          search: {
            ...connection([
              {
                ...graphSnapshot(),
                number: 6381,
                title: 'Refactor work contracts',
                headRefName: 'eric/work-datastore2',
                url: 'https://github.com/agentruntime/casco/pull/6381',
              },
            ]),
            issueCount: 1,
          },
        },
      };
    }
    assert.match(query, /attachmentsForURL/);
    assert.match(query, /nodes\{issue\{/);
    return { data: { p0: connection([{ issue: linkedIssue }]) } };
  });
  const result = await discover({ githubKey: 'github', linearKey: 'linear' });
  assert.equal(calls, 2);
  assert.equal(result.prs[0].issueId, 'issue');
  assert.equal(result.prs[0].groupId, 'parent');
  assert.equal(result.prs[0].linearContext?.source, 'attachment');
});

test('attachment context wins over incidental identifiers and preserves all linked issues', async () => {
  const remote = { ...remotePullRequest, title: 'ENG-99 is unrelated' };
  const previous = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  const other = { ...linkedIssue, id: 'other', identifier: 'ENG-99' };
  mockRequests(({ body }) => {
    assert.deepEqual(JSON.parse(body!).variables.filter.or[0].and[0], {
      number: { eq: 99 },
    });
    return {
      data: {
        p0: connection([
          { issue: linkedIssue },
          { issue: linkedIssue },
          { issue: { ...linkedIssue, id: 'second', identifier: 'ENG-5000' } },
        ]),
        references: connection([other]),
      },
    };
  });
  const [pr] = await resolveLinearContexts('linear', [{ remote, pullRequest: previous }]);
  assert.equal(pr.issueId, 'issue');
  assert.equal(pr.linearContext?.issues.length, 2);
  assert.equal(pr.linearContext?.source, 'attachment');
});

test('identifier fallback is batched and real unlinked PRs remain visible', async () => {
  const previous = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  mockRequests(() => ({
    data: { p0: connection(), p1: connection(), references: connection([linkedIssue]) },
  }));
  const result = await resolveLinearContexts('linear', [
    {
      remote: {
        ...remotePullRequest,
        title: 'ENG-4777',
        body: null,
        head: { sha: 'head', ref: 'feature' },
      },
      pullRequest: previous,
    },
    {
      remote: {
        ...remotePullRequest,
        title: 'Unrelated',
        body: null,
        head: { sha: 'head', ref: 'feature' },
      },
      pullRequest: { ...previous, number: 43 },
    },
  ]);
  assert.equal(result[0].linearContext?.source, 'reference');
  assert.equal(result[1].groupId, 'unlinked');
  assert.equal(result.length, 2);
});

test('account search follows cursors and refuses the GitHub search truncation limit', async () => {
  let calls = 0;
  mockRequests(({ body }) => {
    calls++;
    const after = JSON.parse(body!).variables.after;
    if (after === null)
      return {
        data: {
          search: {
            nodes: [graphSnapshot()],
            issueCount: 2,
            pageInfo: { hasNextPage: true, endCursor: 'next' },
          },
        },
      };
    assert.equal(after, 'next');
    return {
      data: {
        search: { ...connection([{ ...graphSnapshot(), number: 43 }]), issueCount: 2 },
      },
    };
  });
  assert.equal((await fetchAuthoredSnapshots('github')).length, 2);
  assert.equal(calls, 2);
  mockRequests(() => ({ data: { search: { ...connection(), issueCount: 1001 } } }));
  await assert.rejects(fetchAuthoredSnapshots('github'), /1,000-result/);
});

test('Linear failures reject the refresh instead of classifying associated PRs as unlinked', async () => {
  mockRequests(() => ({ errors: [{ message: 'Permission denied' }] }));
  await assert.rejects(
    resolveLinearContexts('linear', [
      {
        remote: remotePullRequest,
        pullRequest: createPullRequestReference({ repo: 'owner/repo', number: 42 }),
      },
    ]),
    /Permission denied/,
  );
});

test('shipping can reuse its group snapshot without another PR detail read', async () => {
  let details = 0;
  mockRequests(({ url }) => {
    if (url.endsWith('/pulls/42')) {
      details++;
      throw new Error('Unexpected detail read');
    }
    if (url.includes('/compare/')) return { behind_by: 0 };
    return { data: { enablePullRequestAutoMerge: { clientMutationId: null } } };
  });
  const result = await launchPr(
    { githubKey: 'github', linearKey: 'linear' },
    createPullRequestReference({ repo: 'owner/repo', number: 42 }),
    { ...remotePullRequest, auto_merge: {} },
  );
  assert.equal(details, 0);
  assert.equal(result.automergeEnabled, true);
});

test('Linear attachment pagination keeps context from later pages', async () => {
  let calls = 0;
  mockRequests(({ body }) => {
    calls++;
    const payload = JSON.parse(body!);
    if (calls === 1)
      return {
        data: { p0: { nodes: [], pageInfo: { hasNextPage: true, endCursor: 'next' } } },
      };
    assert.equal(payload.variables.after, 'next');
    return { data: { attachmentsForURL: connection([{ issue: linkedIssue }]) } };
  });
  const [pr] = await resolveLinearContexts('linear', [
    {
      remote: remotePullRequest,
      pullRequest: createPullRequestReference({ repo: 'owner/repo', number: 42 }),
    },
  ]);
  assert.equal(pr.issueId, 'issue');
  assert.equal(calls, 2);
});

test('Linear pagination refuses a missing cursor instead of replacing context', async () => {
  mockRequests(() => ({
    data: { p0: { nodes: [], pageInfo: { hasNextPage: true, endCursor: null } } },
  }));
  await assert.rejects(
    resolveLinearContexts('linear', [
      {
        remote: remotePullRequest,
        pullRequest: createPullRequestReference({ repo: 'owner/repo', number: 42 }),
      },
    ]),
    /Missing Linear attachment cursor/,
  );
});

test('zero and out-of-range incidental identifiers cannot break attachment resolution', async () => {
  mockRequests(({ body }) => {
    const payload = JSON.parse(body!);
    assert.deepEqual(payload.variables.filter.or, [
      { and: [{ number: { eq: 4777 } }, { team: { key: { eq: 'ENG' } } }] },
    ]);
    return {
      data: {
        p0: connection([{ issue: linkedIssue }]),
        references: connection([linkedIssue]),
      },
    };
  });
  const [pr] = await resolveLinearContexts('linear', [
    {
      remote: {
        ...remotePullRequest,
        title: 'CVSS-0 ABC-999999999999999999999 ENG-4777',
        head: { sha: 'head', ref: 'feature' },
      },
      pullRequest: createPullRequestReference({ repo: 'owner/repo', number: 42 }),
    },
  ]);
  assert.equal(pr.issueId, 'issue');
});

test('Linear ID pills support cached URLs and all associated issues', () => {
  const previous = createPullRequestReference({ repo: 'owner/repo', number: 42 });
  assert.deepEqual(
    linearIssueLinks({
      ...previous,
      issueUrl: linkedIssue.url,
      issueTitle: linkedIssue.title,
    }),
    [{ identifier: 'ENG-4777', title: linkedIssue.title, url: linkedIssue.url }],
  );
  assert.equal(
    linearIssueLinks({
      ...previous,
      linearContext: {
        source: 'attachment',
        issues: [linkedIssue, linkedIssue, { ...linkedIssue, identifier: 'ENG-4781' }],
      },
    }).length,
    2,
  );
  assert.deepEqual(linearIssueLinks(previous), []);
});

test('search history persists completed terms with a bounded, case-insensitive recency order', () => {
  assert.deepEqual(rememberSearch(['ENG-4777', 'other'], ' eng-4777 '), [
    'eng-4777',
    'other',
  ]);
  assert.equal(
    rememberSearch(
      Array.from({ length: 10 }, (_, i) => String(i)),
      'ENG-4781',
    ).length,
    10,
  );
  assert.deepEqual(migrateMetadata({ searchHistory: ['ENG-4781'] }).searchHistory, [
    'ENG-4781',
  ]);
  assert.deepEqual(migrateMetadata({}).searchHistory, []);
});
