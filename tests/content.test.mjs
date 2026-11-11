import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const astro = join(root, "node_modules", "astro", "bin", "astro.mjs");
const post = [
  "title: Fixture",
  "description: Validation fixture",
  "slug: public-fixture",
  'pubDate: "2026-01-02"',
  "category: fixture-category",
  "type: fixture-type",
  "projects: [fixture-project]",
].join("\n");
const project = "title: Fixture\ndescription: Validation fixture\nstatus: fixture-status";
const markdown = (fields, body = "") => `---\n${fields}\n---\n${body}\n`;

test("Astro 7.4.10 content model", async (suite) => {
  const fixture = await mkdtemp(join(root, "node_modules", ".blog-content-test-"));
  suite.after(() => rm(fixture, { force: true, recursive: true }));

  for (const directory of ["src/lib", "src/pages", "src/content/posts", "src/content/projects"]) {
    await mkdir(join(fixture, directory), { recursive: true });
  }
  for (const file of [
    "package.json",
    "tsconfig.json",
    "astro.config.mjs",
    "src/content.config.ts",
    "src/lib/content-schema.ts",
  ]) {
    await copyFile(join(root, file), join(fixture, file));
  }

  const write = (file, content) => writeFile(join(fixture, file), content);
  const postFile = "src/content/posts/arbitrary-filename.md";
  const projectFile = "src/content/projects/fixture-project.md";
  await write(postFile, markdown(post, "public-body-marker"));
  await write(projectFile, markdown(project));
  await write(
    "src/pages/index.astro",
    `---
import { getCollection, render, type CollectionEntry } from "astro:content";
const posts: CollectionEntry<"posts">[] = await getCollection("posts");
const projects: CollectionEntry<"projects">[] = await getCollection("projects");
const date: Date = posts[0].data.pubDate;
const { Content } = await render(posts[0]);
---
<p>{posts.map(({ id, data }) => [id, data.tags.length, data.featured, data.projects[0]].join(":")).join(",")}</p>
<p>{projects.map(({ id, data }) => [id, data.techStack.length, data.featured].join(":")).join(",")}</p>
<p>{date.toISOString()}</p>
<Content />
`,
  );

  function run(command, expectedError) {
    const result = spawnSync(process.execPath, [astro, command], {
      cwd: fixture,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", NO_COLOR: "1" },
      encoding: "utf8",
      timeout: 60_000,
    });
    assert.ifError(result.error);
    const output = result.stdout + result.stderr;
    if (expectedError) {
      assert.notEqual(result.status, 0, output);
      assert.match(output, expectedError);
    } else {
      assert.equal(result.status, 0, output);
    }
  }

  await suite.test(
    "valid entries, inferred types, defaults, IDs and production draft exclusion",
    async () => {
      await write(
        "src/content/posts/draft.md",
        markdown(
          post.replace("public-fixture", "hidden-fixture") + "\ndraft: true",
          "draft-body-marker",
        ),
      );
      run("check");
      run("build");
      const output = await readFile(join(fixture, "dist/index.html"), "utf8");
      assert.match(output, /public-fixture:0:false:fixture-project/);
      assert.match(output, /fixture-project:0:false/);
      assert.match(output, /2026-01-02T00:00:00.000Z/);
      assert.match(output, /public-body-marker/);
      assert.doesNotMatch(output, /hidden-fixture|draft-body-marker/);
    },
  );

  await suite.test("rejects malformed slugs, dates and project URLs", async () => {
    await write(postFile, markdown(post.replace("public-fixture", "Invalid/Slug")));
    run("build", /Invalid post slug/);
    await write(postFile, markdown(post.replace("2026-01-02", "2026-02-30")));
    run("build", /pubDate/);
    await write(postFile, markdown(post + '\nupdatedDate: "2026-01-01T12:00:00+08:00"'));
    run("build", /updatedDate must be on or after pubDate/);
    await write(postFile, markdown(post, "public-body-marker"));
    await write(projectFile, markdown(project + "\nrepository: ftp://example.invalid/repo"));
    run("build", /repository/);
    await write(projectFile, markdown(project));
  });

  await suite.test("rejects identical Markdown files with a duplicate slug", async () => {
    const duplicate = "src/content/posts/duplicate.md";
    await write(duplicate, markdown(post, "public-body-marker"));
    run("build", /Duplicate post slug "public-fixture"/);
    await rm(join(fixture, duplicate));
  });

  await suite.test("rejects missing project references on public posts and drafts", async () => {
    await write(postFile, markdown(post.replace("[fixture-project]", "[missing-project]")));
    run("build", /references unknown project "missing-project"/);
    await write(postFile, markdown(post));
    await write(
      "src/content/posts/draft.md",
      markdown(
        post
          .replace("public-fixture", "hidden-fixture")
          .replace("[fixture-project]", "[missing-project]") + "\ndraft: true",
      ),
    );
    run("build", /Post "hidden-fixture" references unknown project "missing-project"/);
  });
});
