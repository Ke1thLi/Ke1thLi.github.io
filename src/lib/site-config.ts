function externalUrl(value: string | undefined) {
  if (!value) return undefined;
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Expected an HTTP(S) URL");
  return url.href;
}

const rss = process.env.BLOG_RSS_URL?.trim() || "rss.xml";

export const siteConfig = {
  author: "Ke1thLi",
  description: "Technical writing and personal projects.",
  githubUrl: externalUrl(process.env.BLOG_GITHUB_URL),
  rssUrl:
    rss &&
    (/^[a-z][a-z\d+.-]*:/i.test(rss)
      ? externalUrl(rss)
      : new URL(rss.replace(/^\/+/, ""), `https://example.invalid${import.meta.env.BASE_URL}`)
          .pathname),
};
