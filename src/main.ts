import { dailyMerges } from './merge-activity';
import { fetchSnapshots } from './api/snapshots';
import { rebasePullRequest } from './api/rebase';
import { Plugin, Notice } from 'obsidian';
import { discover, refreshPrs } from './api/discovery';
import type { PullRequest } from './types';
import {
  BOARD_VIEW_TYPE,
  METADATA_PATH,
  DEFAULT_SETTINGS,
  createEmptyMetadata,
  migrateMetadata,
  type Settings,
  type Metadata,
} from './metadata';
import { withDeadline } from './async';
import { errorMessage } from './ui/elements';
import { Preferences } from './preferences';
import { BoardView } from './ui/board-view';
import { DiffView, DIFF_VIEW_TYPE } from './ui/diff-view';
export default class LinearPrsPlugin extends Plugin {
  settings: Settings = DEFAULT_SETTINGS;
  metadata: Metadata = createEmptyMetadata();
  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
    await this.loadMetadata();
    this.registerView(DIFF_VIEW_TYPE, (leaf) => new DiffView(leaf, this));
    this.registerView(BOARD_VIEW_TYPE, (leaf) => new BoardView(leaf, this));
    this.addRibbonIcon('git-pull-request', 'Linear PRs', () => void this.openBoard());
    this.addCommand({
      id: 'open-linear-prs',
      name: 'Open Linear PRs',
      callback: () => void this.openBoard(),
    });
    this.addCommand({
      id: 'search-pull-requests',
      name: 'Search pull requests',
      callback: () => this.app.workspace.getActiveViewOfType(BoardView)?.focusSearch(),
    });
    this.addSettingTab(new Preferences(this.app, this));
  }
  async openBoard() {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: BOARD_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  async openPullRequestDiff(pullRequest: PullRequest) {
    try {
      const leaf = this.app.workspace.openPopoutLeaf();
      await leaf.setViewState({
        type: DIFF_VIEW_TYPE,
        active: true,
        state: { pullRequestId: pullRequest.id },
      });
      await this.app.workspace.revealLeaf(leaf);
    } catch (error) {
      new Notice(`Could not open PR diff: ${errorMessage(error)}`, 8000);
    }
  }
  async loadMetadata() {
    const adapter = this.app.vault.adapter;
    if (await adapter.exists(METADATA_PATH)) {
      try {
        this.metadata = migrateMetadata(JSON.parse(await adapter.read(METADATA_PATH)));
        await this.saveMetadata();
      } catch (e) {
        new Notice(`Linear PRs metadata: ${errorMessage(e)}`);
      }
    }
  }
  async saveMetadata(options: { refreshBoards?: boolean } = {}) {
    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists('.linear-prs'))) {
      await adapter.mkdir('.linear-prs');
    }
    await adapter.write(METADATA_PATH, JSON.stringify(this.metadata, null, 2) + '\n');
    if (options.refreshBoards) {
      for (const leaf of this.app.workspace.getLeavesOfType(BOARD_VIEW_TYPE)) {
        if (leaf.view instanceof BoardView) {
          leaf.view.render();
        }
      }
    }
    for (const leaf of this.app.workspace.getLeavesOfType(DIFF_VIEW_TYPE)) {
      if (leaf.view instanceof DiffView) {
        leaf.view.renderControls();
      }
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  private refreshTask: ReturnType<LinearPrsPlugin['refreshBoard']> | null = null;

  refresh() {
    // Keep this shared until the actual work finishes; a UI timeout must not start
    // a second discovery while the first is still dispatching requests.
    if (!this.refreshTask) {
      this.refreshTask = this.refreshBoard().finally(() => {
        this.refreshTask = null;
      });
    }
    return this.refreshTask;
  }

  private async refreshBoard() {
    if (!this.settings.linearKey || !this.settings.githubKey) {
      throw new Error('Enter both API keys in Linear PRs settings.');
    }
    const result = await discover(this.settings);
    const updated = new Set(result.prs.map((pullRequest) => pullRequest.id));
    this.metadata.pullRequests = [
      ...result.prs,
      ...this.metadata.pullRequests.filter(
        (pullRequest) =>
          this.metadata.hidden.includes(pullRequest.id) && !updated.has(pullRequest.id),
      ),
    ];
    this.metadata.mergeActivity = dailyMerges(result.mergedDates);
    this.metadata.lastRefresh = new Date().toISOString();
    await this.saveMetadata();
    return result;
  }
  async refreshGroup(groupId: string) {
    if (!this.settings.linearKey || !this.settings.githubKey) {
      throw new Error('Enter both API keys in Linear PRs settings.');
    }
    const previous = this.metadata.pullRequests.filter(
      (pullRequest) => pullRequest.groupId === groupId,
    );
    const prs = await withDeadline(
      refreshPrs(this.credentials(), previous),
      30000,
      'Group refresh',
    );
    const result = { prs, errors: [] as string[] };
    const updated = new Set(result.prs.map((pullRequest) => pullRequest.id));
    this.metadata.pullRequests = [
      ...result.prs,
      ...this.metadata.pullRequests.filter(
        (pullRequest) =>
          !updated.has(pullRequest.id) &&
          (pullRequest.groupId !== groupId ||
            this.metadata.hidden.includes(pullRequest.id)),
      ),
    ];
    await this.saveMetadata();
    return result;
  }
  async refreshSelectedPrs(prs: PullRequest[]) {
    if (!this.settings.githubKey) {
      throw new Error('Enter a GitHub API key in Linear PRs settings.');
    }
    const result = await withDeadline(
      refreshPrs(this.credentials(), prs),
      30000,
      'Pull request refresh',
    );
    const selected = new Set(prs.map((pullRequest) => pullRequest.id));
    this.metadata.pullRequests = [
      ...result,
      ...this.metadata.pullRequests.filter(
        (pullRequest) => !selected.has(pullRequest.id),
      ),
    ];
    await this.saveMetadata();
    return result;
  }
  async refreshPullRequest(pullRequest: PullRequest) {
    if (!this.settings.githubKey) {
      throw new Error('Enter a GitHub API key in Linear PRs settings.');
    }
    const [snapshot] = await fetchSnapshots(this.settings.githubKey, [pullRequest]);
    const branchUpdate = snapshot.pullRequest
      ? await rebasePullRequest(
          this.settings.githubKey,
          pullRequest.repo,
          snapshot.remote,
        )
      : undefined;
    // An unchanged branch needs no second status read. A rejected update may have
    // changed remotely before verification failed, so refresh that case too.
    const latest =
      branchUpdate && branchUpdate.status !== 'up-to-date'
        ? (await fetchSnapshots(this.settings.githubKey, [pullRequest]))[0]
        : snapshot;
    this.metadata.pullRequests = this.metadata.pullRequests.filter(
      (pr) => pr.id !== pullRequest.id,
    );
    if (latest.pullRequest) {
      this.metadata.pullRequests.push(latest.pullRequest);
    }
    await this.saveMetadata();
    return branchUpdate;
  }

  credentials() {
    return { linearKey: this.settings.linearKey, githubKey: this.settings.githubKey };
  }
}
