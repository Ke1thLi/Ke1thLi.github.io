import type { CollectionEntry } from "astro:content";
import { sitePath, tagRouteKey } from "./routes";
export type Post = CollectionEntry<"posts">;
export type ArticleFilter = { kind: "category" | "tag"; value: string };
export const pageSize = 10;

export function filterKey(filter: ArticleFilter) {
  return filter.kind === "tag" ? tagRouteKey(filter.value) : filter.value;
}

export function articlePath(filter?: ArticleFilter, page = 1) {
  const path = ["articles"];
  if (filter) path.push(filter.kind, filterKey(filter));
  if (page > 1) path.push("page", String(page));
  return sitePath(...path);
}

export function matches(post: Post, filter: ArticleFilter) {
  return filter.kind === "category"
    ? post.data.category === filter.value
    : post.data.tags.includes(filter.value);
}

export function groupByCategory(posts: Post[]) {
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    const category = post.data.category;
    if (!category) continue;
    const entries = groups.get(category);
    if (entries) entries.push(post);
    else groups.set(category, [post]);
  }
  return groups;
}

export function articleFilters(posts: Post[]): ArticleFilter[] {
  return [
    ...[...groupByCategory(posts).keys()]
      .sort()
      .map((value) => ({ kind: "category" as const, value })),
    ...[...new Set(posts.flatMap(({ data }) => data.tags))]
      .sort()
      .map((value) => ({ kind: "tag" as const, value })),
  ];
}

export function relatedPosts(current: Post, posts: Post[]): Post[] {
  const tags = [...new Set(current.data.tags)];
  return posts
    .filter((post) => post.id !== current.id && !post.data.draft)
    .map((post) => ({
      post,
      project: Number(current.data.projects.some((id) => post.data.projects.includes(id))),
      tags: tags.filter((tag) => post.data.tags.includes(tag)).length,
      category: Number(
        Boolean(current.data.category) && current.data.category === post.data.category,
      ),
    }))
    .filter(({ project, tags, category }) => project || tags || category)
    .sort((a, b) => b.project - a.project || b.tags - a.tags || b.category - a.category)
    .slice(0, 3)
    .map(({ post }) => post);
}

export { readingMinutes } from "./reading-time";
