import { createIndex, close } from "pagefind";
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { glob, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { siteConfig } from "./src/config/resolved-site.mjs";

/** @type {import("@astrojs/markdown-remark").RehypePlugin<[]>} */
const reservePageHeading = () => (tree) => {
  /** @type {import("hast").Element[]} */
  const headings = [];
  /** @param {import("hast").Root | import("hast").Element} parent */
  function collectHeadings(parent) {
    for (const node of parent.children) {
      if (node.type !== "element") continue;
      if (/^h[1-6]$/.test(node.tagName)) headings.push(node);
      collectHeadings(node);
    }
  }
  collectHeadings(tree);
  if (!headings.some(({ tagName }) => tagName === "h1")) return;

  // Reserve H1 for the page title without changing Astro's heading anchors.
  for (const heading of headings) {
    const level = Math.min(6, Number(heading.tagName[1]) + 1);
    heading.tagName = `h${level}`;
  }
};

const articlePages = "posts/**/index.html";
const unusedPagefindAssets = [
  "pagefind-component-ui.css",
  "pagefind-component-ui.js",
  "pagefind-highlight.js",
  "pagefind-modular-ui.css",
  "pagefind-modular-ui.js",
  "pagefind-ui.css",
  "pagefind-ui.js",
];

const elkCopyright = `/*! ELK.js
 * Copyright (c) 2017 Kiel University and others.
 * Copyright (c) 2021 Kiel University and others.
 * SPDX-License-Identifier: EPL-2.0 OR GPL-3.0-or-later
 * License and source: ../third-party/NOTICE.txt
 */`;

/** @param {string[]} moduleIds */
const containsElk = (moduleIds) => moduleIds.some((id) => /[/\\]elkjs[/\\]/.test(id));

/** @type {import("vite").Plugin} */
const elkDistributionNotice = {
  name: "elk-distribution-notice",
  apply: "build",
  augmentChunkHash({ moduleIds }) {
    return containsElk(moduleIds) ? elkCopyright : undefined;
  },
  generateBundle: {
    order: "post",
    handler(_options, bundle) {
      // Retain the original notices in the emitted asset after minification.
      for (const entry of Object.values(bundle)) {
        if (entry.type === "chunk" && containsElk(entry.moduleIds)) {
          entry.code = `${elkCopyright}\n${entry.code}`;
        }
      }
    },
  },
};

/** @param {string} path @param {string} outputPath @param {string} language */
async function writeSearchIndex(path, outputPath, language) {
  const { index, errors } = await createIndex({ forceLanguage: language });
  if (!index || errors.length)
    throw new Error(errors.join("\n") || `Cannot initialize ${language} search index`);
  const result = await index.addDirectory({ path, glob: articlePages });
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  const written = await index.writeFiles({ outputPath });
  if (written.errors.length) throw new Error(written.errors.join("\n"));
  // The theme uses the search API directly and ships only its core assets.
  await Promise.all(
    unusedPagefindAssets.map((file) => rm(join(outputPath, file), { force: true })),
  );
  return result.page_count;
}

/** @param {string} path */
async function hasHanContent(path) {
  for await (const file of glob(articlePages, { cwd: path })) {
    if (/\p{Script=Han}/u.test(await readFile(join(path, file), "utf8"))) return true;
  }
  return false;
}

export default defineConfig({
  output: "static",
  site: siteConfig.origin,
  base: siteConfig.base,
  trailingSlash: "always",
  build: { format: "directory" },
  vite: {
    build: { license: { fileName: "third-party/bundled-licenses.md" } },
    plugins: [elkDistributionNotice],
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [reservePageHeading, rehypeKatex],
    }),
    syntaxHighlight: { type: "shiki", excludeLangs: ["mermaid", "math"] },
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      // Existing posts use custom fence labels for HTTP and shell transcripts.
      langAlias: { C: "c", HTML: "html", burp: "http", shellwhich: "bash", $: "bash" },
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
          if (!siteConfig.features.search) return;
          const path = fileURLToPath(dir);
          const outputPath = join(path, "pagefind");
          const language = new Intl.Locale(siteConfig.lang).language;
          try {
            // A single language per index prevents Pagefind from selecting a subset by page lang.
            const articleCount = await writeSearchIndex(path, outputPath, language);
            const chineseIndex =
              articleCount > 0 && language !== "zh" && (await hasHanContent(path));
            if (chineseIndex) await writeSearchIndex(path, join(outputPath, "chinese"), "zh");
            await writeFile(
              join(outputPath, "search-manifest.json"),
              JSON.stringify({ articleCount, chineseIndex }),
            );
            logger.info(`Indexed ${articleCount} public article(s)`);
          } finally {
            await close();
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
