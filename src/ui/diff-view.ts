import { Component, ItemView, MarkdownRenderer, Notice } from 'obsidian';
import type { ViewStateResult, WorkspaceLeaf } from 'obsidian';
import type LinearPrsPlugin from '../main';
import type { PullRequest } from '../types';
import { STAGES, stageTitle } from '../metadata';
import { closePr } from '../api/github';
import { fetchPullRequestDiff } from '../api/diff';
import { withDeadline } from '../async';
import { createIcon, createIconButton, errorMessage } from './elements';
import { renderReviewDiff } from './review-diff';
import { fetchDescriptionImage } from '../api/description-images';
import { forEachConcurrent } from '../async';
import { renderPullRequestBadges } from './pull-request-badges';

export const DIFF_VIEW_TYPE = 'linear-prs-diff';

export class DiffView extends ItemView {
  private pullRequest?: PullRequest;
  private controls?: HTMLElement;
  private generation = 0;
  private busy = false;
  private markdown?: Component;
  private disposeDiff?: () => void;
  private imageUrls: string[] = [];

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: LinearPrsPlugin,
  ) {
    super(leaf);
  }
  getViewType() {
    return DIFF_VIEW_TYPE;
  }
  getDisplayText() {
    return this.pullRequest
      ? `#${this.pullRequest.number} ${this.pullRequest.title}`
      : 'PR diff';
  }
  getIcon() {
    return 'git-pull-request';
  }
  getState() {
    return { pullRequestId: this.pullRequest?.id };
  }
  async setState(state: unknown, result: ViewStateResult) {
    const id =
      state && typeof state === 'object' && 'pullRequestId' in state
        ? state.pullRequestId
        : undefined;
    this.pullRequest = this.plugin.metadata.pullRequests.find(
      (pullRequest) => pullRequest.id === id,
    );
    await super.setState(state, result);
    await this.loadDiff();
  }
  async onClose() {
    this.generation++;
    this.clearContent();
  }
  private clearContent() {
    this.disposeDiff?.();
    this.disposeDiff = undefined;
    this.imageUrls.forEach((url) => URL.revokeObjectURL(url));
    this.imageUrls = [];
    if (this.markdown) {
      this.removeChild(this.markdown);
      this.markdown = undefined;
    }
  }
  renderControls() {
    const pullRequest = this.pullRequest;
    const controls = this.controls;
    if (!pullRequest || !controls) {
      return;
    }
    controls.empty();
    const archived = this.plugin.metadata.hidden.includes(pullRequest.id);
    const actions = controls.createSpan({ cls: 'linear-prs-control-set' });
    const trash = createIconButton(
      actions,
      'Close and remove pull request',
      'trash-2',
      () =>
        void this.runAction(async () => {
          await closePr(this.plugin.credentials(), pullRequest);
          this.plugin.metadata.hidden = [
            ...new Set([...this.plugin.metadata.hidden, pullRequest.id]),
          ];
          await this.plugin.saveMetadata({ refreshBoards: true });
          new Notice('Closed and removed PR');
        }),
    );
    trash.disabled = this.busy || archived;
    const staging = controls.createSpan({ cls: 'linear-prs-control-set' });
    for (const stage of STAGES) {
      const button = createIconButton(
        staging,
        stageTitle(this.plugin.metadata, stage),
        stage,
        () =>
          void this.runAction(async () => {
            const metadata = this.plugin.metadata;
            metadata.reviewTypes[pullRequest.id] =
              metadata.reviewTypes[pullRequest.id] === stage ? 'none' : stage;
            await this.plugin.saveMetadata({ refreshBoards: true });
          }),
        { active: this.plugin.metadata.reviewTypes[pullRequest.id] === stage },
      );
      button.disabled = this.busy;
    }
    renderPullRequestBadges(pullRequest, controls);
    if (archived) {
      controls.createSpan({ text: 'Closed and removed' });
    }
  }
  private async runAction(action: () => Promise<void>) {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.renderControls();
    try {
      await action();
    } catch (error) {
      new Notice(errorMessage(error), 8000);
    } finally {
      this.busy = false;
      this.renderControls();
    }
  }
  private async loadImages(description: HTMLElement, generation: number) {
    await forEachConcurrent(
      Array.from(description.querySelectorAll('img')),
      3,
      async (image) => {
        const source = image.getAttribute('src');
        if (!source) {
          return;
        }
        image.referrerPolicy = 'no-referrer';
        try {
          const blob = await withDeadline(
            fetchDescriptionImage(this.plugin.settings.githubKey, source),
            30000,
            'Description image',
          );
          if (!blob || generation !== this.generation) {
            return;
          }
          const url = URL.createObjectURL(blob);
          this.imageUrls.push(url);
          image.src = url;
        } catch (error) {
          if (generation !== this.generation) {
            return;
          }
          image.hidden = true;
          const fallback = description.ownerDocument.createElement('a');
          fallback.textContent = `Open image on GitHub: ${image.alt || 'Screenshot'}`;
          fallback.href = source;
          fallback.target = '_blank';
          fallback.rel = 'noopener';
          fallback.title = errorMessage(error);
          image.after(fallback);
        }
      },
    );
  }
  private async loadDiff() {
    const generation = ++this.generation;
    this.clearContent();
    this.contentEl.empty();
    this.contentEl.addClass('linear-prs', 'linear-prs-diff');
    const pullRequest = this.pullRequest;
    if (!pullRequest) {
      this.contentEl.createEl('p', {
        text: 'This pull request is no longer in the board. Open it again from the board.',
      });
      return;
    }
    const header = this.contentEl.createDiv({ cls: 'linear-prs-diff-header' });
    const heading = header.createDiv({ cls: 'linear-prs-diff-heading' });
    const title = heading.createDiv({ cls: 'linear-prs-title' });
    createIcon(
      title,
      pullRequest.draft ? 'git-pull-request-draft' : 'git-pull-request',
      undefined,
      pullRequest.draft ? 'dim' : 'good',
    );
    title.createEl('h2', { text: pullRequest.title });
    this.controls = heading.createDiv({ cls: 'linear-prs-actions linear-prs-controls' });
    header.createEl('a', {
      text: `${pullRequest.repo} #${pullRequest.number}`,
      href: pullRequest.url,
      cls: 'linear-prs-pill',
      attr: { target: '_blank', rel: 'noopener' },
    });
    this.renderControls();
    const body = this.contentEl.createDiv({ cls: 'linear-prs-diff-scroll' });
    body.createEl('p', { text: 'Loading description and diff…' });
    try {
      const result = await withDeadline(
        fetchPullRequestDiff(this.plugin.settings.githubKey, pullRequest),
        60000,
        'PR diff',
      );
      if (generation !== this.generation) {
        return;
      }
      body.empty();
      const descriptionCard = body.createEl('details', {
        cls: 'linear-prs-diff-description-card',
        attr: { open: '' },
      });
      const summary = descriptionCard.createEl('summary', {
        cls: 'linear-prs-group-header',
      });
      createIcon(summary, 'chevron-down', undefined, 'linear-prs-chevron');
      summary.createSpan({ text: 'Description', cls: 'linear-prs-group-title' });
      const description = descriptionCard.createDiv({
        cls: 'linear-prs-diff-description markdown-rendered',
      });
      this.markdown = this.addChild(new Component());
      await MarkdownRenderer.render(
        this.app,
        result.description || '_No description provided._',
        description,
        '',
        this.markdown,
      );
      if (generation !== this.generation) {
        return;
      }
      this.disposeDiff = renderReviewDiff(body, result.diff);
      void this.loadImages(description, generation);
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }
      body.empty();
      body.createEl('p', { text: `Could not load PR diff: ${errorMessage(error)}` });
      const retry = body.createEl('button', { text: 'Retry' });
      retry.onclick = () => void this.loadDiff();
    }
  }
}
