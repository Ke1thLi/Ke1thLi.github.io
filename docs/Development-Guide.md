# Development guide

Use Node.js 24.22.1 and npm 11.19.1. Install with `npm ci`. Use `npm run dev` for development and `npm run build` followed by `npm run preview` for production behavior.

| Directory                         | Responsibility                                              |
| --------------------------------- | ----------------------------------------------------------- |
| `site.config.mjs`, `src/config/`  | User settings, config types, and build-time validation      |
| `src/layouts/`, `src/components/` | Page shell, navigation, content lists, and article controls |
| `src/pages/`                      | Static HTML routes and feed, sitemap, and robots endpoints  |
| `src/content/`, `src/lib/`        | Markdown, collection helpers, paths, and metadata           |
| `src/scripts/`                    | Browser behavior for search, navigation, and articles       |
| `src/styles/`, `src/design/`      | Shared tokens, responsive styles, and development specimens |
| `public/`                         | Assets served without transformation                        |
| `tests/`                          | Isolated content, config, routing, and reading-time checks  |

Keep styling in the existing token system and local component styles. Inspect [design rules](Design-System.md) and use `/design-system/` in development. Extend the existing routes and content helpers when adding features. Use native controls and check keyboard interactions before adding custom widgets.

Run `npm run check`, `npm run format:check`, `npm test`, and `npm run build`. CI runs the same checks. Routing tests build isolated fixtures for root and subpath deployment. Use production preview for Pagefind. For changes to interactive components, verify keyboard focus, both themes, and narrow layouts in Chrome, Edge, and Firefox. Keep temporary posts and projects in isolated fixtures.
