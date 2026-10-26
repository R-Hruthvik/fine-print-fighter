import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { after, test } from "node:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const namespace = `test-${process.pid}`;
const reviewDir = path.join(repoRoot, "evidence-eval-reviews", namespace);
const script = path.join(repoRoot, "scripts", "evidence-eval-review.mjs");

function cli(...args: string[]) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, EVIDENCE_EVAL_REVIEW_NAMESPACE: namespace },
    maxBuffer: 1_000_000,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function fillLabels(packet: Record<string, unknown>, relation: string, applicability: string) {
  const cases = packet.cases as { labels: { relation: string | null; applicability: string | null; relationRationale: string; applicabilityRationale: string }[] }[];
  for (const candidate of cases) {
    for (const label of candidate.labels) {
      label.relation = relation;
      label.applicability = applicability;
      label.relationRationale = "This synthetic annotation records the reviewer's assessment of the linked passage relation.";
      label.applicabilityRationale = "This synthetic annotation records missing scenario facts and the limits on applying the passage.";
    }
  }
}

after(async () => {
  await rm(reviewDir, { recursive: true, force: true });
});

test("offline annotation workflow blinds proposed labels and requires two reviewers plus separate adjudication", async () => {
  await mkdir(path.dirname(reviewDir), { recursive: true });

  for (const alias of ["reviewer-one", "reviewer-two"]) {
    const exported = cli("export", "--reviewer", alias);
    assert.equal(exported.status, 0, exported.stderr);
    const filename = `${alias}.packet.json`;
    const filePath = path.join(reviewDir, filename);
    const packetText = await readFile(filePath, "utf8");
    assert.doesNotMatch(packetText, /proposedRelation|proposedApplicability|Rationale from candidate/i);
    let packet = JSON.parse(packetText) as Record<string, unknown>;

    if (alias === "reviewer-one") {
      const original = packetText;
      const cases = packet.cases as { snapshot: { scenario: { summary: string } } }[];
      cases[0].snapshot.scenario.summary = "Edited content must not be imported.";
      await writeFile(filePath, JSON.stringify(packet, null, 2));
      const tampered = cli("import", filename);
      assert.notEqual(tampered.status, 0);
      assert.match(tampered.stderr, /content was edited/i);
      await writeFile(filePath, original);
      packet = JSON.parse(original) as Record<string, unknown>;
    }

    const labels = alias === "reviewer-one" ? ["supports", "not_established"] : ["opposes", "uncertain"];
    fillLabels(packet, labels[0], labels[1]);
    await writeFile(filePath, JSON.stringify(packet, null, 2));
    const imported = cli("import", filename);
    assert.equal(imported.status, 0, imported.stderr);
    assert.match(imported.stdout, /18 labels/);
  }

  const duplicateReviewer = cli("import", "reviewer-one.packet.json");
  assert.notEqual(duplicateReviewer.status, 0);
  assert.match(duplicateReviewer.stderr, /two independent reviewers are already imported/i);

  const template = cli("adjudication-template", "--reviewer", "reviewer-three");
  assert.equal(template.status, 0, template.stderr);
  const adjudicationPath = path.join(reviewDir, "adjudication.packet.json");
  const decisions = JSON.parse(await readFile(adjudicationPath, "utf8")) as {
    decisions: { relation: string | null; applicability: string | null; relationRationale: string; applicabilityRationale: string }[];
  };
  assert.equal(decisions.decisions.length, 18);
  for (const decision of decisions.decisions) {
    decision.relation = "qualifies";
    decision.applicability = "uncertain";
    decision.relationRationale = "The third reviewer assessed the passage relation after comparing both independent labels.";
    decision.applicabilityRationale = "The third reviewer kept application uncertain because the synthetic scenario omits facts.";
  }
  await writeFile(adjudicationPath, JSON.stringify(decisions, null, 2));
  const adjudicated = cli("adjudicate", "adjudication.packet.json");
  assert.equal(adjudicated.status, 0, adjudicated.stderr);

  const adjudicationLabelsPath = path.join(reviewDir, "adjudication.labels.json");
  const goodAdjudication = await readFile(adjudicationLabelsPath, "utf8");
  const invalidAdjudication = JSON.parse(goodAdjudication) as { decisions: { claimId: string }[] };
  invalidAdjudication.decisions[0].claimId = "unknown-claim";
  await writeFile(adjudicationLabelsPath, JSON.stringify(invalidAdjudication, null, 2));
  const rejectedReport = cli("report");
  assert.notEqual(rejectedReport.status, 0);
  assert.match(rejectedReport.stderr, /unexpected or duplicate decision/i);
  await writeFile(adjudicationLabelsPath, goodAdjudication);

  const summary = cli("report");
  assert.equal(summary.status, 0, summary.stderr);
  const report = JSON.parse(summary.stdout) as { totalClaims: number; claimsWithTwoIndependentLabels: number; disagreementsAwaitingAdjudication: number; annotationsComplete: boolean; holdoutPromotionAllowed: boolean };
  assert.equal(report.totalClaims, 18);
  assert.equal(report.claimsWithTwoIndependentLabels, 18);
  assert.equal(report.disagreementsAwaitingAdjudication, 0);
  assert.equal(report.annotationsComplete, true);
  assert.equal(report.holdoutPromotionAllowed, false);

  const escapedPath = cli("import", "../outside.json");
  assert.notEqual(escapedPath.status, 0);
  assert.match(escapedPath.stderr, /paths and traversal/i);
});
