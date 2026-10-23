import assert from "node:assert/strict";
import { test } from "node:test";
import { validateDocument, validateTextFile, safeUrl, exportLetter } from "../src/components/workflow.js";

test("rejects empty and oversized documents without truncating", () => {
  assert.match(validateDocument("  ") ?? "", /paste/i);
  assert.match(validateDocument("x".repeat(30001)) ?? "", /30,000/);
  assert.equal(validateDocument("x".repeat(30000)), null);
});

test("validates text files by content and extension even without MIME metadata", () => {
  assert.equal(validateTextFile("case.md", "", 100, "# Notice"), null);
  assert.match(validateTextFile("case.pdf", "text/plain", 100, "A bill") ?? "", /txt/);
  assert.match(validateTextFile("case.txt", "text/plain", 100, "bad\u0000file") ?? "", /text/);
  assert.match(validateTextFile("case.txt", "text/plain", 300000, "A bill") ?? "", /256/);
  assert.match(validateTextFile("case.txt", "text/plain", 0, "") ?? "", /empty/);
});

test("source links allow only HTTP and HTTPS", () => {
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("data:text/html,hello"), null);
  assert.equal(safeUrl("/relative"), null);
  assert.equal(safeUrl("https://example.com/policy"), "https://example.com/policy");
});

test("exports edited text and its source list without the original letter", () => {
  const text = exportLetter("My edited letter", [{ id: 1, title: "Policy", url: "https://example.com/policy" }]);
  assert.match(text, /^My edited letter/);
  assert.match(text, /\[1\] Policy/);
  assert.match(text, /https:\/\/example.com\/policy/);
});
