// @ts-check
/** @satisfies {import("./src/config/types").SiteOptions} */
const settings = {
  site: {
    title: "Ke1thLi Blog",
    description: "Technical writing and personal projects.",
    author: { name: "Ke1thLi" },
    lang: "en",
  },
  deployment: { origin: "https://ke1thli.github.io", base: "/" },
  assets: { avatar: "github-avatar.jpg", favicon: "favicon.png", socialCard: "social-card.png" },
  social: { github: "https://github.com/Ke1thLi" },
  appearance: { fontSource: "google" },
  home: {
    introduction: "Technical writing and personal projects.",
    technicalFocus: "Technology, security, and engineering",
    recentPosts: 5,
    featuredPosts: 0,
  },
};

export default settings;
