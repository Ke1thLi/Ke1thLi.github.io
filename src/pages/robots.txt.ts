import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const sitemap = new URL(`${import.meta.env.BASE_URL}sitemap.xml`, site ?? url);
  return new Response(`User-agent: *\nDisallow:\nSitemap: ${sitemap.href}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
