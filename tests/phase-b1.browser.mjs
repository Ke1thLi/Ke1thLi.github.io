// Run with Playwright CLI run-code from a local preview URL.
async (page) => {
  const origin = new URL(page.url()).origin;
  const assert = (condition, label) => {
    if (!condition) throw new Error(label);
  };
  const input = page.getByRole("combobox", { name: "Search articles" });
  const options = page.getByRole("option");
  const queries = [
    ["Verify", "verify-a-static-build"],
    ["Markdown", "reading-a-local-index"],
    ["湖畔索引", "reading-a-local-index"],
    ["Markdown 湖畔索引", "reading-a-local-index"],
    ["龘靐齉靐", null],
  ];
  const entries = ["", "posts/reading-a-local-index/", "posts/verify-a-static-build/", "search/"];
  const report = {};
  for (const prefix of ["/", "/example-blog/"]) {
    const base = origin + prefix;
    const expected = new Map();
    for (const entry of entries) {
      assert((await page.goto(base + entry))?.ok(), prefix + entry);
      if (entry !== "search/") await page.keyboard.press("Control+k");
      await input.waitFor();
      for (const [query, slug] of queries) {
        const context = `${prefix} ${entry || "home"} ${query}`;
        await input.fill(query);
        await page.getByText(/^(?:\d+ results?|No matching articles\.)$/).waitFor();
        const paths = await options.evaluateAll((links) =>
          links.map((link) => new URL(link.href).pathname),
        );
        assert(
          slug ? paths.includes(`${prefix}posts/${slug}/`) : paths.length === 0,
          `${context}: unexpected results ${paths}`,
        );
        assert(new Set(paths).size === paths.length, `${context}: duplicate article`);
        if (expected.has(query))
          assert(JSON.stringify(paths) === expected.get(query), `${context}: inconsistent order`);
        else expected.set(query, JSON.stringify(paths));
      }
    }
    await input.fill("Verify");
    await options.first().waitFor();
    await input.press("ArrowDown");
    assert(!!(await input.getAttribute("aria-activedescendant")), prefix + " keyboard selection");
    await input.dispatchEvent("keydown", { key: "Enter", isComposing: true });
    assert(page.url() === base + "search/", prefix + " composing Enter navigated");
    await Promise.all([
      page.waitForURL(base + "posts/verify-a-static-build/"),
      input.press("Enter"),
    ]);
    await page.keyboard.press("Meta+k");
    await input.waitFor();
    await input.press("Escape");
    await input.waitFor({ state: "hidden" });
    report[prefix] = Object.fromEntries(
      [...expected].map(([query, paths]) => [query, JSON.parse(paths)]),
    );
  }
  return { entries, matches: report, browser: page.context().browser().version() };
};
