# Architecture

`src/main.ts` registers the plugin, loads settings and metadata, and coordinates refreshes. `src/preferences.ts` owns the settings tab.

`src/types.ts` describes Linear issues and normalized pull requests. `src/metadata.ts` owns board state, defaults, and migration. The existing `reviewTypes` key remains stable on disk, with values `none`, `A`, `B`, `C`, `D`, `E`, and `F`. Optional section names live in `stageNames`, keyed by letter; older metadata defaults to empty names.

The API modules have separate responsibilities:

- `transport.ts`: Obsidian HTTP requests and Linear GraphQL errors. JSON reads and writes share one paced `request-queue.ts` lane per service. Safe reads retry bounded rate-limit and gateway failures; writes never replay automatically. The queue recognizes GitHub and Linear GraphQL throttles, honors reset headers, and retains service cooldowns between calls.
- `responses.ts`: consumed GitHub response fields.
- `linear.ts`: shared issue selection and pagination fields.
- `context.ts`: batched Linear attachment and identifier resolution. Attachments are authoritative; all matched issues and the association source are retained in `linearContext`, while the primary issue supplies existing group fields.
- `github.ts`: launch, reviewer, close, and branch-update actions. Launch can reuse the group snapshot.
- `snapshots.ts`: batched GitHub GraphQL status reads, with pagination only when a connection has more results. Account discovery, row refresh, group refresh, and shipping share snapshot normalization. Scoped refreshes preserve Linear context. Comment and thread pagination stops once a human comment is known; reviewer and check pagination remains complete. Snapshot and Linear-context batches contain at most 25 PRs. Bulk queries omit check annotations to avoid GitHub resource-limit errors.
- `rebase.ts`: branch comparison and guarded GitHub rebase requests during launch.
- `discovery.ts`: reads the authenticated GitHub author's open PR set, then resolves Linear context in batches. Scoped reads bypass discovery. Errors reject the replacement so persisted state survives failed refreshes.

`src/pull-request-matching.ts` contains pure link and issue-reference matching. `src/async.ts` provides bounded workers and deadlines. A deadline stops waiting; it does not cancel an already dispatched HTTP request. Full board refresh instead shares one promise until discovery actually completes, so a long refresh cannot time out and overlap a retry. Worker pools stop taking new items after an error.

`src/ui/board-view.ts` owns transient view state and rendering. Toolbar, groups, staging sections, row actions, and row metadata have separate rendering methods. `src/ui/elements.ts` contains DOM helpers; `src/ui/pull-request-badges.ts` renders status badges.

Tests bundle with esbuild and mock only Obsidian's HTTP boundary. They run without an Obsidian install or live credentials. Production bundles leave Obsidian external. `styles.css` is generated from `src/styles.source.css`.

Row refresh reads one snapshot, updates the branch if possible, and reads again only after an attempted update. Rebase verification waits for a changed head before repeating the base comparison. Bulk launch uses three concurrent workers and reuses the verified remote PR response.

`src/merge-activity.ts` builds a zero-filled 14-day local-calendar series. Full account discovery reads merge timestamps in the same GraphQL operation and persists the series; scoped actions leave it unchanged. The repository selector is removed, so legacy `selectedRepo` metadata no longer filters the board.

`src/ui/diff-view.ts` owns the desktop PR popout, restores its PR identity from view state, and renders the description with Obsidian's Markdown renderer followed by `review-diff.ts`'s diff2html side-by-side file views with bundled highlight.js languages. The header is outside the scrolling content, and the entire view inherits the board's `linear-prs` style scope. `src/api/diff.ts` loads description and raw diff concurrently; the raw-text HTTP boundary lives in `transport.ts`. Metadata saves refresh diff controls, and popout actions also refresh open boards. Request generations prevent closed or replaced views from rendering late responses.

`src/api/description-images.ts` resolves GitHub blob/raw image URLs through the authenticated contents API, including branch names containing slashes. Credentials are sent only to `api.github.com`; other image hosts use ordinary browser loading. Object URLs and deferred diff observers are released when the view closes or reloads. The build bundles diff2html CSS ahead of source overrides, with default variables scoped to the review window.
