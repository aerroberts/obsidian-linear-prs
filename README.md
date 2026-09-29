# Linear PRs for Obsidian

An Obsidian board for Linear issues and GitHub pull requests. It finds open Linear issues assigned to the Linear API key owner, follows child issues, and groups open GitHub PRs by each issue's immediate parent. A bottom section lists open PRs authored by the GitHub API key owner that have no Linear task association. It shows Staging A, B, and C queues, a copyable review message, GitHub checks, reviewers, comments, and automerge state. Board tracking persists in `.linear-prs/metadata.json` in the vault.

## Install

Copy `manifest.json`, `main.js`, and `styles.css` into `<vault>/.obsidian/plugins/obsidian-linear-prs/`. Enable **Linear PRs** in Obsidian's Community plugins. In its settings, enter a Linear personal API key and a GitHub personal access token with read access to the linked repositories. GitHub write access is needed for launch, reviewer assignment, and close actions. Use the ribbon icon or the **Open Linear PRs** command.

To build after changes, run `npm install && npm run build`. The repository includes the built `main.js` for direct installation.

The keys are stored in Obsidian plugin settings at `.obsidian/plugins/obsidian-linear-prs/data.json`. The vault metadata file contains PR state and UI tracking but no keys. If your vault syncs, treat plugin settings accordingly.

## Discovery and actions

The plugin reads GitHub PR URLs attached to Linear issues. It lists open PRs once per repository linked by those attachments, then matches issue identifiers in each PR's title, body, or branch. It recursively follows child issues under open issues assigned to the authenticated Linear user. Each associated PR appears under its issue's immediate parent; PRs on issues without a parent use their Linear project. The plugin also searches for open PRs authored by the authenticated GitHub user across accessible repositories and puts PRs with no Linear attachment or issue reference in an ungrouped section at the bottom. Only open PRs appear on the active board.

Board actions: copy PRs, move PRs between Staging A, B, and C, build a review message, launch PRs by requesting a rebase onto the base branch when needed, marking drafts ready, and enabling automerge, request a reviewer for a group, and close/remove a PR. The archived view shows PRs closed from this plugin. The toolbar refresh updates the whole board; each group header also has a refresh button that reloads only that group's Linear issues and linked PRs. Refresh retains local staging state.

## Development

Run `npm ci`, `npm run check`, and `npm run build`. Use `npm run format` to apply formatting and `npm run dev` while developing. Generated `main.js` and `styles.css` are committed for direct installation.

Read the [code style](docs/CODE_STYLE.md), [architecture](docs/ARCHITECTURE.md), and [PR guidelines](docs/PR_STYLE.md) before contributing. Regression tests use mocked HTTP responses and do not access live accounts.

Launch uses GitHub’s branch update API with the rebase method. It compares against the current base branch and verifies that the PR’s head changes and is no longer behind before reporting a completed rebase. Branches already up to date are skipped. Conflicts, permissions, or uncompleted rebases appear in a persistent launch notice while the remaining launch actions continue. A failed rebase is excluded from the successful launch count.
