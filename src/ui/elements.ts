import { setIcon } from 'obsidian';
import type { PullRequest } from '../types';
import { STAGES, type Stage } from '../metadata';
const MERGE_QUEUE_PATH =
  'M3.75 4.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM3 7.75a.75.75 0 0 1 1.5 0v2.878a2.251 2.251 0 1 1-1.5 0Zm.75 5.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm5-7.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm5.75 2.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-1.5 0a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z';
export function formatReviewMessage(pullRequests: PullRequest[]): string {
  return [
    'Some prs to review:',
    '',
    ...pullRequests.map(
      (pullRequest, index) => `${index + 1}. ${pullRequest.title} ${pullRequest.url}`,
    ),
  ].join('\n');
}
export function createIcon(
  parent: HTMLElement,
  name: string,
  title?: string,
  cls = '',
): HTMLElement {
  const element = parent.createSpan({ cls: `linear-prs-icon ${cls}` });
  if (name === 'linear-prs-merge-queue') {
    element.addClass('linear-prs-merge-queue');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', MERGE_QUEUE_PATH);
    path.style.fill = 'currentColor';
    path.style.stroke = 'none';
    svg.appendChild(path);
    element.appendChild(svg);
  } else {
    setIcon(element, name);
  }
  if (title) {
    element.setAttr('title', title);
    element.setAttr('aria-label', title);
    element.setAttr('role', 'img');
  }
  return element;
}
export function createIconButton(
  parent: HTMLElement,
  label: string,
  name: string,
  click: () => void,
  options: { active?: boolean; loading?: 'spin' | 'pulse' } = {},
): HTMLButtonElement {
  const { active = false, loading } = options;
  const buttonElement = parent.createEl('button', {
    cls: `linear-prs-button${active ? ' is-active' : ''}${loading ? ` is-loading is-${loading === 'spin' ? 'spinning' : 'pulsing'}` : ''}`,
    attr: { 'aria-label': label, title: label, type: 'button' },
  });
  if (loading) {
    buttonElement.disabled = true;
    buttonElement.setAttr('aria-busy', 'true');
  }
  if (STAGES.includes(name as Stage)) {
    buttonElement.setText(name);
    buttonElement.addClass('linear-prs-stage-button');
  } else {
    setIcon(buttonElement, name);
  }
  buttonElement.onclick = (e) => {
    e.stopPropagation();
    click();
  };
  return buttonElement;
}
export function formatOpenedDate(iso: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3600000));
  if (hours < 1) {
    return 'opened just now';
  }
  if (hours < 24) {
    return `opened ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  const days = Math.floor(hours / 24);
  return `opened ${days} ${days === 1 ? 'day' : 'days'} ago`;
}
export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
