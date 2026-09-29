# Architecture

`src/main.ts` registers the plugin, loads settings and metadata, and coordinates refreshes. `src/preferences.ts` owns the settings tab.

`src/types.ts` describes Linear issues and normalized pull requests. `src/metadata.ts` owns board state, defaults, and migration. The existing `reviewTypes` key remains stable on disk, with values `none`, `A`, `B`, and `C`.

The API modules have separate responsibilities:

- `transport.ts`: Obsidian HTTP requests and Linear GraphQL errors.
- `responses.ts`: consumed GitHub response fields.
- `linear.ts`: issue and attachment queries with pagination.
- `github.ts`: pull request details, checks, reviewers, merge queues, and write actions.
- `discovery.ts`: joins Linear issue trees and GitHub PRs, deduplicates results, and refreshes subsets.

`src/pull-request-matching.ts` contains pure link and issue-reference matching. `src/async.ts` provides bounded workers and deadlines. A deadline stops waiting; it does not cancel an already dispatched HTTP request.

`src/ui/board-view.ts` owns transient view state and rendering. Toolbar, groups, staging sections, row actions, and row metadata have separate rendering methods. `src/ui/elements.ts` contains DOM helpers; `src/ui/pull-request-badges.ts` renders status badges.

Tests bundle with esbuild and mock only Obsidian's HTTP boundary. They run without an Obsidian install or live credentials. Production bundles leave Obsidian external. `styles.css` is generated from `src/styles.source.css`.
