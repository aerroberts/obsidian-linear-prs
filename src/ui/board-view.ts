import { renderPullRequestBadges } from './pull-request-badges';
import type { WorkspaceLeaf } from 'obsidian';
import { ItemView, Notice, Platform, Scope } from 'obsidian';
import type LinearPrsPlugin from '../main';
import type { PullRequest } from '../types';
import { STAGES, BOARD_VIEW_TYPE, type Stage, type StagingAssignment } from '../metadata';
import { closePr, launchPr, requestReviewer } from '../api/github';
import {
  createIconButton,
  createIcon,
  formatOpenedDate,
  formatReviewMessage,
  errorMessage,
} from './elements';
export class BoardView extends ItemView {
  private busy = false;
  private archived = false;
  private search = '';
  private searchInput: HTMLInputElement | null = null;
  private launching = new Set<string>();
  private refreshingGroups = new Set<string>();
  constructor(
    leaf: WorkspaceLeaf,
    private plugin: LinearPrsPlugin,
  ) {
    super(leaf);
  }
  getViewType() {
    return BOARD_VIEW_TYPE;
  }
  getDisplayText() {
    return 'Linear PRs';
  }
  getIcon() {
    return 'git-pull-request';
  }
  async onOpen() {
    this.scope = new Scope(this.app.scope);
    this.scope.register([Platform.isMacOS ? 'Meta' : 'Ctrl'], 'f', (event) => {
      event.preventDefault();
      this.focusSearch();
    });
    this.render();
    if (
      !this.plugin.metadata.lastRefresh &&
      this.plugin.settings.linearKey &&
      this.plugin.settings.githubKey
    ) {
      void this.refresh();
    } else {
      void this.plugin
        .loadCachedMergeQueueStatus()
        .then((changed) => {
          if (changed) {
            this.render();
          }
        })
        .catch((e) => new Notice(errorMessage(e), 8000));
    }
  }
  focusSearch() {
    this.searchInput?.focus();
    this.searchInput?.select();
  }
  private async runAction(fn: () => Promise<void>, success: string) {
    try {
      await fn();
      new Notice(success);
      this.render();
    } catch (e) {
      new Notice(errorMessage(e), 8000);
    }
  }
  private async refresh() {
    if (this.busy || this.refreshingGroups.size) {
      return;
    }
    this.busy = true;
    this.render();
    try {
      const r = await this.plugin.refresh();
      new Notice(
        `Linear PRs: ${r.prs.length} open PRs${r.errors.length ? `, ${r.errors.length} lookup errors` : ''}`,
      );
      if (r.errors.length) {
        console.warn('Linear PR lookup errors', r.errors);
      }
    } catch (e) {
      new Notice(errorMessage(e), 8000);
    } finally {
      this.busy = false;
      this.render();
    }
  }
  private async refreshGroup(id: string, url: string, title: string) {
    if (this.busy || this.refreshingGroups.size) {
      return;
    }
    this.refreshingGroups.add(id);
    this.render();
    try {
      const r = await this.plugin.refreshGroup(id, url);
      new Notice(`${title}: refreshed ${r.prs.length} PRs`);
    } catch (e) {
      new Notice(errorMessage(e), 8000);
    } finally {
      this.refreshingGroups.delete(id);
      this.render();
    }
  }
  private async refreshQueue(type: Stage, title: string) {
    if (this.busy || this.refreshingGroups.size) {
      return;
    }
    const key = `queue:${type}`;
    const metadata = this.plugin.metadata;
    const pullRequests = metadata.pullRequests.filter(
      (pullRequest) =>
        !metadata.hidden.includes(pullRequest.id) &&
        metadata.reviewTypes[pullRequest.id] === type,
    );
    this.refreshingGroups.add(key);
    this.render();
    try {
      const result = await this.plugin.refreshSelectedPrs(pullRequests);
      new Notice(`${title}: refreshed ${result.length} PRs`);
    } catch (e) {
      new Notice(errorMessage(e), 8000);
    } finally {
      this.refreshingGroups.delete(key);
      this.render();
    }
  }
  private rememberCollapse(fetchPullRequest: HTMLDetailsElement, id: string) {
    const metadata = this.plugin.metadata;
    fetchPullRequest.open = !metadata.collapsed.includes(id);
    let lastOpen = fetchPullRequest.open;
    fetchPullRequest.ontoggle = () => {
      if (!fetchPullRequest.isConnected || fetchPullRequest.open === lastOpen) {
        return;
      }
      lastOpen = fetchPullRequest.open;
      metadata.collapsed = fetchPullRequest.open
        ? metadata.collapsed.filter((x) => x !== id)
        : [...new Set([...metadata.collapsed, id])];
      void this.plugin.saveMetadata();
    };
  }
  private getVisiblePullRequests(): PullRequest[] {
    const metadata = this.plugin.metadata;
    const query = this.search.trim().toLocaleLowerCase();
    return metadata.pullRequests
      .filter((pullRequest) =>
        this.archived
          ? metadata.hidden.includes(pullRequest.id)
          : !metadata.hidden.includes(pullRequest.id),
      )
      .filter(
        (pullRequest) =>
          !metadata.selectedRepo || pullRequest.repo === metadata.selectedRepo,
      )
      .filter(
        (pullRequest) =>
          !query ||
          [
            pullRequest.title,
            pullRequest.repo,
            String(pullRequest.number),
            pullRequest.id,
            pullRequest.issueTitle,
            pullRequest.issueUrl,
            pullRequest.groupTitle,
          ].some((value) => value?.toLocaleLowerCase().includes(query)),
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  private renderStagingSection(
    pullRequests: PullRequest[],
    title: string,
    type: Stage,
    parent: HTMLElement,
  ) {
    const fetchPullRequest = parent.createEl('details', { cls: 'linear-prs-group' });
    this.rememberCollapse(fetchPullRequest, `queue:${type}`);
    const summary = fetchPullRequest.createEl('summary', {
      cls: 'linear-prs-group-header',
    });
    createIcon(summary, 'chevron-down', undefined, 'linear-prs-chevron');
    summary.createSpan({ text: title, cls: 'linear-prs-group-title' });
    const tools = summary.createSpan({ cls: 'linear-prs-actions' });
    tools.createSpan({ text: String(pullRequests.length), cls: 'linear-prs-count' });
    const key = `queue:${type}`;
    const refresh = createIconButton(
      tools,
      `Refresh ${title}`,
      'refresh-cw',
      () => void this.refreshQueue(type, title),
      { loading: this.refreshingGroups.has(key) ? 'spin' : undefined },
    );
    if (this.busy || (this.refreshingGroups.size && !this.refreshingGroups.has(key))) {
      refresh.disabled = true;
    }
    createIconButton(
      tools,
      `Copy ${title}`,
      'copy',
      () => void this.copyToClipboard(formatReviewMessage(pullRequests)),
    );
    createIconButton(
      tools,
      `Launch ${title}`,
      'rocket',
      () => void this.launchMany(pullRequests),
      {
        loading: this.isLaunching(pullRequests) ? 'pulse' : undefined,
      },
    );
    const list = fetchPullRequest.createDiv({ cls: 'linear-prs-list' });
    if (!pullRequests.length) {
      list.createDiv({ text: `No pull requests in ${title}`, cls: 'linear-prs-empty' });
    } else {
      pullRequests.forEach((pullRequest) => this.renderPullRequest(pullRequest, list));
    }
  }
  private async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      new Notice('Copied pull requests');
    } catch (e) {
      new Notice(errorMessage(e));
    }
  }
  private async setStage(type: StagingAssignment, pullRequests: PullRequest[]) {
    pullRequests.forEach(
      (pullRequest) => (this.plugin.metadata.reviewTypes[pullRequest.id] = type),
    );
    await this.plugin.saveMetadata();
    this.render();
  }
  private launchKey(pullRequests: PullRequest[]): string {
    return pullRequests
      .map((pullRequest) => pullRequest.id)
      .sort()
      .join('\u001f');
  }
  private isLaunching(pullRequests: PullRequest[]): boolean {
    return this.launching.has(this.launchKey(pullRequests));
  }
  private async launchMany(pullRequests: PullRequest[]) {
    if (!pullRequests.length) {
      return;
    }
    const key = this.launchKey(pullRequests);
    if (this.launching.has(key)) {
      return;
    }
    this.launching.add(key);
    this.render();
    let launched = 0;
    let readyOnly = 0;
    let rebasesRequested = 0;
    const errors: string[] = [];
    try {
      for (const pullRequest of pullRequests) {
        try {
          const result = await launchPr(this.plugin.credentials(), pullRequest);
          if (result.rebaseStatus === 'requested') {
            rebasesRequested++;
          }
          errors.push(
            ...result.warnings.map((warning) => `${pullRequest.id}: ${warning}`),
          );
          pullRequest.draft = !result.readyForReview;
          pullRequest.automerge = result.automergeEnabled;
          if (result.automergeEnabled) {
            launched++;
          } else {
            readyOnly++;
            errors.push(
              `${pullRequest.repo}#${pullRequest.number}: ${result.error ?? 'Ready for review, but auto-merge is disabled.'}`,
            );
          }
        } catch (e) {
          errors.push(`${pullRequest.repo}#${pullRequest.number}: ${errorMessage(e)}`);
        }
      }
      await this.plugin.saveMetadata();
      const summary = `Launched ${launched}/${pullRequests.length} PRs${rebasesRequested ? `; ${rebasesRequested} rebases requested` : ''}${readyOnly ? `; ${readyOnly} ready without auto-merge` : ''}${errors.length ? `. ${errors.join('; ')}` : ''}`;
      new Notice(summary, errors.length ? 10000 : 4000);
    } catch (e) {
      new Notice(errorMessage(e), 8000);
    } finally {
      this.launching.delete(key);
      this.render();
    }
  }
  private renderReviewMessage(parent: HTMLElement) {
    const metadata = this.plugin.metadata;
    const items = metadata.reviewMessage
      .map((id) => metadata.pullRequests.find((pullRequest) => pullRequest.id === id))
      .filter((pullRequest): pullRequest is PullRequest => !!pullRequest);
    if (!items.length) {
      return;
    }
    const block = parent.createDiv({ cls: 'linear-prs-review-block' });
    block.createEl('pre', { text: formatReviewMessage(items) });
    const actions = block.createDiv({ cls: 'linear-prs-actions' });
    for (const stage of STAGES) {
      createIconButton(
        actions,
        `Move all to Staging ${stage}`,
        stage,
        () =>
          void this.runAction(async () => {
            await this.setStage(stage, items);
            metadata.reviewMessage = [];
            await this.plugin.saveMetadata();
          }, `Moved to Staging ${stage}`),
      );
    }
    createIconButton(
      actions,
      'Launch review PRs',
      'rocket',
      () => void this.launchMany(items),
      {
        loading: this.isLaunching(items) ? 'pulse' : undefined,
      },
    );
    createIconButton(
      actions,
      'Copy review message',
      'copy',
      () => void this.copyToClipboard(formatReviewMessage(items)),
    );
    createIconButton(
      actions,
      'Clear review message',
      'trash-2',
      () =>
        void this.runAction(async () => {
          metadata.reviewMessage = [];
          await this.plugin.saveMetadata();
        }, 'Cleared review message'),
    );
  }
  private renderPullRequest(pullRequest: PullRequest, parent: HTMLElement) {
    const row = parent.createDiv({ cls: 'linear-prs-row' });
    const top = row.createDiv({ cls: 'linear-prs-row-top' });
    const link = top.createEl('a', { href: pullRequest.url, cls: 'linear-prs-title' });
    link.setAttr('target', '_blank');
    createIcon(
      link,
      pullRequest.mergeQueued
        ? 'linear-prs-merge-queue'
        : pullRequest.draft
          ? 'git-pull-request-draft'
          : 'git-pull-request',
      pullRequest.mergeQueued ? 'In merge queue' : pullRequest.draft ? 'draft' : 'open',
      pullRequest.mergeQueued ? 'orange' : pullRequest.draft ? 'dim' : 'good',
    );
    link.createSpan({ text: pullRequest.title, cls: 'linear-prs-title-text' });
    const controls = top.createSpan({ cls: 'linear-prs-actions linear-prs-controls' });
    this.renderPullRequestActions(pullRequest, controls);
    renderPullRequestBadges(pullRequest, controls);
    this.renderPullRequestMetadata(pullRequest, row);
  }

