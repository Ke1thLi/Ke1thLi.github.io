import { cp, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";

const fence = "```";
const diagrams = [
  "flowchart LR\n  Source --> Build --> Page",
  "sequenceDiagram\n  Reader->>Site: Request article\n  Site-->>Reader: Return HTML",
  "stateDiagram-v2\n  [*] --> Draft\n  Draft --> Published",
  "classDiagram\n  class Entry {\n    +slug\n  }",
];
const mainPost = `---
title: Routing fixture
description: A verification article for static routes and readable Markdown.
slug: custom-slug
pubDate: "2026-01-20"
updatedDate: "2026-01-21"
category: topic
type: fixture
tags: [astro, "c++ / 路由"]
projects: [project-id]
featured: true
---

## From content to route

A static route publishes an HTML document at a stable address. This fixture checks that its links, assets, and project references remain available under a deployment prefix.

### Inspect the output

The indexable body keyword is quartzanchor. Open the [related section](#verify-the-output) after comparing the listing.

#### Render a code example

${fence}ts
const route = "/Ke1thLi-Blog/posts/custom-slug/";
const longLine = "${"long-line-".repeat(21)}";
${fence}

> Keep the content address independent of its category.

## Verify the output

| Mode | Prefix |
| --- | --- |
| Root | / |
| Project | /Ke1thLi-Blog/ |

![Fixture image](./assets/fixture.svg "Static route verification image")

## Diagrams

${diagrams.map((diagram) => `${fence}mermaid\n${diagram}\n${fence}`).join("\n\n")}
`;

export async function createExperienceFixture(root) {
  const directory = await mkdtemp(join(root, "node_modules", ".blog-experience-"));
  const write = (file, content) => writeFile(join(directory, file), content);
  await cp(join(root, "src"), join(directory, "src"), {
    recursive: true,
    filter: (source) => source !== join(root, "src", "content"),
  });
  for (const name of ["package.json", "tsconfig.json", "astro.config.mjs"]) {
    await cp(join(root, name), join(directory, name));
  }
  await cp(join(root, "public"), join(directory, "public"), { recursive: true });
  await mkdir(join(directory, "src/content/posts"), { recursive: true });
  await mkdir(join(directory, "src/content/posts/assets"));
  await mkdir(join(directory, "src/content/projects"), { recursive: true });
  await write("src/content/posts/different-filename.md", mainPost);
  await write(
    "src/content/posts/draft.md",
    mainPost
      .replace("title: Routing fixture", "title: Private draft")
      .replace("slug: custom-slug", "slug: hidden-draft\ndraft: true")
      .replace("category: topic", "category: draft-category")
      .replace('tags: [astro, "c++ / 路由"]', "tags: [draft-tag]")
      .replace("quartzanchor", "draftonlyneedle"),
  );
  for (let index = 1; index <= 10; index++) {
    const key = String(index).padStart(2, "0");
    await write(
      `src/content/posts/fixture-${key}.md`,
      `---
title: Article fixture ${key}
description: Fixture for publication ordering and static pagination.
slug: fixture-${key}
pubDate: "2026-01-${key}"
category: ${index <= 5 ? "topic" : "engineering"}
type: fixture
tags: [${index <= 5 ? "astro" : "build"}]
featured: ${index === 3}
${index === 1 ? "lang: zh-CN" : ""}
---

## Output

${index === 1 ? "这段中文用于验证页面语言和内容构建。" : `Published fixture number ${index}.`}
`,
    );
  }
  await write(
    "src/content/posts/assets/fixture.svg",
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240"><rect width="640" height="240" fill="#e8edff"/><path d="M105 120h430" stroke="#304cc2" stroke-width="3"/><g fill="#304cc2"><circle cx="120" cy="120" r="18"/><circle cx="320" cy="120" r="18"/><circle cx="520" cy="120" r="18"/></g></svg>',
  );
  await write(
    "src/content/projects/project-id.md",
    `---
title: Project fixture
description: A static build fixture linked from the routing article.
status: active
techStack: [Astro, TypeScript]
repository: https://example.invalid/repository
demo: https://example.invalid/demo
featured: true
---

## Project outline

This isolated project record verifies status filters, project metadata, and related articles.
`,
  );
  return directory;
}
