import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { CANDIDATE_EVAL_CASES } from "./fixtures/evidence-eval-v2";

test("evidence evaluation v2 candidates cover each pack-jurisdiction pair and stay pending review", () => {
  const expected = new Set([
    "flight-delay:IN", "flight-delay:EU", "flight-delay:US",
    "subscription-cancel:IN", "subscription-cancel:EU", "subscription-cancel:US",
    "surprise-bill:IN", "surprise-bill:EU", "surprise-bill:US",
  ]);
  const found = new Set<string>();
  assert.equal(CANDIDATE_EVAL_CASES.length, 9);

  for (const item of CANDIDATE_EVAL_CASES) {
    const pair = `${item.packId}:${item.jurisdiction}`;
    assert.ok(expected.has(pair), `unexpected pair ${pair}`);
    assert.ok(!found.has(pair), `duplicate pair ${pair}`);
    found.add(pair);
    assert.equal(item.datasetVersion, "2.0.0");
    assert.equal(item.status, "candidate_pending_expert_review");
    assert.equal(item.scenario.synthetic, true);
    assert.equal(item.review.status, "pending_expert_review");
    assert.deepEqual(item.review.reviewerLabels, []);
    assert.deepEqual(item.review.adjudicatedLabels, []);
    assert.equal(item.source.accessStatus, "opened_directly", `${item.id}: source not directly reviewed`);
    assert.equal(new URL(item.source.url).protocol, "https:");
    assert.ok(item.source.passages.length > 0, `${item.id}: no retained passage`);
    for (const passage of item.source.passages) {
      assert.equal(passage.excerptStart, 0);
      assert.equal(passage.excerptEnd, passage.excerpt.length);
      assert.ok(passage.excerpt.split(/\s+/).length <= 25, `${item.id}: excerpt too long`);
      assert.ok(passage.locator.length > 5);
      assert.equal(passage.excerptSha256, createHash("sha256").update(passage.excerpt, "utf8").digest("hex"));
    }
    assert.ok(item.source.caveat.length > 30);
    assert.ok(item.scenario.missingFacts.length > 0, `${item.id}: include an unknown needed fact`);
    assert.equal(item.claims.length, 2, `${item.id}: include narrow and overbroad claim candidates`);
    assert.ok(item.claims.every(claim => claim.passageIds.length > 0 && claim.passageIds.every(id => item.source.passages.some(passage => passage.id === id))));
    assert.ok(item.claims.every(claim => claim.proposedRelationRationale.length > 20));
    assert.ok(item.claims.every(claim => claim.proposedApplicability !== "supported"), `${item.id}: incomplete synthetic facts must not be labeled applicable`);
    assert.ok(item.claims.every(claim => claim.proposedApplicabilityRationale.length > 20));
  }

  assert.deepEqual(found, expected);
});