  private renderPullRequestActions(
    pullRequest: PullRequest,
    controls: HTMLElement,
  ): void {
    const metadata = this.plugin.metadata;
    const remove = controls.createSpan({ cls: 'linear-prs-control-set' });
    createIconButton(
      remove,
      'Close and remove pull request',
      'trash-2',
      () =>
        void this.runAction(async () => {
          await closePr(this.plugin.credentials(), pullRequest);
          metadata.hidden.push(pullRequest.id);
          await this.plugin.saveMetadata();
        }, 'Closed and removed PR'),
    );
    const review = controls.createSpan({ cls: 'linear-prs-control-set' });
    createIconButton(
      review,
      'Add to review message',
      'copy',
      () =>
        void this.runAction(async () => {
          if (!metadata.reviewMessage.includes(pullRequest.id)) {
            metadata.reviewMessage.push(pullRequest.id);
          }
          await this.plugin.saveMetadata();
          await navigator.clipboard.writeText(
            formatReviewMessage(
              metadata.reviewMessage
                .map((id) => metadata.pullRequests.find((x) => x.id === id))
                .filter((x): x is PullRequest => !!x),
            ),
          );
        }, 'Added to review message'),
    );
    for (const stage of STAGES) {
      createIconButton(
        review,
        `Staging ${stage}`,
        stage,
        () =>
          void this.runAction(
            () =>
              this.setStage(
                metadata.reviewTypes[pullRequest.id] === stage ? 'none' : stage,
                [pullRequest],
              ),
            'Updated staging',
          ),
        { active: metadata.reviewTypes[pullRequest.id] === stage },
      );
    }
  }

