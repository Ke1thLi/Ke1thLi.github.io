import type { APIRoute } from "astro";
import { render } from "astro:content";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { feedHtml } from "../lib/feed-html";
import { getPublicPosts } from "../lib/public-content";
import { xml, xmlResponse } from "../lib/public-xml";
import { sitePath } from "../lib/routes";
import { siteConfig } from "../lib/site-config";

export const GET: APIRoute = async ({ site, url }) => {
  const absolute = (path: string) => new URL(path, site ?? url);
  const posts = await getPublicPosts();
  const lastBuild = posts.reduce(
    (latest, { data }) => Math.max(latest, (data.updatedDate ?? data.pubDate).getTime()),
    -Infinity,
  );
  const lastBuildDate = Number.isFinite(lastBuild)
    ? `<lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>`
    : "";
  const items = [];
  const container = await AstroContainer.create();
  for (const post of posts) {
    const { id, data } = post;
    const address = absolute(sitePath("posts", id));
    const link = xml(address.href);
    const { Content } = await render(post);
    const html = await container.renderToString(Content, { request: new Request(address) });
    items.push(
      `<item><title>${xml(data.title)}</title><link>${link}</link><guid>${link}</guid><description>${xml(data.description)}</description><pubDate>${data.pubDate.toUTCString()}</pubDate><content:encoded>${xml(feedHtml(html, address))}</content:encoded></item>`,
    );
  }
  return xmlResponse(
    `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${xml(siteConfig.title)}</title><link>${xml(absolute(sitePath()).href)}</link><description>${xml(siteConfig.description)}</description>${lastBuildDate}${items.join("")}</channel></rss>`,
    "application/rss+xml",
  );
};
