# Code style

Run `npm run check` before committing and `npm run build` when changing source or styles. Commit generated `main.js` and `styles.css` so the plugin can be installed directly.

- Prettier owns formatting: two spaces, single quotes, semicolons, trailing commas, and a 90-column target. Use `npm run format`.
- Use braces around every conditional and loop. ESLint enforces braces, strict equality, type imports, unused variables, and no explicit `any`.
- Name functions for their action and variables for the values they hold. Prefer `pullRequest`, `metadata`, and `credentials` over single-letter names.
- Keep TypeScript strict. Describe consumed remote response fields in `src/api/responses.ts`; transport casts belong at the network boundary.
- Pass named options when a helper needs optional flags. Avoid positional booleans.
- Keep network calls, persistent state, and DOM rendering in their respective modules. Extract a function when a method contains independently meaningful steps; avoid creating classes for simple helpers.
- Preserve persisted metadata keys and migrate old values explicitly. Cover migrations and API behavior with regression tests.
- Catch failures where they can be reported or recovered. Preserve partial refresh errors and launch results rather than silently treating failures as success.
- Use Obsidian theme variables for styling and keep source CSS readable. Edit `src/styles.source.css`, then rebuild.
