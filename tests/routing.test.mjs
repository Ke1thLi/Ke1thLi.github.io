import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { access, cp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseFragment, serialize } from "parse5";
import { createExperienceFixture } from "./experience-fixture.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const astro = join(root, "node_modules", "astro", "bin", "astro.mjs");
const staticRoutes = [
  "",
  "about/",
  "articles/",
  "projects/",
  "archives/",
  "categories/",
  "tags/",
  "search/",
];
const postPath = "posts/custom-slug/";
const projectPath = "projects/project-id/";
const categoryPath = "categories/topic/";
const tagPaths = ["tags/astro/", "tags/~632b2b202f20e8b7afe794b1/"];
test("public routes and assets work at the root and a GitHub Pages subpath", async (suite) => {
  const fixture = await createExperienceFixture(root);
  suite.after(() => rm(fixture, { recursive: true, force: true }));
  await cp(join(fixture, "astro.config.mjs"), join(fixture, "astro.fixture.config.mjs"));
  await writeFile(
    join(fixture, "astro.config.mjs"),
    'import config from "./astro.fixture.config.mjs";\n' +
      "export default { ...config, vite: { ...config.vite, build: { ...config.vite.build, assetsInlineLimit: 0 } } };\n",
  );

  for (const base of ["/", "/moonlit-folio/"]) {
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
      const section = (id) => {
        const start = home.indexOf(`id="${id}"`);
        assert.notEqual(start, -1);
        return home.slice(start, home.indexOf("</section>", start));
      };
      const featured = section("featured-articles");
      const recent = section("recent-articles");
      assert.doesNotMatch(section("home-categories"), /undefined|Uncategorized/);
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
      assert.doesNotMatch(
        sitemap,
        /404|design-system|search\/|articles\/category|projects\/status/,
      );
      const uncategorized = await get("posts/fixture-10/");
      assert.match(uncategorized, /Article fixture 10/);
      assert.doesNotMatch(uncategorized, /data-pagefind-meta="category:|categories\/undefined/);
      assert.doesNotMatch(await get("categories/"), /Uncategorized|categories\/undefined/);
      assert.doesNotMatch(await get("articles/category/engineering/"), /Article fixture 10/);
      assert.doesNotMatch(sitemap, /categories\/undefined/);
      assert.ok(sitemap.includes(`${base}posts/fixture-10/`));
      const rss = await get("rss.xml");
      assert.equal(await get("index.xml"), rss);
      assert.doesNotMatch(rss, /localdraftonlymarker/);
      assert.ok(rss.includes(`${base}posts/fixture-10/`));
      assert.ok(rss.includes(`<link>https://preview.example${base}${postPath}</link>`));
      assert.match(rss, /<pubDate>Tue, 20 Jan 2026 00:00:00 GMT<\/pubDate>/);
      assert.match(rss, /<lastBuildDate>Wed, 21 Jan 2026 00:00:00 GMT<\/lastBuildDate>/);
      assert.equal((rss.match(/<content:encoded>/g) ?? []).length, 11);
      assert.match(rss, /quartzanchor.*&lt;\/p&gt;/);
      assert.match(rss, /&lt;table&gt;/);
      assert.match(rss, /&lt;math\b/);
      assert.match(rss, /beforeafter/);
      assert.doesNotMatch(rss, /draftonlyneedle|page-only-marker|\u0007/);
      assert.ok(rss.includes(`https://preview.example${base}${postPath}#verify-the-output`));
      assert.match(await get("pagefind/pagefind.js"), /Pagefind|pagefind/);
      assert.match(await get("third-party/NOTICE.txt"), /https:\/\/github\.com\/kieler\/elkjs/);
      assert.match(await get("third-party/bundled-licenses.md"), /## elkjs - /);
      assert.match(await get("third-party/KaTeX-Fonts-OFL.txt"), /SIL OPEN FONT LICENSE/);
      assert.equal((await fetch(origin + base + "pagefind/pagefind-ui.js")).status, 404);
      assert.deepEqual(JSON.parse(await get("pagefind/search-manifest.json")), {
        articleCount: 11,
        chineseIndex: true,
      });
      assert.match(await get("pagefind/chinese/pagefind.js"), /Pagefind|pagefind/);
      const search = pages.get("search/");
      assert.match(search, /data-search-page/);
      assert.match(search, /data-search-dialog/);
      assert.match(search, /name="robots" content="noindex"/);
      const article = pages.get(postPath);
      assert.match(article, /class="katex"/);
      const encoded = rss.match(
        /<content:encoded>([^<]*Completed feed task[^<]*)<\/content:encoded>/,
      );
      assert.ok(encoded);
      const [body] = parseFragment(encoded[1]).childNodes;
      assert.equal(body.nodeName, "#text");
      const feed = serialize(parseFragment(body.value));
      for (const text of [
        "quartzanchor",
        "Ordered feed item",
        "Unordered feed item",
        "Visible editorial content",
        "Unsafe URL label",
      ]) {
        assert.ok(article.includes(text), text);
        assert.ok(feed.includes(text), text);
      }
      assert.match(article, /<picture>[\s\S]*?alt="Feed fallback"/);
      assert.match(article, /<input[^>]*checked[^>]*>[^<]*Completed feed task/);
      assert.match(article, /<input[^>]*>[^<]*Pending feed task/);
      assert.match(article, /onload=""|onclick=""/);
      assert.match(feed, /<ol>/);
      assert.match(feed, /<ul>/);
      assert.match(feed, /\[x\]\s+Completed feed task/);
      assert.match(feed, /\[ \]\s+Pending feed task/);
      assert.match(feed, /\[x\]\s+Loose feed task/);
      assert.match(feed, /This explanation remains under the task/);
      assert.match(feed, /<article>[\s\S]*<picture>/);
      assert.ok(
        feed.includes(
          `srcset="https://preview.example${base}favicon.svg?variant=wide 1x, https://preview.example${base}favicon.svg?variant=wide-2x 2x"`,
        ),
      );
      assert.ok(feed.includes(`src="https://preview.example${base}favicon.svg?variant=fallback"`));
      assert.match(feed, /<pre[\s\S]*const route/);
      assert.match(feed, /<table>/);
      assert.match(feed, /<math\b/);
      assert.doesNotMatch(feed, /<input\b|<iframe\b|<script\b|\bonload=|\bonclick=|javascript:/i);
      const fixtureImage = article.match(/<img\b[^>]*src="([^"]+)"[^>]*alt="Fixture image"/);
      assert.ok(fixtureImage);
      assert.ok(rss.includes(`src=&quot;https://preview.example${fixtureImage[1]}&quot;`));
      const related = article.match(
        /<section aria-labelledby="related-articles">([\s\S]*?)<\/section>/,
      )?.[1];
      assert.ok(related);
      assert.match(related, /Article fixture 03/);
      assert.doesNotMatch(related, /Routing fixture|Private draft|Article fixture 10/);
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
        graph(article).some(
          (entry) => entry["@type"] === "Person" && entry.name === "Example Author",
        ),
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
      for (const [route, html] of pages) {
        assert.doesNotMatch(html, /hidden-draft|Private draft|draft-category|draft-tag/);
        for (const [, url] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
          if (url.startsWith("#")) {
            assert.ok(html.includes(`id="${url.slice(1)}"`), url);
            continue;
          }
          const target = new URL(url, origin + base + route);
          if (target.origin !== origin) continue;
          assert.ok(target.pathname.startsWith(base), `${url} must use ${base}`);
          references.add(target.pathname + target.search);
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
          BLOG_BASE_PATH: "/moonlit-folio/",
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

  await suite.test(
    "search can be disabled without removing its fallback page or feeds",
    async () => {
      await cp(join(fixture, "site.config.mjs"), join(fixture, "site.enabled.mjs"));
      await writeFile(
        join(fixture, "site.config.mjs"),
        'import settings from "./site.enabled.mjs";\n' +
          "export default { ...settings, features: { search: false } };\n",
      );
      const result = spawnSync(process.execPath, [astro, "build"], {
        cwd: fixture,
        env: {
          ...process.env,
          ASTRO_TELEMETRY_DISABLED: "1",
          BLOG_SITE_URL: "https://preview.invalid",
          BLOG_BASE_PATH: "/",
        },
        encoding: "utf8",
        timeout: 60_000,
      });
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const home = await readFile(join(fixture, "dist/index.html"), "utf8");
      const search = await readFile(join(fixture, "dist/search/index.html"), "utf8");
      for (const html of [home, search]) {
        assert.doesNotMatch(html, /data-search-open|data-search-dialog|data-search-page/);
        assert.match(html, /name="robots" content="noindex"/);
      }
      assert.match(search, /href="\/articles\/">Browse articles/);
      await assert.rejects(access(join(fixture, "dist/pagefind")), { code: "ENOENT" });
      assert.match(await readFile(join(fixture, "dist/rss.xml"), "utf8"), /<content:encoded>/);
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
