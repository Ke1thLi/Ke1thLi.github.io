// @ts-check

/** @type {readonly import("./types").NavigationGroup[]} */
const defaultNavigation = [
  {
    label: "Workspace",
    links: [
      { label: "Home", href: "", icon: "home" },
      { label: "Articles", href: "articles", icon: "articles" },
      { label: "Projects", href: "projects", icon: "projects" },
      { label: "Archives", href: "archives", icon: "archives" },
    ],
  },
  {
    label: "Discover",
    links: [
      { label: "Categories", href: "categories", icon: "categories" },
      { label: "Tags", href: "tags", icon: "tags" },
    ],
  },
  { label: "About", links: [{ label: "About", href: "about", icon: "about" }] },
];
const navigationIcons = new Set([
  "home",
  "articles",
  "projects",
  "archives",
  "categories",
  "tags",
  "about",
  "search",
]);
const staticFileExtension =
  /\.(?:atom|avif|css|csv|gif|html?|ico|jpe?g|js|json|mjs|mp3|mp4|pdf|png|rss|svg|txt|wasm|webm|webmanifest|webp|woff2?|xml|zip)$/i;

/** @param {string} value @param {string} field */
function text(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Expected text for ${field}.`);
  return value.trim();
}

/** @param {number} value @param {string} field */
function count(value, field) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`Expected a nonnegative integer for ${field}.`);
  return value;
}

/** @param {string} value @param {string} field */
function httpUrl(value, field) {
  const url = URL.parse(value);
  if (!url || !["https:", "http:"].includes(url.protocol) || url.username || url.password)
    throw new Error(`Expected an HTTP(S) URL for ${field}.`);
  return url;
}

/** @param {string | undefined} value @param {string} base @param {string} field @param {"auto" | "page" | "file"} [navigation] */
function publicUrl(value, base, field, navigation) {
  if (value === undefined || (typeof value === "string" && !value.trim())) return undefined;
  const target = text(value, field);
  if (target.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(target))
    throw new Error(`Invalid path for ${field}.`);
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) return httpUrl(target, field).href;
  if (navigation && /^[?#]/.test(target)) return target;

  const relative = target.replace(/^\//, "");
  const path = relative.split(/[?#]/, 1)[0];
  let lastSegment = "";
  for (const segment of path.split("/")) {
    let decoded;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      throw new Error(`Invalid path for ${field}.`);
    }
    if (decoded === "." || decoded === ".." || /[/\\\u0000-\u001f\u007f]/.test(decoded)) {
      throw new Error(`Invalid path for ${field}.`);
    }
    lastSegment = decoded;
  }
  const alreadyPrefixed =
    navigation &&
    (target.startsWith(base) || (target.startsWith("/") && path === base.slice(1, -1)));
  const url = new URL(alreadyPrefixed ? target : relative, `https://local.invalid${base}`);
  if (alreadyPrefixed && url.pathname === base.slice(0, -1)) url.pathname = base;
  if (url.origin !== "https://local.invalid" || !url.pathname.startsWith(base))
    throw new Error(`Invalid path for ${field}.`);
  const directory =
    navigation === "page" || (navigation === "auto" && !staticFileExtension.test(lastSegment));
  const pathname = directory && !url.pathname.endsWith("/") ? url.pathname + "/" : url.pathname;
  return pathname + url.search + url.hash;
}

