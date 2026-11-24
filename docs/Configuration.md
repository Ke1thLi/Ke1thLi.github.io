# Configuration

Edit [site.config.mjs](../site.config.mjs). The resolver applies theme defaults, site settings, then environment overrides. Astro and the rendered site use the same resolved configuration.

| Group        | Settings                                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `site`       | Title, description, BCP 47 language, and `author: { name, url? }`                                                                                     |
| `deployment` | HTTP(S) `origin` with no path, and `base` such as `/` or `/notes/`                                                                                    |
| `assets`     | Optional `avatar`, `favicon`, `socialCard`, and `heroBackground`                                                                                      |
| `social`     | Optional HTTP(S) `github`; `rss` defaults to the built-in feed                                                                                        |
| `navigation` | Groups with a `label` and `links`, each with `label`, `href`, and optional `icon`. An empty href means home                                           |
| `home`       | Introduction, optional `technicalFocus`, and counts for recent posts, featured posts, and featured projects. Set a count to zero to hide that section |
| `appearance` | `defaultTheme` of system/light/dark, `fontSource` of system/google, optional hex `accentColor`, and optional CSS `fontFamily`                         |
| `features`   | Set `search: false` to remove the index and palette. `/search/` continues to link to the articles list                                                |

Resource and internal navigation paths resolve under the deployment base. Store local images under `public/` and refer to them without the base prefix. External links use complete HTTP(S) URLs. Available navigation icons are listed in [the config types](../src/config/types.ts).

Navigation appends a slash to page paths and preserves common file extensions such as `.xml`, `.json`, and `.txt`. Use `kind: "file"` for an extensionless file or an extension the resolver does not recognize. Use `kind: "page"` for a route whose last segment looks like a file. Paths can include a query or fragment. A standalone query or fragment applies to the current page.

`BLOG_SITE_URL`, `BLOG_BASE_PATH`, `BLOG_GITHUB_URL`, and `BLOG_RSS_URL` override the corresponding fields. An empty social override hides its navigation link. The built-in feed stays at `/rss.xml` under the base and remains discoverable.

`/index.xml` serves the same full-text feed. Open `/search/?q=term` or `/search/?keyword=term` to prefill search.

The default origin is `https://preview.invalid`, which marks the preview pages `noindex`. Set the public origin before hosting. At a subpath such as `/notes/`, open the matching path in Astro preview.

The production build indexes all public articles using the tokenizer for `site.lang`. When the primary tokenizer is not Chinese and article pages contain Han text, the build adds a Chinese-tokenized index of the same articles. Queries containing Han characters, including mixed text, use that index when available. The same query has the same scope from every page.

The system font stack makes no external font request. The Google option requests Inter, Noto Sans SC, and JetBrains Mono from Google Fonts. Review their font licenses before redistributing files as part of a self-hosted setup.
