import { strict as assert } from "node:assert";
import { test } from "node:test";
import { SOURCE_PROFILES, getSourceProfile } from "../src/lib/source-registry";

test("source registry has a reviewed, bounded profile for all pack and jurisdiction pairs", () => {
  assert.equal(SOURCE_PROFILES.length, 9);
  for (const packId of ["flight-delay", "subscription-cancel", "surprise-bill"] as const) {
    for (const jurisdiction of ["IN", "EU", "US"] as const) {
      const profile = getSourceProfile(packId, jurisdiction);
      assert.ok(profile, `${packId} / ${jurisdiction} source profile is missing`);
      assert.match(profile.reviewedOn, /^2026-10-26$/);
      assert.ok(profile.sources.length > 0);
      assert.ok(profile.limitation.length >= 40);
      for (const source of profile.sources) {
        assert.equal(new URL(source.url).protocol, "https:");
        assert.ok(source.title.length > 5);
        assert.ok(source.scope.length > 20);
      }
    }
  }
});

test("limited source profiles say where their material does not generalize", () => {
  const usMedical = getSourceProfile("surprise-bill", "US");
  assert.equal(usMedical?.coverage, "limited");
  assert.match(usMedical?.limitation ?? "", /medical bills only/i);
  const indiaSubscription = getSourceProfile("subscription-cancel", "IN");
  assert.equal(indiaSubscription?.coverage, "limited");
  assert.match(indiaSubscription?.limitation ?? "", /universal subscription/i);
});
