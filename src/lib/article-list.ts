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

export function articleFilters(posts: Post[]): ArticleFilter[] {
  return [
    ...[...new Set(posts.map(({ data }) => data.category))]
      .sort()
      .map((value) => ({ kind: "category" as const, value })),
    ...[...new Set(posts.flatMap(({ data }) => data.tags))]
      .sort()
      .map((value) => ({ kind: "tag" as const, value })),
  ];
}

export function readingMinutes(body = "") {
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
  const characters = body.match(cjk)?.length ?? 0;
  const words = body.replace(cjk, " ").match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(characters / 400 + words / 220));
}
