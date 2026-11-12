function externalUrl(value: string | undefined) {
  if (!value) return undefined;
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Expected an HTTP(S) URL");
  return url.href;
}

const rss = process.env.BLOG_RSS_URL?.trim() || "rss.xml";

export const siteConfig = {
  title: "Ke1thLi Blog",
  lang: "en",
  avatarUrl: new URL("avatar.svg", `https://example.invalid${import.meta.env.BASE_URL}`).pathname,
  backgroundUrl: undefined,
  home: {
    introduction: "Technical writing and personal projects.",
    technicalFocus: "Technology, security, and engineering",
    recentPosts: 5,
    featuredPosts: 3,
  },
  appearance: { defaultTheme: "system", accentColor: undefined, fontFamily: undefined },
  author: "Ke1thLi",
  description: "Technical writing and personal projects.",
  githubUrl: externalUrl(process.env.BLOG_GITHUB_URL || "https://github.com/Ke1thLi"),
  rssUrl:
    rss &&
    (/^[a-z][a-z\d+.-]*:/i.test(rss)
      ? externalUrl(rss)
      : new URL(rss.replace(/^\/+/, ""), `https://example.invalid${import.meta.env.BASE_URL}`)
          .pathname),
};
