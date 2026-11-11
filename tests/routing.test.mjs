import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createExperienceFixture } from "./experience-fixture.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const astro = join(root, "node_modules", "astro", "bin", "astro.mjs");
const staticRoutes = ["", "about/", "articles/", "projects/", "archives/", "categories/", "tags/"];
const postPath = "posts/custom-slug/";
const projectPath = "projects/project-id/";
const categoryPath = "categories/topic/";
const tagPaths = ["tags/astro/", "tags/~632b2b202f20e8b7afe794b1/"];
test("public routes and assets work at the root and a GitHub Pages subpath", async (suite) => {
  const fixture = await createExperienceFixture(root);
  suite.after(() => rm(fixture, { recursive: true, force: true }));
  await cp(join(fixture, "astro.config.mjs"), join(fixture, "site.config.mjs"));
  await writeFile(
    join(fixture, "astro.config.mjs"),
    'import config from "./site.config.mjs";\n' +
      "export default { ...config, vite: { build: { assetsInlineLimit: 0 } } };\n",
  );

  for (const base of ["/", "/preview-subpath/"]) {
    await suite.test(base, async (context) => {
      const env = {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: "1",
        BLOG_BASE_PATH: base,
        BLOG_SITE_URL: "https://preview.example",
        BLOG_GITHUB_URL: "https://example.invalid/github",
        BLOG_RSS_URL: "rss.xml",
        NO_COLOR: "1",
      };
      const result = spawnSync(process.execPath, [astro, "build"], {
        cwd: fixture,
        env,
        encoding: "utf8",
        timeout: 60_000,
      });
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stdout + result.stderr);

      const preview = spawn(
        process.execPath,
        [astro, "preview", "--host", "127.0.0.1", "--port", "0"],
        { cwd: fixture, env },
      );
      const exited = once(preview, "close");
      context.after(async () => {
        preview.kill();
        await exited;
      });
      const origin = await previewOrigin(preview);
      const pages = new Map();
      for (const route of [...staticRoutes, postPath, projectPath, categoryPath, ...tagPaths]) {
        const response = await fetch(origin + base + route);
        assert.equal(response.status, 200, route);
        pages.set(route, await response.text());
      }

      assert.match(result.stdout, /Indexed 11 public article/);
      const home = pages.get("");
      const featured = home.slice(
        home.indexOf('id="featured-articles"'),
        home.indexOf('id="recent-articles"'),
      );
      const recent = home.slice(
        home.indexOf('id="recent-articles"'),
        home.indexOf('id="featured-projects"'),
      );
      assert.ok(featured.includes("Routing fixture") && featured.includes("Article fixture 03"));
      assert.doesNotMatch(featured, /Article fixture 10/);
      assert.ok(recent.indexOf("Routing fixture") < recent.indexOf("Article fixture 10"));
      const get = async (route) => {
        const response = await fetch(origin + base + route);
        assert.equal(response.status, 200, route);
        return await response.text();
      };
      const secondPage = await get("articles/page/2/");
      assert.match(secondPage, /Article fixture 01/);
      assert.doesNotMatch(secondPage, /Routing fixture/);
      assert.ok(
        secondPage.includes(
          `rel="canonical" href="https://preview.example${base}articles/page/2/"`,
        ),
      );
      assert.match(await get("posts/fixture-01/"), /<html lang="zh-CN"/);
      for (const route of ["articles/category/topic/", "articles/tag/astro/"]) {
        const filtered = await get(route);
        assert.match(filtered, /6 articles/);
        assert.match(filtered, /Routing fixture/);
        assert.doesNotMatch(filtered, /Article fixture 10/);
        assert.match(filtered, /name="robots" content="noindex"/);
      }
      assert.match(await get("projects/status/active/"), /Project fixture/);
      for (const route of ["sitemap.xml", "rss.xml"]) {
        const xml = await get(route);
        assert.match(xml, /custom-slug/);
        assert.doesNotMatch(xml, /hidden-draft|Private draft/);
      }
      const robots = await get("robots.txt");
      assert.equal(
        robots,
        `User-agent: *\nDisallow:\nSitemap: https://preview.example${base}sitemap.xml\n`,
      );
      const sitemap = await get("sitemap.xml");
      const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
      assert.equal(new Set(locations).size, locations.length);
      assert.ok(locations.every((url) => url.startsWith(`https://preview.example${base}`)));
      assert.ok(locations.includes(`https://preview.example${base}articles/page/2/`));
      assert.doesNotMatch(sitemap, /404|design-system|articles\/category|projects\/status/);
      const rss = await get("rss.xml");
      assert.equal(await get("index.xml"), rss);
      assert.ok(rss.includes(`<link>https://preview.example${base}${postPath}</link>`));
      assert.match(rss, /<pubDate>Tue, 20 Jan 2026 00:00:00 GMT<\/pubDate>/);
      assert.match(rss, /<lastBuildDate>Wed, 21 Jan 2026 00:00:00 GMT<\/lastBuildDate>/);
      assert.match(await get("pagefind/pagefind.js"), /Pagefind|pagefind/);
      assert.equal(await get("pagefind/article-count.json"), "11");
      const article = pages.get(postPath);
      assert.ok(
        article.includes(`rel="canonical" href="https://preview.example${base}${postPath}"`),
      );
      assert.match(article, /name="description" content="A verification article/);
      assert.match(article, /property="og:type" content="article"/);
      assert.match(article, /name="twitter:card" content="summary_large_image"/);
      const graph = (html) =>
        JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1])[
          "@graph"
        ];
      assert.ok(graph(home).some((entry) => entry["@type"] === "Blog"));
      assert.ok(
        graph(article).some(
          (entry) =>
            entry["@type"] === "BlogPosting" && entry.dateModified.startsWith("2026-01-21"),
        ),
      );
      assert.ok(
        graph(article).some((entry) => entry["@type"] === "Person" && entry.name === "Ke1thLi"),
      );
      assert.ok(
        graph(article).some(
          (entry) => entry["@type"] === "BreadcrumbList" && entry.itemListElement.length === 3,
        ),
      );
      assert.match(article, /href="#inspect-the-output"/);
      assert.match(article, /data-language="(?:ts|typescript)"/);
      assert.equal((article.match(/language-mermaid/g) ?? []).length, 4);
      assert.ok(pages.get("articles/").includes(`href="${base}${postPath}"`));
      assert.ok(pages.get("projects/").includes(`href="${base}${projectPath}"`));
      assert.ok(pages.get(postPath).includes(`href="${base}${projectPath}"`));
      assert.ok(pages.get(projectPath).includes(`href="${base}${postPath}"`));
      assert.match(pages.get(""), /href="https:\/\/example\.invalid\/github"/);
      assert.ok(pages.get("").includes(`href="${base}rss.xml"`));
      assert.ok(pages.get("articles/").includes(`href="${base}articles/" aria-current="page"`));
      assert.ok(pages.get(postPath).includes(`href="${base}articles/" aria-current="location"`));
      assert.ok(pages.get(postPath).includes(`href="${base}${categoryPath}"`));
      for (const route of [categoryPath, ...tagPaths]) {
        assert.ok(pages.get(route).includes(`href="${base}${postPath}"`), route);
      }

      for (const route of [
        "posts/missing/",
        "posts/different-filename/",
        "posts/hidden-draft/",
        "projects/missing/",
        "categories/draft-category/",
        "tags/draft-tag/",
        "design-system/",
      ]) {
        const response = await fetch(origin + base + route, { redirect: "manual" });
        assert.equal(response.status, 404, route);
        const html = await response.text();
        assert.match(html, /Page not found/);
        assert.match(html, /name="robots" content="noindex"/);
        assert.doesNotMatch(html, /rel="canonical"/);
        pages.set(route, html);
      }
      if (base !== "/") {
        assert.equal((await fetch(origin + "/articles/")).status, 404);
      }

      const references = new Set();
      for (const html of pages.values()) {
        assert.doesNotMatch(html, /hidden-draft|Private draft|draft-category|draft-tag/);
        for (const [, url] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
          if (url.startsWith("#")) {
            assert.ok(html.includes(`id="${url.slice(1)}"`), url);
            continue;
          }
          if (/^https?:\/\//.test(url)) continue;
          assert.ok(url.startsWith(base), `${url} must use ${base}`);
          references.add(url);
        }
      }

      const media = new Set();
      for (const url of references) {
        const response = await fetch(origin + url, { redirect: "manual" });
        assert.equal(response.status, 200, url);
        const contentType = response.headers.get("content-type");
        media.add(contentType.split(";")[0]);
        await response.arrayBuffer();
      }
      assert.ok(media.has("text/css"));
      assert.ok([...media].some((type) => type.endsWith("/javascript")));
      assert.ok([...media].some((type) => type.startsWith("image/")));
    });
  }

  await suite.test(
    "publishing an Obsidian-style draft and updating it regenerates public outputs",
    async () => {
      const path = join(fixture, "src/content/posts/draft.md");
      const draft = await readFile(path, "utf8");
      const publicPost = draft
        .replace("draft: true", "draft: false")
        .replace("slug: hidden-draft", "slug: published-note")
        .replace("title: Private draft", "title: Published note")
        .replace('updatedDate: "2026-01-21"', 'updatedDate: "2026-02-02"')
        .replace(
          "A verification article for static routes and readable Markdown.",
          "An updated verification note.",
        );
      await writeFile(path, publicPost);
      const result = spawnSync(process.execPath, [astro, "build"], {
        cwd: fixture,
        env: {
          ...process.env,
          BLOG_SITE_URL: "https://preview.example",
          BLOG_BASE_PATH: "/preview-subpath/",
          ASTRO_TELEMETRY_DISABLED: "1",
        },
        encoding: "utf8",
        timeout: 60_000,
      });
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /Indexed 12 public article/);
      const rss = await readFile(join(fixture, "dist/rss.xml"), "utf8");
      assert.match(rss, /<lastBuildDate>Mon, 02 Feb 2026 00:00:00 GMT<\/lastBuildDate>/);
      assert.match(rss, /An updated verification note/);
      const html = await readFile(join(fixture, "dist/posts/published-note/index.html"), "utf8");
      assert.match(html, /property="article:modified_time" content="2026-02-02/);
      assert.doesNotMatch(rss, /hidden-draft/);
    },
  );
});

function previewOrigin(preview) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(
      () => reject(new Error(`Preview startup timed out:\n${output}`)),
      15_000,
    );
    const collect = (chunk) => {
      output += chunk.toString();
      const url = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (url) {
        clearTimeout(timer);
        resolve(url[0]);
      }
    };
    preview.stdout.on("data", collect);
    preview.stderr.on("data", collect);
    preview.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    preview.once("close", () => {
      clearTimeout(timer);
      reject(new Error(`Preview exited:\n${output}`));
    });
  });
}
