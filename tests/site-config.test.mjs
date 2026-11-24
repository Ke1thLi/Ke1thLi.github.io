import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveSite } from "../src/config/resolve-site.mjs";

test("site defaults are safe for preview and keep search and RSS enabled", () => {
  const defaults = resolveSite({}, {});
  assert.equal(defaults.origin, "https://preview.invalid");
  assert.equal(defaults.base, "/");
  assert.equal(defaults.rssUrl, "/rss.xml");
  assert.equal(defaults.features.search, true);
  assert.equal(defaults.appearance.fontSource, "system");
});

test("environment overrides deployment and social links without altering site identity", () => {
  const settings = resolveSite(
    {
      site: { title: "Configured site", author: { name: "Writer" } },
      deployment: { origin: "https://file.example", base: "/file/" },
      assets: { favicon: "media/favicon.svg", socialCard: "https://media.example/card.png" },
      social: { github: "https://example.invalid/configured" },
      navigation: [{ label: "Notes", links: [{ label: "Tags", href: "tags?view=all#top" }] }],
      features: { search: false },
      home: { recentPosts: 0 },
    },
    {
      BLOG_SITE_URL: "https://env.example",
      BLOG_BASE_PATH: "/notes",
      BLOG_GITHUB_URL: "https://example.invalid/overridden",
      BLOG_RSS_URL: "",
    },
  );
  assert.equal(settings.title, "Configured site");
  assert.equal(settings.author, "Writer");
  assert.equal(settings.origin, "https://env.example");
  assert.equal(settings.base, "/notes/");
  assert.equal(settings.githubUrl, "https://example.invalid/overridden");
  assert.equal(settings.rssUrl, undefined);
  assert.equal(settings.faviconUrl, "/notes/media/favicon.svg");
  assert.equal(settings.socialCardUrl, "https://media.example/card.png");
  assert.equal(settings.navigation[0].links[0].href, "/notes/tags/?view=all#top");
  assert.equal(settings.features.search, false);
  assert.equal(settings.home.recentPosts, 0);
});

test("invalid origins, prefixes, assets and feature values identify the field", () => {
  assert.throws(
    () => resolveSite({ deployment: { origin: "https://example.com/blog" } }, {}),
    /deployment\.origin/,
  );
  assert.throws(() => resolveSite({}, { BLOG_BASE_PATH: "/blog/../wrong/" }), /deployment\.base/);
  for (const favicon of [
    "../image.svg",
    "/%2e%2e/image.svg",
    "//elsewhere/image.svg",
    "/https://elsewhere/image.svg",
  ]) {
    assert.throws(() => resolveSite({ assets: { favicon } }, {}), /assets\.favicon/);
  }
  assert.throws(() => resolveSite({ features: { search: "false" } }, {}), /features\.search/);
});

test("navigation resolves page, file and local URL references at both deployment bases", () => {
  const entries = [
    [{ href: "/articles" }, "articles/"],
    [{ href: "rss.xml" }, "rss.xml"],
    [{ href: "sitemap-index.xml" }, "sitemap-index.xml"],
    [{ href: "robots.txt" }, "robots.txt"],
    [{ href: "search" }, "search/"],
    [{ href: "feed.json?view=compact#entry" }, "feed.json?view=compact#entry"],
    [{ href: "/posts/article#section" }, "posts/article/#section"],
    [
      { href: "https://external.example/doc.xml?view=all#entry" },
      "https://external.example/doc.xml?view=all#entry",
    ],
    [{ href: "/articles/" }, "articles/"],
    [{ href: "guides.v2" }, "guides.v2/"],
    [{ href: "docs.json", kind: "page" }, "docs.json/"],
    [{ href: "assets/version", kind: "file" }, "assets/version"],
    [{ href: "#local" }, "#local"],
    [{ href: "?view=compact" }, "?view=compact"],
    [{ href: "/?view=compact" }, "?view=compact"],
  ];
  const localReference = (href) => /^(?:https:\/\/|[?#])/.test(href);
  for (const base of ["/", "/example-blog/"]) {
    for (const [link, path] of entries) {
      const expected = localReference(path) && !link.href.startsWith("/") ? path : base + path;
      const resolve = (href) =>
        resolveSite(
          {
            deployment: { base },
            navigation: [{ label: "Links", links: [{ ...link, href, label: "Link" }] }],
          },
          {},
        ).navigation[0].links[0].href;
      assert.equal(resolve(link.href), expected, `${base} ${link.href}`);
      assert.equal(resolve(expected), expected, `${base} ${expected} round trip`);
    }
    if (base !== "/") {
      const settings = resolveSite(
        {
          deployment: { base },
          navigation: [
            { label: "Links", links: [{ href: "/example-blog?q=1#top", label: "Home" }] },
          ],
        },
        {},
      );
      assert.equal(settings.navigation[0].links[0].href, "/example-blog/?q=1#top");
    }
  }
});
