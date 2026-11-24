# Getting started

Install the Node and npm versions in [package.json](../package.json), run `npm ci` and `npm run dev`, and open the local URL printed by Astro. Change the [site settings](../site.config.mjs) first. Replace the included posts and projects using the [content guide](Content-Guide.md).

For a static host, set the site origin and base, run `npm run build`, preview the result, and publish `dist/`. A root site uses `/`. A project site may use `/my-blog/`. The hostname belongs in the URL field and the directory belongs in the base field.

## Deploy to GitHub Pages

Use `deployment.origin` for your Pages origin, such as `https://username.github.io`. Use `deployment.base: "/"` for the root site or `deployment.base: "/repository-name/"` for a project site. Run the build and preview the site at that base. Verify article links, the search index, RSS and sitemap before publishing.

In your own repository, select GitHub Actions as the Pages source and follow Astro's Pages workflow instructions. The workflow builds and uploads `dist/` as a Pages artifact, then deploys it to Pages. Keep the included CI workflow for validation. [Astro Pages guide](https://docs.astro.build/en/guides/deploy/github/) · [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
