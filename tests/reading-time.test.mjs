import assert from "node:assert/strict";
import { test } from "node:test";
import { readingMinutes } from "../src/lib/reading-time.ts";

test("estimates Chinese, English, mixed prose and empty articles", () => {
  assert.equal(readingMinutes("字".repeat(401)), 2);
  assert.equal(readingMinutes("word ".repeat(221)), 2);
  assert.equal(readingMinutes("字".repeat(200) + "word ".repeat(111)), 2);
  assert.equal(readingMinutes(""), 1);
});

test("excludes fenced and indented code from the estimate", () => {
  const code = "word ".repeat(500);
  assert.equal(
    readingMinutes(["One line", "", "~~~js", code, "~~~~", "", "    " + code].join("\n")),
    1,
  );
});
