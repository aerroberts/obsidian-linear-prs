# Linear PRs for Obsidian

An Obsidian board for Linear issues and GitHub pull requests. It reads all open pull requests authored by the GitHub API key owner, including drafts and merge-queue entries, then resolves their Linear context in batches. Associated PRs group under the issue's immediate parent, or its project when it has no parent. A bottom section lists open PRs authored by the GitHub API key owner that have no Linear task association. It shows Staging A, B, C, and D queues, a copyable review message, GitHub checks, reviewers, comments, and automerge state. Board tracking persists in `.linear-prs/metadata.json` in the vault.

## Install

Copy `manifest.json`, `main.js`, and `styles.css` into `<vault>/.obsidian/plugins/obsidian-linear-prs/`. Enable **Linear PRs** in Obsidian's Community plugins. In its settings, enter a Linear personal API key and a GitHub personal access token with read access to the linked repositories. GitHub write access is needed for launch, reviewer assignment, and close actions. Use the ribbon icon or the **Open Linear PRs** command.

To build after changes, run `npm install && npm run build`. The repository includes the built `main.js` for direct installation.

The keys are stored in Obsidian plugin settings at `.obsidian/plugins/obsidian-linear-prs/data.json`. The vault metadata file contains PR state and UI tracking but no keys. If your vault syncs, treat plugin settings accordingly.

## Discovery and actions

Opening or reloading the board displays saved data without network requests. Refresh runs only through explicit toolbar, group, or row controls; shipping refreshes status as part of that action.

A full refresh uses one GitHub GraphQL search operation to read your open PRs and their status, then batches Linear `attachmentsForURL` lookups with the full issue and parent/project context. Attachments take precedence over identifiers in PR titles, bodies, and branches; identifiers provide a fallback when there is no attachment. Issues outside your assigned tree and archived issues can still provide context. Multiple attached issues are retained, with a deterministic primary issue for grouping. PRs with no match stay visible in the unlinked section.

Existing group refresh reads the group's cached PR identities in one GitHub GraphQL query and retains their Linear context. Full refresh discovers new PRs and recomputes associations. Shipping also reads its group in one query, reuses those snapshots for actions, and reads the resulting status in one query afterward. Rebase comparisons, guarded writes, and asynchronous verification are separate API operations. GraphQL connections use cursor pagination only when needed; account search and scoped reads use pages of up to 100 PRs. Failed or truncated reads retain the cached board instead of silently marking PRs unlinked. Check summaries are included; individual check annotations are omitted from bulk reads to stay within GitHub's resource limits.

Board actions: copy PRs, move PRs between Staging A, B, C, and D, build a review message, launch PRs by requesting a rebase onto the base branch when needed, marking drafts ready, and enabling automerge, request a reviewer for a group, and close/remove a PR. The archived view shows PRs closed from this plugin. The toolbar refresh updates the whole board; each group header also has a refresh button that reloads only that group's existing PRs. Refresh retains local staging state.

## Development

Run `npm ci`, `npm run check`, and `npm run build`. Use `npm run format` to apply formatting and `npm run dev` while developing. Generated `main.js` and `styles.css` are committed for direct installation.

Read the [code style](docs/CODE_STYLE.md), [architecture](docs/ARCHITECTURE.md), and [PR guidelines](docs/PR_STYLE.md) before contributing. Regression tests use mocked HTTP responses and do not access live accounts.

Launch uses GitHub’s branch update API with the rebase method. It compares against the current base branch and verifies that the PR’s head changes and is no longer behind before reporting a completed rebase. Branches already up to date are skipped. Conflicts, permissions, or uncompleted rebases appear in a persistent launch notice while the remaining launch actions continue. A failed rebase is excluded from the successful launch count.

Each PR row groups controls as trash, refresh, and copy; staging A/B/C/D; then status badges. The row refresh fetches only that PR’s latest GitHub state, attempts a rebase when needed, and reloads its checks and status afterward. It preserves draft state, auto-merge settings, and local staging assignments.

Linked Linear issues appear beneath each PR as ID pills (for example, ENG-4781), with the issue title in the tooltip. Search matches all linked issue IDs. Press Enter to save a search; the ten most recent searches are offered as suggestions and persist in vault metadata.

The compact toolbar chart shows your authored PR merges by local day over the last 14 days, across all repositories. Hover a bar for its date and count. Full refresh reads merge activity alongside open PRs in the same GitHub operation; reopening the view uses the saved chart.