  private renderPullRequestMetadata(pullRequest: PullRequest, row: HTMLElement): void {
    const meta = row.createDiv({ cls: 'linear-prs-meta' });
    const refs = meta.createSpan({ cls: 'linear-prs-meta-link' });
    if (pullRequest.issueTitle && pullRequest.issueUrl) {
      const issue = refs.createEl('a', {
        text: pullRequest.issueTitle,
        href: pullRequest.issueUrl,
        cls: 'linear-prs-issue-title',
      });
      issue.setAttr('target', '_blank');
      issue.setAttr('title', pullRequest.issueTitle);
    }
    const a = refs.createEl('a', { href: pullRequest.url, cls: 'linear-prs-meta-link' });
    a.setAttr('target', '_blank');
    a.createSpan({ text: pullRequest.repo, cls: 'linear-prs-pill' });
    a.createSpan({ text: `#${pullRequest.number}`, cls: 'linear-prs-pill' });
    meta.createSpan({
      text: formatOpenedDate(pullRequest.createdAt),
      cls: 'linear-prs-date',
    });
  }
  private renderGroup(
    pullRequests: PullRequest[],
    id: string,
    title: string,
    url: string,
    parent: HTMLElement,
  ) {
    const fetchPullRequest = parent.createEl('details', { cls: 'linear-prs-group' });
    this.rememberCollapse(fetchPullRequest, id);
    const summary = fetchPullRequest.createEl('summary', {
      cls: 'linear-prs-group-header',
    });
    createIcon(summary, 'chevron-down', undefined, 'linear-prs-chevron');
    if (url) {
      const titleLink = summary.createEl('a', {
        text: title,
        href: url,
        cls: 'linear-prs-group-title',
      });
      titleLink.setAttr('target', '_blank');
      titleLink.onclick = (e) => e.stopPropagation();
    } else {
      summary.createSpan({ text: title, cls: 'linear-prs-group-title' });
    }
    const actions = summary.createSpan({ cls: 'linear-prs-actions' });
    actions.createSpan({ text: String(pullRequests.length), cls: 'linear-prs-count' });
    const refresh = createIconButton(
      actions,
      `Refresh ${title}`,
      'refresh-cw',
      () => void this.refreshGroup(id, url, title),
      { loading: this.refreshingGroups.has(id) ? 'spin' : undefined },
    );
    if (this.busy || (this.refreshingGroups.size && !this.refreshingGroups.has(id))) {
      refresh.disabled = true;
    }
    createIconButton(
      actions,
      'Copy group PRs',
      'copy',
      () => void this.copyToClipboard(formatReviewMessage(pullRequests)),
    );
    createIconButton(
      actions,
      'Launch group PRs',
      'rocket',
      () => void this.launchMany(pullRequests),
      { loading: this.isLaunching(pullRequests) ? 'pulse' : undefined },
    );
    const reviewers = this.plugin.settings.favoriteReviewers
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (reviewers.length) {
      const select = actions.createEl('select', {
        cls: 'linear-prs-reviewer-select',
        attr: { 'aria-label': 'Assign reviewer to group PRs' },
      });
      select.createEl('option', { text: 'Reviewer', value: '' });
      for (const login of reviewers) {
        select.createEl('option', { text: login, value: login });
      }
      select.onclick = (e) => e.stopPropagation();
      select.onchange = () => {
        const login = select.value;
        if (!login) {
          return;
        }
        void this.runAction(async () => {
          for (const pullRequest of pullRequests) {
            await requestReviewer(this.plugin.credentials(), pullRequest, login);
          }
        }, `Requested ${login} for ${pullRequests.length} PRs`);
        select.value = '';
      };
    }
    const list = fetchPullRequest.createDiv({ cls: 'linear-prs-list' });
    pullRequests.forEach((pullRequest) => this.renderPullRequest(pullRequest, list));
  }
  private render() {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('linear-prs');
    const metadata = this.plugin.metadata;
    const shell = root.createDiv({ cls: 'linear-prs-shell' });
    this.renderToolbar(shell);
    if (!this.plugin.settings.linearKey || !this.plugin.settings.githubKey) {
      shell.createDiv({
        text: 'Add a Linear API key and GitHub API key in Linear PRs settings, then refresh.',
        cls: 'linear-prs-empty',
      });
    }
    this.renderReviewMessage(shell);
    const all = this.getVisiblePullRequests();
    if (!this.archived) {
      for (const stage of STAGES) {
        this.renderStagingSection(
          all.filter((pullRequest) => metadata.reviewTypes[pullRequest.id] === stage),
          `Staging ${stage}`,
          stage,
          shell,
        );
      }
    }
    shell.createEl('h2', {
      text: this.archived ? 'Archived pull requests' : 'Pull requests',
      cls: 'linear-prs-section-title',
    });
    const unstagedPullRequests = this.archived
      ? all
      : all.filter(
          (pullRequest) => (metadata.reviewTypes[pullRequest.id] ?? 'none') === 'none',
        );
    this.renderIssueGroups(unstagedPullRequests, shell);
    this.renderUnlinkedPullRequests(unstagedPullRequests, shell);
  }

