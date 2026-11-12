import { defineCollection } from "astro:content";
import { glob, type Loader } from "astro/loaders";
import { readdir } from "node:fs/promises";
import { contentId, postSchema, projectSchema } from "./lib/content-schema";

const projectsBase = "./src/content/projects/";
const markdownExtension = ".md";
const projectId = (filename: string) => filename.slice(0, -markdownExtension.length);

const projects = defineCollection({
  loader: glob({
    base: projectsBase,
    pattern: "*.md",
    generateId: ({ entry }) => {
      const result = contentId.safeParse(projectId(entry));
      if (!result.success) {
        throw new Error(`Invalid project ID in "${entry}": ${result.error.issues[0].message}`);
      }
      return result.data;
    },
  }),
  schema: projectSchema,
});

const postsLoader: Loader = {
  name: "blog-posts",
  async load(context) {
    const sourceBySlug = new Map<string, string>();
    const drafts = new Map<string, unknown>();
    const excludeDrafts = !context.watcher;
    let checkingInitialSlugs = true;

    // A dev sync may have populated the cache before this production sync.
    if (excludeDrafts) {
      for (const { id, data } of context.store.values()) {
        if (data.draft === true) context.store.delete(id);
      }
    }

    const loader = glob({
      base: "./src/content/posts",
      pattern: ["**/*.md", "!_local-drafts/**"],
      deferRender: true,
      generateId: ({ entry, data }) => {
        const result = contentId.safeParse(data.slug);
        if (!result.success) {
          throw new Error(`Invalid post slug in "${entry}": ${result.error.issues[0].message}`);
        }
        const slug = result.data;
        if (checkingInitialSlugs) {
          const previous = sourceBySlug.get(slug);
          if (previous && previous !== entry) {
            throw new Error(`Duplicate post slug "${slug}" in "${previous}" and "${entry}"`);
          }
          sourceBySlug.set(slug, entry);
        }
        return slug;
      },
    });

    await loader.load({
      ...context,
      store: {
        ...context.store,
        set(entry) {
          if (excludeDrafts && entry.data.draft === true) {
            drafts.set(entry.id, entry.data.projects);
            return false;
          }
          return context.store.set(entry);
        },
      },
    });
    checkingInitialSlugs = false;
    sourceBySlug.clear();

    // Astro loads collections concurrently. The project filenames define their IDs.
    const files = await readdir(new URL(projectsBase, context.config.root), {
      withFileTypes: true,
    });
    const ids = new Set(
      files
        .filter((file) => file.isFile() && file.name.endsWith(markdownExtension))
        .map((file) => projectId(file.name)),
    );
    for (const { id, data } of context.store.values()) {
      validateProjectLinks(id, data.projects, ids);
    }
    for (const [id, links] of drafts) {
      validateProjectLinks(id, links, ids);
    }
  },
};

function validateProjectLinks(slug: string, links: unknown, projectIds: Set<string>) {
  if (!Array.isArray(links)) return;
  for (const [index, id] of links.entries()) {
    if (typeof id !== "string" || !projectIds.has(id)) {
      throw new Error(`Post "${slug}" references unknown project "${id}" in projects[${index}]`);
    }
  }
}

const posts = defineCollection({ loader: postsLoader, schema: postSchema });

export const collections = { posts, projects };
