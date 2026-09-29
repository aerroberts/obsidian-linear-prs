import { setTooltip } from 'obsidian';
import type { PullRequest } from '../types';
import { createIcon } from './elements';

export function renderPullRequestBadges(
  pullRequest: PullRequest,
  controls: HTMLElement,
): void {
  const badges = controls.createSpan({
    cls: 'linear-prs-control-set linear-prs-badges',
  });
  createIcon(
    badges,
    'message-square',
    pullRequest.comments ? 'Pull request has comments' : 'Pull request has no comments',
    pullRequest.comments ? 'orange' : 'dim',
  );
  const reviewerTone = pullRequest.reviewers.some((r) => r.status === 'approved')
    ? 'good'
    : pullRequest.reviewers.some((r) => r.status === 'dismissed')
      ? 'orange'
      : 'dim';
  createIcon(
    badges,
    'user',
    pullRequest.reviewers.length
      ? pullRequest.reviewers.map((r) => `${r.login}: ${r.status}`).join(', ')
      : 'No reviewers assigned',
    reviewerTone,
  );
  createIcon(
    badges,
    'git-merge',
    pullRequest.automerge ? 'Automerge enabled' : 'Automerge disabled',
    pullRequest.automerge ? 'good' : 'dim',
  );
  const failed = pullRequest.checks.filter((c) => c.status === 'failure');
  const pending = pullRequest.checks.filter((c) => c.status === 'pending');
  const checkStatus =
    pullRequest.conflicts || failed.length ? 'bad' : pending.length ? 'dim' : 'good';
  const reasons = [
    ...(pullRequest.conflicts ? ['Merge conflicts with the base branch'] : []),
    ...failed.slice(0, 8).map((c) => `${c.name}${c.detail ? `: ${c.detail}` : ''}`),
  ];
  if (failed.length > 8) {
    reasons.push(`And ${failed.length - 8} more failing checks`);
  }
  const checkTitle =
    checkStatus === 'bad'
      ? `Why this PR is failing:\n${reasons.join('\n')}`
      : checkStatus === 'dim'
        ? `Checks pending:\n${pending.map((c) => c.name).join('\n')}`
        : pullRequest.checks.length
          ? 'All checks passing'
          : 'No checks reported';
  const checkBadge = createIcon(
    badges,
    checkStatus === 'bad'
      ? 'circle-x'
      : checkStatus === 'dim'
        ? 'loader-circle'
        : 'circle-check',
    undefined,
    checkStatus,
  );
  checkBadge.setAttr('role', 'img');
  checkBadge.setAttr('aria-label', checkTitle);
  setTooltip(checkBadge, checkTitle, {
    placement: 'top',
    classes: ['linear-prs-check-tooltip'],
  });
}
