import { test } from "node:test";
import assert from "node:assert/strict";
import { handleStage } from "../src/lib/stage-api";

const post = (body: unknown) => new Request("http://localhost/api/score", { method: "POST", body: JSON.stringify(body) });
test("stage endpoints default to unavailable", async () => {
  const response = await handleStage("score", post({}), false);
  assert.equal(response.status, 404);
});
test("development score route rechecks evidence instead of trusting verified flags", async () => {
  const response = await handleStage("score", post({ findings: [{ id: "f1", statement: "Guaranteed refund", stance: "favors-customer", sourceIds: ["s1"], supportingPassage: "Invented matching text", verified: true, applicability: "supported" }], sources: [] }), true);
  assert.equal(response.status, 200);
  const score = await response.json();
  assert.equal(score.rating, "weak");
  assert.equal(score.coverage, "none");
});
test("development routes reject invalid query objects and unsupported countries", async () => {
  assert.equal((await handleStage("research", post({ queries: ["private input"] }), true)).status, 400);
  assert.equal((await handleStage("escalate", post({ packId: "flight-delay", country: "UK", sources: [] }), true)).status, 400);
});
