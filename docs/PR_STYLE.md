# Pull requests

Create pull requests in draft mode. Mark them ready only when a human asks.

Use a clean title describing the resulting change. Keep Linear issue identifiers out of titles; link PRs from Linear itself.

Lead descriptions with the problem and resulting behavior. Explain material migration or compatibility choices and list the checks actually run. Mention limits of validation when relevant. Keep descriptions focused on the final implementation.

Before pushing, run `npm run check` and `npm run build`. Include generated plugin assets when source changes affect them. Do not commit API keys, vault metadata, or plugin settings.
