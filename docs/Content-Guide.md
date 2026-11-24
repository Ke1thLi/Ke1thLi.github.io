# Content guide

Write posts in `src/content/posts/` and projects in `src/content/projects/`. Start with the bundled examples. A post requires title, description, slug, publication date and type. Category is optional. Use tags to link related posts and list project IDs under `projects` to connect an article to a project. Project IDs derive from filenames. Keep a published slug stable.

Set `draft: true` to exclude a post from public routes, collections, feeds, sitemap and Pagefind. Store unpublished personal material in the Git-ignored `_local-drafts/` folder. Preview static search after a build.

Reading time combines CJK characters at 400 per minute and other word tokens at 220 per minute, then rounds up with a one-minute minimum. Fenced and four-space/tab-indented code lines are excluded. H2 through H4 build the article TOC. Use fenced `mermaid` blocks for diagrams, dollar signs for inline math, and pairs of dollar signs on their own lines for block math.

Related articles favor shared projects, then shared tags and categories. Up to three matches are shown. The article itself and drafts are excluded.
