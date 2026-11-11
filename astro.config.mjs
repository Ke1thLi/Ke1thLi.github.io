import { defineConfig } from "astro/config";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const site = new URL(process.env.BLOG_SITE_URL ?? "https://ke1thli.github.io");
if (
  !["http:", "https:"].includes(site.protocol) ||
  site.pathname !== "/" ||
  site.search ||
  site.hash ||
  site.username ||
  site.password
) {
  throw new Error(
    "BLOG_SITE_URL must be an HTTP(S) origin. Set the deployment path with BLOG_BASE_PATH.",
  );
}

export default defineConfig({
  output: "static",
  site: site.origin,
  base: process.env.BLOG_BASE_PATH ?? "/",
  trailingSlash: "always",
  build: { format: "directory" },
  markdown: {
    syntaxHighlight: { type: "shiki", excludeLangs: ["mermaid", "math"] },
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      transformers: [
        {
          name: "code-language",
          pre(node) {
            node.properties["data-language"] = this.options.lang;
          },
        },
      ],
    },
  },
  integrations: [
    {
      name: "article-search",
      hooks: {
        "astro:build:done": async ({ dir, logger }) => {
          const pagefind = await import("pagefind");
          const { index, errors } = await pagefind.createIndex();
          try {
            if (!index || errors.length)
              throw new Error(errors.join("\n") || "Cannot initialize Pagefind");
            const path = fileURLToPath(dir);
            const result = await index.addDirectory({ path, glob: "posts/**/index.html" });
            if (result.errors.length) throw new Error(result.errors.join("\n"));
            const written = await index.writeFiles({ outputPath: join(path, "pagefind") });
            if (written.errors.length) throw new Error(written.errors.join("\n"));
            await writeFile(
              join(path, "pagefind", "article-count.json"),
              JSON.stringify(result.page_count),
            );
            logger.info(`Indexed ${result.page_count} public article(s)`);
          } finally {
            await pagefind.close();
          }
        },
      },
    },
    {
      name: "design-preview",
      hooks: {
        "astro:config:setup": ({ command, injectRoute }) => {
          if (command === "dev") {
            injectRoute({
              pattern: "/design-system/",
              entrypoint: "./src/design/Preview.astro",
            });
          }
        },
      },
    },
  ],
});