  private renderToolbar(shell: HTMLElement): void {
    const metadata = this.plugin.metadata;
    const header = shell.createDiv({ cls: 'linear-prs-header' });
    const right = header.createSpan({ cls: 'linear-prs-toolbar' });
    const repos = [
      ...new Set(metadata.pullRequests.map((pullRequest) => pullRequest.repo)),
    ].sort();
    if (repos.length) {
      const filter = right.createSpan({ cls: 'linear-prs-repository-filter' });
      createIcon(filter, 'folder-git-2');
      const sel = filter.createEl('select', {
        attr: { 'aria-label': 'Filter repository' },
      });
      sel.createEl('option', { text: 'All repositories', value: '' });
      repos.forEach((r) => sel.createEl('option', { text: r, value: r }));
      sel.value = metadata.selectedRepo;
      sel.onchange = () => {
        metadata.selectedRepo = sel.value;
        void this.plugin.saveMetadata();
        this.render();
      };
    }
    const shortcutLabel = Platform.isMacOS ? '⌘F' : 'Ctrl+F';
    const search = right.createEl('input', {
      cls: 'linear-prs-search',
      attr: {
        type: 'search',
        placeholder: 'Search pull requests…',
        'aria-label': 'Search pull requests',
        title: `Search pull requests (${shortcutLabel})`,
      },
    });
    search.value = this.search;
    this.searchInput = search;
    search.oninput = () => {
      this.search = search.value;
      const start = search.selectionStart;
      this.render();
      this.searchInput?.focus();
      this.searchInput?.setSelectionRange(start, start);
    };
    search.onkeydown = (event) => {
      if (event.key === 'Escape' && search.value) {
        event.stopPropagation();
        this.search = '';
        this.render();
        this.searchInput?.focus();
      }
    };
    createIconButton(
      right,
      'Archived pull requests',
      'archive',
      () => {
        this.archived = !this.archived;
        this.render();
      },
      { active: this.archived },
    );
    const refresh = createIconButton(
      right,
      'Refresh from Linear and GitHub',
      'refresh-cw',
      () => void this.refresh(),
      { loading: this.busy ? 'spin' : undefined },
    );
    if (this.refreshingGroups.size) {
      refresh.disabled = true;
    }
  }

