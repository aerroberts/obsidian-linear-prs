# Linear PRs for Obsidian

An Obsidian view modeled on the `plz` `/code` page. It finds open Linear issues assigned to the Linear API key owner, follows child issues, and groups open GitHub PRs by the deepest issue that owns each PR. It shows review and stamp queues, a copyable review message, GitHub checks, reviewers, comments, and automerge state. Board tracking persists in `.linear-prs/metadata.json` in the vault.

## Install

Copy `manifest.json`, `main.js`, and `styles.css` into `<vault>/.obsidian/plugins/obsidian-linear-prs/`. Enable **Linear PRs** in Obsidian's Community plugins. In its settings, enter a Linear personal API key and a GitHub personal access token with read access to the linked repositories. GitHub write access is needed for launch, reviewer assignment, and close actions. Use the ribbon icon or the **Open Linear PRs** command.

To build after changes, run `npm install && npm run build`. The repository includes the built `main.js` for direct installation.

The keys are stored in Obsidian plugin settings at `.obsidian/plugins/obsidian-linear-prs/data.json`. The vault metadata file contains PR state and UI tracking but no keys. If your vault syncs, treat plugin settings accordingly.

## Discovery and actions

The plugin reads GitHub PR URLs attached to Linear issues. It also searches GitHub for issue identifiers within repositories linked by those attachments, then checks each candidate's title, body, or branch for an exact identifier. It recursively follows child issues under open issues assigned to the authenticated Linear user. Each PR appears under the issue that links to it; a parent PR stays under its parent while child PRs form their own groups. Only open PRs appear on the active board.

Actions mirror the `/code` page: copy PRs, mark stamp or review, build a review message, launch PRs by marking drafts ready and enabling automerge, request a reviewer for a group, and close/remove a PR. The archived view shows PRs closed from this plugin. Refresh fetches current Linear and GitHub data while retaining local review state.
