import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCaseRequest, readJSON, errorResponse, allowStageRoute, takeBudget } from "../src/lib/request";

const valid = { documentText: "A charge appeared after cancellation.", packId: "subscription-cancel", country: "IN" };

test("case requests reject whitespace, unknown packs/countries, non-string options and excess input", () => {
  for (const mutation of [
    { documentText: "   " }, { packId: "toString" }, { country: "UK" },
    { userName: {} }, { desiredOutcome: 12 }, { documentText: "x".repeat(30001) },
    { userName: "x".repeat(201) }, { language: "x".repeat(81) },
  ]) assert.throws(() => parseCaseRequest({ ...valid, ...mutation }));
  assert.throws(() => parseCaseRequest(null));
});

test("valid case requests normalize empty options and keep the original document", () => {
  const parsed = parseCaseRequest({ ...valid, documentText: "  Bill text\n", userName: "  ", language: "" });
  assert.equal(parsed.documentText, "  Bill text\n");
  assert.equal(parsed.userName, undefined);
  assert.equal(parsed.language, "English");
  assert.equal(parsed.replyDeadline, "14 days");
});

test("JSON reader rejects malformed and oversized actual streams regardless of content length", async () => {
  await assert.rejects(readJSON(new Request("http://localhost", { method: "POST", body: "{" })), /valid JSON/i);
  const request = new Request("http://localhost", { method: "POST", body: "x".repeat(262145), headers: { "content-length": "1" } });
  await assert.rejects(readJSON(request), /large/i);
});

test("errors suppress raw exception messages and preserve safe provider status", async () => {
  const secret = errorResponse(new Error("secret upstream key and account"), "r1");
  assert.equal(secret.status, 500);
  assert.doesNotMatch(await secret.text(), /secret|account/);
  const provider = errorResponse(Object.assign(new Error("secret upstream body"), { code: "PROVIDER_OUTPUT", status: 502, retryable: true }), "r2");
  assert.equal(provider.status, 502);
  assert.equal((await provider.json()).requestId, "r2");
});

test("stage routes are unavailable unless explicitly enabled in development", () => {
  assert.equal(allowStageRoute("production", "true"), false);
  assert.equal(allowStageRoute("development", undefined), false);
  assert.equal(allowStageRoute("development", "true"), true);
});

test("budget permits three analyses per window and expires entries", () => {
  const entries = new Map<string, { count: number; expires: number }>();
  assert.equal(takeBudget(entries, "client", 1000), true);
  assert.equal(takeBudget(entries, "client", 1001), true);
  assert.equal(takeBudget(entries, "client", 1002), true);
  assert.equal(takeBudget(entries, "client", 1003), false);
  assert.equal(takeBudget(entries, "client", 61001), true);
});
