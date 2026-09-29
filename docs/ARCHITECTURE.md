# Architecture

`src/main.ts` registers the plugin, loads settings and metadata, and coordinates refreshes. `src/preferences.ts` owns the settings tab.

`src/types.ts` describes Linear issues and normalized pull requests. `src/metadata.ts` owns board state, defaults, and migration. The existing `reviewTypes` key remains stable on disk, with values `none`, `A`, `B`, `C`, and `D`.

The API modules have separate responsibilities:

- `transport.ts`: Obsidian HTTP requests and Linear GraphQL errors.
- `responses.ts`: consumed GitHub response fields.
- `linear.ts`: issue and attachment queries with pagination.
- `github.ts`: pull request details, checks, reviewers, merge queues, and write actions.
- `snapshots.ts`: batched GitHub GraphQL status reads, with pagination only when a connection has more results. Row and scoped refreshes use these snapshots and preserve Linear associations.
- `rebase.ts`: branch comparison and guarded GitHub rebase requests during launch.
- `discovery.ts`: joins Linear issue trees and GitHub PRs, deduplicates results, and refreshes subsets.

`src/pull-request-matching.ts` contains pure link and issue-reference matching. `src/async.ts` provides bounded workers and deadlines. A deadline stops waiting; it does not cancel an already dispatched HTTP request.

`src/ui/board-view.ts` owns transient view state and rendering. Toolbar, groups, staging sections, row actions, and row metadata have separate rendering methods. `src/ui/elements.ts` contains DOM helpers; `src/ui/pull-request-badges.ts` renders status badges.

Tests bundle with esbuild and mock only Obsidian's HTTP boundary. They run without an Obsidian install or live credentials. Production bundles leave Obsidian external. `styles.css` is generated from `src/styles.source.css`.

Row refresh reads one snapshot, updates the branch if possible, and reads again only after an attempted update. Rebase verification waits for a changed head before repeating the base comparison. Bulk launch uses three concurrent workers and reuses the verified remote PR response.