/** @param {import("./types").SiteOptions} options @param {Record<string, string | undefined>} env */
export function resolveSite(options, env) {
  const origin = httpUrl(
    env.BLOG_SITE_URL ?? options.deployment?.origin ?? "https://preview.invalid",
    "deployment.origin",
  );
  if (origin.pathname !== "/" || origin.search || origin.hash)
    throw new Error("Expected a bare HTTP(S) origin for deployment.origin.");
  const prefix = env.BLOG_BASE_PATH ?? options.deployment?.base ?? "/";
  if (
    !/^\/(?:[a-z\d._~-]+(?:\/[a-z\d._~-]+)*\/?)?$/i.test(prefix) ||
    prefix.split("/").some((part) => part === "." || part === "..")
  )
    throw new Error("Expected an absolute path prefix for deployment.base.");
  const base = prefix.endsWith("/") ? prefix : prefix + "/";
  const title = text(options.site?.title ?? "Moonlit Folio", "site.title");
  let lang;
  try {
    lang = new Intl.Locale(options.site?.lang ?? "en").baseName;
  } catch {
    throw new Error("Expected a BCP 47 language tag for site.lang.");
  }

  const {
    defaultTheme = "system",
    fontSource = "system",
    accentColor,
    fontFamily,
  } = options.appearance ?? {};
  if (!["system", "light", "dark"].includes(defaultTheme))
    throw new Error("Invalid appearance.defaultTheme.");
  if (!["system", "google"].includes(fontSource)) throw new Error("Invalid appearance.fontSource.");
  if (accentColor !== undefined && !/^#[a-f\d]{6}$/i.test(accentColor))
    throw new Error("Invalid appearance.accentColor.");
  if (fontFamily !== undefined && /[;{}<>\r\n]/.test(text(fontFamily, "appearance.fontFamily")))
    throw new Error("Invalid appearance.fontFamily.");
  const search = options.features?.search ?? true;
  if (typeof search !== "boolean") throw new Error("Expected a boolean for features.search.");

  const navigation = (options.navigation ?? defaultNavigation).map((group, index) => ({
    label: text(group.label, `navigation[${index}].label`),
    links: group.links.map(({ label, href, icon, kind }, linkIndex) => {
      const field = `navigation[${index}].links[${linkIndex}]`;
      if (icon !== undefined && !navigationIcons.has(icon))
        throw new Error(`Invalid ${field}.icon.`);
      if (typeof href !== "string") throw new Error(`Expected a path or URL for ${field}.href.`);
      if (kind !== undefined && kind !== "page" && kind !== "file")
        throw new Error(`Invalid ${field}.kind.`);
      return {
        label: text(label, `${field}.label`),
        href: publicUrl(href, base, `${field}.href`, kind ?? "auto") ?? base,
        icon,
      };
    }),
  }));
  const github = env.BLOG_GITHUB_URL ?? options.social?.github;
  const authorUrl = options.site?.author?.url;
  return {
    origin: origin.origin,
    base,
    title,
    lang,
    description: text(
      options.site?.description ?? "A space for articles and project notes.",
      "site.description",
    ),
    author: text(options.site?.author?.name ?? "Example Author", "site.author.name"),
    authorUrl: authorUrl ? httpUrl(authorUrl, "site.author.url").href : undefined,
    githubUrl: github?.trim() ? httpUrl(github, "social.github").href : undefined,
    rssUrl: publicUrl(env.BLOG_RSS_URL ?? options.social?.rss ?? "rss.xml", base, "social.rss"),
    avatarUrl: publicUrl(options.assets?.avatar, base, "assets.avatar"),
    faviconUrl: publicUrl(options.assets?.favicon, base, "assets.favicon"),
    socialCardUrl: publicUrl(options.assets?.socialCard, base, "assets.socialCard"),
    backgroundUrl: publicUrl(options.assets?.heroBackground, base, "assets.heroBackground"),
    navigation,
    home: {
      introduction: text(options.home?.introduction ?? title, "home.introduction"),
      technicalFocus: options.home?.technicalFocus,
      recentPosts: count(options.home?.recentPosts ?? 5, "home.recentPosts"),
      featuredPosts: count(options.home?.featuredPosts ?? 3, "home.featuredPosts"),
      featuredProjects: count(options.home?.featuredProjects ?? 3, "home.featuredProjects"),
    },
    appearance: { defaultTheme, fontSource, accentColor, fontFamily },
    features: { search },
  };
}
