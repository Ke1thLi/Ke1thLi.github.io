export type NavigationIcon =
  "home" | "articles" | "projects" | "archives" | "categories" | "tags" | "about" | "search";

export interface NavigationGroup {
  label: string;
  links: readonly {
    label: string;
    href: string;
    icon?: NavigationIcon;
    kind?: "page" | "file";
  }[];
}

export interface SiteOptions {
  site?: {
    title?: string;
    description?: string;
    lang?: string;
    author?: { name: string; url?: string };
  };
  deployment?: { origin?: string; base?: string };
  assets?: { avatar?: string; favicon?: string; socialCard?: string; heroBackground?: string };
  social?: { github?: string; rss?: string };
  navigation?: readonly NavigationGroup[];
  home?: {
    introduction?: string;
    technicalFocus?: string;
    recentPosts?: number;
    featuredPosts?: number;
    featuredProjects?: number;
  };
  appearance?: {
    defaultTheme?: "system" | "light" | "dark";
    fontSource?: "system" | "google";
    accentColor?: string;
    fontFamily?: string;
  };
  features?: { search?: boolean };
}
