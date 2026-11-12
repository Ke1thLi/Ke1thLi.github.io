import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { getPublicPosts } from "../lib/public-content";
import { xml, xmlResponse } from "../lib/public-xml";
import { sitePath, tagRouteKey } from "../lib/routes";
import { articlePath, groupByCategory, pageSize } from "../lib/article-list";

export const GET: APIRoute = async ({ site, url }) => {
  const posts = await getPublicPosts();
  const projects = await getCollection("projects");
  const paths = [
    sitePath(),
    ...["about", "articles", "projects", "archives", "categories", "tags"].map((name) =>
      sitePath(name),
    ),
    ...posts.map(({ id }) => sitePath("posts", id)),
    ...Array.from({ length: Math.max(0, Math.ceil(posts.length / pageSize) - 1) }, (_, index) =>
      articlePath(undefined, index + 2),
    ),
    ...projects.map(({ id }) => sitePath("projects", id)),
    ...[...groupByCategory(posts).keys()].map((category) => sitePath("categories", category)),
    ...new Set(
      posts.flatMap(({ data }) => data.tags.map((tag) => sitePath("tags", tagRouteKey(tag)))),
    ),
  ];
  return xmlResponse(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].map((path) => `<url><loc>${xml(new URL(path, site ?? url).href)}</loc></url>`).join("")}</urlset>`,
    "application/xml",
  );
};