  private renderIssueGroups(
    unstagedPullRequests: PullRequest[],
    shell: HTMLElement,
  ): void {
    const groups = new Map<string, PullRequest[]>();
    for (const pullRequest of unstagedPullRequests.filter(
      (pullRequest) => pullRequest.groupId !== 'unlinked',
    )) {
      const groupPullRequests = groups.get(pullRequest.groupId) ?? [];
      groupPullRequests.push(pullRequest);
      groups.set(pullRequest.groupId, groupPullRequests);
    }
    for (const pullRequests of groups.values()) {
      const pullRequest = pullRequests[0];
      this.renderGroup(
        pullRequests,
        pullRequest.groupId,
        pullRequest.groupTitle.replace(/^[A-Z]+-\d+\s+/, ''),
        pullRequest.groupUrl,
        shell,
      );
    }
    if (!groups.size) {
      shell.createDiv({
        text: 'No pull requests associated with Linear tasks',
        cls: 'linear-prs-empty',
      });
    }
  }

  private renderUnlinkedPullRequests(
    unstagedPullRequests: PullRequest[],
    shell: HTMLElement,
  ): void {
    const unlinked = unstagedPullRequests.filter(
      (pullRequest) => pullRequest.groupId === 'unlinked',
    );
    const unlinkedDetails = shell.createEl('details', {
      cls: 'linear-prs-group linear-prs-unlinked-group',
    });
    this.rememberCollapse(unlinkedDetails, 'section:unlinked');
    const unlinkedSummary = unlinkedDetails.createEl('summary', {
      cls: 'linear-prs-group-header',
    });
    createIcon(unlinkedSummary, 'chevron-down', undefined, 'linear-prs-chevron');
    unlinkedSummary.createSpan({
      text: 'Pull requests without Linear tasks',
      cls: 'linear-prs-group-title',
    });
    unlinkedSummary.createSpan({
      text: String(unlinked.length),
      cls: 'linear-prs-count',
    });
    const list = unlinkedDetails.createDiv({ cls: 'linear-prs-unlinked-list' });
    if (unlinked.length) {
      unlinked.forEach((pullRequest) => this.renderPullRequest(pullRequest, list));
    } else {
      list.createDiv({
        text: 'No pull requests without Linear tasks',
        cls: 'linear-prs-empty',
      });
    }
  }
}
