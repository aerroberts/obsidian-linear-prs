import type { App } from 'obsidian';
import { PluginSettingTab, Setting } from 'obsidian';
import type LinearPrsPlugin from './main';
export class Preferences extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: LinearPrsPlugin,
  ) {
    super(app, plugin);
  }
  display() {
    const container = this.containerEl;
    container.empty();
    container.createEl('h2', { text: 'Linear PRs' });
    new Setting(container)
      .setName('Linear API key')
      .setDesc('Personal API key for your Linear account.')
      .addText((input) => {
        input
          .setPlaceholder('lin_api_…')
          .setValue(this.plugin.settings.linearKey)
          .onChange(async (value) => {
            this.plugin.settings.linearKey = value.trim();
            await this.plugin.saveSettings();
          });
        input.inputEl.type = 'password';
      });
    new Setting(container)
      .setName('GitHub API key')
      .setDesc('Personal access token with access to the linked repositories.')
      .addText((input) => {
        input
          .setPlaceholder('github_pat_…')
          .setValue(this.plugin.settings.githubKey)
          .onChange(async (value) => {
            this.plugin.settings.githubKey = value.trim();
            await this.plugin.saveSettings();
          });
        input.inputEl.type = 'password';
      });
    new Setting(container)
      .setName('Favorite reviewers')
      .setDesc('Comma separated GitHub usernames shown in group actions.')
      .addText((input) =>
        input
          .setPlaceholder('alice,bob')
          .setValue(this.plugin.settings.favoriteReviewers)
          .onChange(async (value) => {
            this.plugin.settings.favoriteReviewers = value;
            await this.plugin.saveSettings();
          }),
      );
    container.createEl('p', {
      text: 'Keys are saved in Obsidian plugin settings; board tracking is saved to .linear-prs/metadata.json in this vault.',
      cls: 'setting-item-description',
    });
  }
}
