import type { APIRoute } from "astro";
import { getPublicPosts } from "../lib/public-content";
import { xml, xmlResponse } from "../lib/public-xml";
import { sitePath } from "../lib/routes";
import { siteConfig } from "../lib/site-config";

export const GET: APIRoute = async ({ site, url }) => {
  const absolute = (path: string) => xml(new URL(path, site ?? url).href);
  const posts = await getPublicPosts();
  const lastBuild = posts.reduce(
    (latest, { data }) => Math.max(latest, (data.updatedDate ?? data.pubDate).getTime()),
    -Infinity,
  );
  const lastBuildDate = Number.isFinite(lastBuild)
    ? `<lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>`
    : "";
  const items = posts.map(({ id, data }) => {
    const link = absolute(sitePath("posts", id));
    return `<item><title>${xml(data.title)}</title><link>${link}</link><guid>${link}</guid><description>${xml(data.description)}</description><pubDate>${data.pubDate.toUTCString()}</pubDate></item>`;
  });
  return xmlResponse(
    `<rss version="2.0"><channel><title>${xml(siteConfig.author)} Blog</title><link>${absolute(sitePath())}</link><description>${xml(siteConfig.description)}</description>${lastBuildDate}${items.join("")}</channel></rss>`,
    "application/rss+xml",
  );
};
