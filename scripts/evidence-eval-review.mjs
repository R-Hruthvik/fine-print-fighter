import { createHash } from "node:crypto";
import { lstat, mkdir, open, readFile, readdir, realpath, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANDIDATE_EVAL_CASES = JSON.parse(await readFile(path.join(repoRoot, "tests", "fixtures", "evidence-eval-v2.json"), "utf8"));
const reviewRoot = path.join(repoRoot, "evidence-eval-reviews");
const reviewNamespace = process.env.EVIDENCE_EVAL_REVIEW_NAMESPACE ?? "v2";
if (!/^[a-z0-9][a-z0-9_-]{0,48}$/i.test(reviewNamespace)) fail("Invalid review namespace.");
const reviewDir = path.join(reviewRoot, reviewNamespace);
const datasetVersion = "2.0.0";
const packetSchema = "fine-print-evidence-review/1";
const labelSchema = "fine-print-evidence-labels/1";
const relationLabels = new Set(["supports", "opposes", "qualifies", "mentions", "insufficient"]);
const applicabilityLabels = new Set(["supported", "not_established", "uncertain"]);
const candidateMap = new Map(CANDIDATE_EVAL_CASES.map(item => [item.id, item]));
const allClaimKeys = CANDIDATE_EVAL_CASES.flatMap(item => item.claims.map(claim => `${item.id}:${claim.id}`));
const aliasPattern = /^[a-z0-9][a-z0-9_-]{1,31}$/i;
const filenamePattern = /^[a-z0-9][a-z0-9._-]{0,95}\.json$/i;

function fail(message) {
  throw new Error(message);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonical(value), "utf8").digest("hex");
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertKeys(value, expected, where) {
  if (!isRecord(value)) fail(`${where} must be an object.`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (canonical(actual) !== canonical(wanted)) fail(`${where} has missing or unknown fields.`);
}

function validateAlias(value, field = "reviewerAlias") {
  if (typeof value !== "string" || !aliasPattern.test(value) || value.includes("@")) {
    fail(`${field} must be a pseudonymous alias using 2–32 letters, digits, underscores, or hyphens.`);
  }
  return value;
}

function buildBlindSnapshot(candidate) {
  const passageById = new Map(candidate.source.passages.map(passage => [passage.id, passage]));
  return {
    caseId: candidate.id,
    packId: candidate.packId,
    jurisdiction: candidate.jurisdiction,
    scenario: candidate.scenario,
    source: {
      url: candidate.source.url,
      title: candidate.source.title,
      publisher: candidate.source.publisher,
      authority: candidate.source.authority,
      sourceKind: candidate.source.sourceKind,
      reviewedOn: candidate.source.reviewedOn,
      accessStatus: candidate.source.accessStatus,
      caveat: candidate.source.caveat,
    },
    claims: candidate.claims.map(claim => ({
      claimId: claim.id,
      statement: claim.statement,
      speaker: claim.speaker,
      kind: claim.kind,
      passages: claim.passageIds.map(id => {
        const passage = passageById.get(id);
        if (!passage) fail(`${candidate.id}: claim references missing passage ${id}.`);
        return passage;
      }),
    })),
  };
}

function blankLabels(candidate) {
  return candidate.claims.map(claim => ({
    claimId: claim.id,
    relation: null,
    applicability: null,
    relationRationale: "",
    applicabilityRationale: "",
  }));
}

async function ensureReviewDir() {
  await mkdir(reviewRoot, { recursive: true, mode: 0o700 });
  const parentStat = await lstat(reviewRoot);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) fail("Review root must be a real directory.");
  await mkdir(reviewDir, { recursive: true, mode: 0o700 });
  const stat = await lstat(reviewDir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail("Review directory must be a real directory.");
}

async function safeRead(filename) {
  if (typeof filename !== "string" || !filenamePattern.test(filename) || filename.includes("..")) {
    fail("Use a JSON filename inside evidence-eval-reviews/v2; paths and traversal are not accepted.");
  }
  const filePath = path.join(reviewDir, filename);
  const stat = await lstat(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1_000_000) fail("Review file must be a regular file no larger than 1 MB.");
  const [realPath, realReviewDir] = await Promise.all([realpath(filePath), realpath(reviewDir)]);
  if (path.dirname(realPath) !== realReviewDir) fail("Review file resolves outside the review directory.");
  const contents = await readFile(filePath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch {
    fail("Review file is not valid JSON.");
  }
  return parsed;
}

async function safeWrite(filename, value, { replace = false } = {}) {
  if (!filenamePattern.test(filename) || filename.includes("..")) fail("Unsafe review output filename.");
  await ensureReviewDir();
  const target = path.join(reviewDir, filename);
  const temporary = path.join(reviewDir, `.${filename}.${process.pid}.${Date.now()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    if (!replace) {
      try { await lstat(target); fail(`${filename} already exists; refusing to overwrite reviewer work.`); }
      catch (error) { if (error?.code !== "ENOENT") throw error; }
    }
    await rename(temporary, target);
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function buildPacket(reviewerAlias) {
  return {
    schema: packetSchema,
    datasetVersion,
    reviewerAlias,
    cases: CANDIDATE_EVAL_CASES.map(candidate => ({
      candidateSha256: digest(candidate),
      snapshot: buildBlindSnapshot(candidate),
      labels: blankLabels(candidate),
    })),
  };
}

function validatePacket(packet) {
  assertKeys(packet, ["schema", "datasetVersion", "reviewerAlias", "cases"], "packet");
  if (packet.schema !== packetSchema || packet.datasetVersion !== datasetVersion) fail("Packet schema or dataset version does not match v2.0.0.");
  const reviewerAlias = validateAlias(packet.reviewerAlias);
  if (!Array.isArray(packet.cases) || packet.cases.length !== CANDIDATE_EVAL_CASES.length) fail("Packet must contain every candidate case exactly once.");
  const seenCases = new Set();
  const flattened = [];

  for (const item of packet.cases) {
    assertKeys(item, ["candidateSha256", "snapshot", "labels"], "packet case");
    if (!isRecord(item.snapshot) || typeof item.snapshot.caseId !== "string") fail("Packet case has no case ID.");
    const candidate = candidateMap.get(item.snapshot.caseId);
    if (!candidate || seenCases.has(candidate.id)) fail("Packet has an unknown or duplicate case ID.");
    seenCases.add(candidate.id);
    if (item.candidateSha256 !== digest(candidate)) fail(`${candidate.id}: candidate version digest mismatch.`);
    if (canonical(item.snapshot) !== canonical(buildBlindSnapshot(candidate))) fail(`${candidate.id}: source or case content was edited; restore the exported packet before import.`);
    if (!Array.isArray(item.labels) || item.labels.length !== candidate.claims.length) fail(`${candidate.id}: every claim needs one label row.`);
    const expectedClaimIds = new Set(candidate.claims.map(claim => claim.id));
    const seenClaimIds = new Set();
    for (const label of item.labels) {
      assertKeys(label, ["claimId", "relation", "applicability", "relationRationale", "applicabilityRationale"], "claim label");
      if (typeof label.claimId !== "string" || !expectedClaimIds.has(label.claimId) || seenClaimIds.has(label.claimId)) fail(`${candidate.id}: unknown or duplicate claim ID.`);
      seenClaimIds.add(label.claimId);
      if (!relationLabels.has(label.relation) || !applicabilityLabels.has(label.applicability)) fail(`${candidate.id}/${label.claimId}: select a relation and applicability label.`);
      if (typeof label.relationRationale !== "string" || label.relationRationale.trim().length < 20 || label.relationRationale.length > 2000) fail(`${candidate.id}/${label.claimId}: relation rationale must be 20–2000 characters.`);
      if (typeof label.applicabilityRationale !== "string" || label.applicabilityRationale.trim().length < 20 || label.applicabilityRationale.length > 2000) fail(`${candidate.id}/${label.claimId}: applicability rationale must be 20–2000 characters.`);
      flattened.push({ caseId: candidate.id, ...label, candidateSha256: item.candidateSha256 });
    }
  }
  if (seenCases.size !== CANDIDATE_EVAL_CASES.length) fail("Packet is missing candidate cases.");
  return { reviewerAlias, labels: flattened };
}

async function readReviewerFiles() {
  await ensureReviewDir();
  const files = (await readdir(reviewDir)).filter(name => name !== "adjudication.labels.json" && /^[a-z0-9][a-z0-9_-]{1,31}\.labels\.json$/i.test(name));
  const reviews = [];
  for (const filename of files) {
    const item = await safeRead(filename);
    assertKeys(item, ["schema", "datasetVersion", "reviewerAlias", "labels"], "reviewer labels");
    if (item.schema !== labelSchema || item.datasetVersion !== datasetVersion || !Array.isArray(item.labels)) fail(`${filename}: invalid reviewer sidecar.`);
    const alias = validateAlias(item.reviewerAlias);
    if (filename !== `${alias}.labels.json`) fail(`${filename}: alias does not match filename.`);
    const seen = new Set();
    for (const label of item.labels) {
      assertKeys(label, ["caseId", "claimId", "relation", "applicability", "relationRationale", "applicabilityRationale", "candidateSha256"], "stored reviewer label");
      const key = `${label.caseId}:${label.claimId}`;
      const candidate = candidateMap.get(label.caseId);
      const claim = candidate?.claims.find(entry => entry.id === label.claimId);
      if (!claim || seen.has(key) || label.candidateSha256 !== digest(candidate)) fail(`${filename}: unknown, duplicate, or stale label.`);
      if (!relationLabels.has(label.relation) || !applicabilityLabels.has(label.applicability)) fail(`${filename}: invalid label value.`);
      if (typeof label.relationRationale !== "string" || label.relationRationale.trim().length < 20 || label.relationRationale.length > 2000) fail(`${filename}: invalid relation rationale.`);
      if (typeof label.applicabilityRationale !== "string" || label.applicabilityRationale.trim().length < 20 || label.applicabilityRationale.length > 2000) fail(`${filename}: invalid applicability rationale.`);
      seen.add(key);
    }
    reviews.push(item);
  }
  const aliases = new Set(reviews.map(item => item.reviewerAlias));
  if (aliases.size !== reviews.length) fail("Duplicate reviewer aliases found.");
  return reviews;
}

function disagreementKeys(reviews) {
  const grouped = new Map();
  for (const review of reviews) {
    for (const label of review.labels) {
      const key = `${label.caseId}:${label.claimId}`;
      const rows = grouped.get(key) ?? [];
      rows.push({ alias: review.reviewerAlias, ...label });
      grouped.set(key, rows);
    }
  }
  return [...grouped.entries()].filter(([, rows]) => rows.length >= 2 && rows.some(row => row.relation !== rows[0].relation || row.applicability !== rows[0].applicability));
}

function printUsage() {
  console.log(`Evidence evaluation v2 review workflow (offline)\n\nCommands:\n  npm run evidence-eval:review -- export --reviewer <alias>\n  npm run evidence-eval:review -- import <packet.json>\n  npm run evidence-eval:review -- report\n  npm run evidence-eval:review -- adjudication-template --reviewer <alias>\n  npm run evidence-eval:review -- adjudicate <decisions.json>\n\nReview files stay under evidence-eval-reviews/v2/ and are git-ignored.`);
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function exportPacket(args) {
  const reviewerAlias = validateAlias(option(args, "--reviewer"));
  const packet = buildPacket(reviewerAlias);
  await safeWrite(`${reviewerAlias}.packet.json`, packet);
  console.log(`Wrote blinded packet for ${reviewerAlias}: evidence-eval-reviews/v2/${reviewerAlias}.packet.json`);
  console.log("The packet excludes proposed labels and rationales. Labels are not approved ground truth.");
}

async function importPacket(args) {
  const filename = args[0];
  const packet = await safeRead(filename);
  const { reviewerAlias, labels } = validatePacket(packet);
  const existing = await readReviewerFiles();
  if (existing.length >= 2) fail("Two independent reviewers are already imported; use adjudication for disagreements.");
  if (existing.some(review => review.reviewerAlias === reviewerAlias)) fail("That reviewer alias already has an imported sidecar.");
  const sidecar = { schema: labelSchema, datasetVersion, reviewerAlias, labels };
  await safeWrite(`${reviewerAlias}.labels.json`, sidecar);
  console.log(`Imported ${labels.length} labels for ${reviewerAlias}.`);
  console.log("Candidate labels remain pending expert review; run report to inspect coverage and agreement.");
}

async function report() {
  const reviews = await readReviewerFiles();
  const grouped = new Map();
  for (const review of reviews) {
    for (const label of review.labels) {
      const key = `${label.caseId}:${label.claimId}`;
      const rows = grouped.get(key) ?? [];
      rows.push({ alias: review.reviewerAlias, ...label });
      grouped.set(key, rows);
    }
  }
  const disagreements = disagreementKeys(reviews);
  let adjudicated = [];
  try {
    const decisions = await safeRead("adjudication.labels.json");
    assertKeys(decisions, ["schema", "datasetVersion", "adjudicatorAlias", "decisions"], "adjudication labels");
    if (decisions.schema !== "fine-print-evidence-adjudication/1" || decisions.datasetVersion !== datasetVersion || !Array.isArray(decisions.decisions)) fail("Invalid adjudication sidecar.");
    const adjudicatorAlias = validateAlias(decisions.adjudicatorAlias, "adjudicator alias");
    if (reviews.length < 2 || reviews.some(review => review.reviewerAlias === adjudicatorAlias)) fail("Stored adjudication must use a third distinct alias after two reviews.");
    const expectedDisagreements = new Map(disagreementKeys(reviews));
    if (decisions.decisions.length !== expectedDisagreements.size) fail("Stored adjudication does not cover the exact disagreement set.");
    const seenDecisions = new Set();
    for (const decision of decisions.decisions) {
      assertKeys(decision, ["caseId", "claimId", "relation", "applicability", "relationRationale", "applicabilityRationale", "adjudicatorAlias"], "stored adjudication decision");
      const key = `${decision.caseId}:${decision.claimId}`;
      const candidate = candidateMap.get(decision.caseId);
      const claim = candidate?.claims.find(item => item.id === decision.claimId);
      if (!expectedDisagreements.has(key) || !claim || seenDecisions.has(key)) fail("Stored adjudication has an unexpected or duplicate decision.");
      if (decision.adjudicatorAlias !== adjudicatorAlias || !relationLabels.has(decision.relation) || !applicabilityLabels.has(decision.applicability)) fail("Stored adjudication contains an invalid alias or label.");
      if (typeof decision.relationRationale !== "string" || decision.relationRationale.trim().length < 20 || decision.relationRationale.length > 2000) fail("Stored adjudication has an invalid relation rationale.");
      if (typeof decision.applicabilityRationale !== "string" || decision.applicabilityRationale.trim().length < 20 || decision.applicabilityRationale.length > 2000) fail("Stored adjudication has an invalid applicability rationale.");
      seenDecisions.add(key);
    }
    adjudicated = decisions.decisions;
  } catch (error) {
    if (!String(error.message).includes("ENOENT")) throw error;
  }
  const adjudicatedKeys = new Set(adjudicated.map(item => `${item.caseId}:${item.claimId}`));
  const coveredTwice = allClaimKeys.filter(key => (grouped.get(key)?.length ?? 0) >= 2).length;
  const unresolvedDisagreements = disagreements.filter(([key]) => !adjudicatedKeys.has(key)).length;
  const complete = coveredTwice === allClaimKeys.length && unresolvedDisagreements === 0;
  console.log(JSON.stringify({
    datasetVersion,
    totalClaims: allClaimKeys.length,
    reviewers: reviews.map(item => item.reviewerAlias).sort(),
    claimsWithTwoIndependentLabels: coveredTwice,
    relationAgreementCases: allClaimKeys.filter(key => {
      const rows = grouped.get(key) ?? [];
      return rows.length >= 2 && rows.every(row => row.relation === rows[0].relation);
    }).length,
    applicabilityAgreementCases: allClaimKeys.filter(key => {
      const rows = grouped.get(key) ?? [];
      return rows.length >= 2 && rows.every(row => row.applicability === rows[0].applicability);
    }).length,
    disagreementsAwaitingAdjudication: unresolvedDisagreements,
    annotationsComplete: complete,
    status: "candidate_labels_only",
    qualifiedReviewerSignoffRequired: true,
    holdoutPromotionAllowed: false,
  }, null, 2));
}

async function adjudicationTemplate(args) {
  const adjudicatorAlias = validateAlias(option(args, "--reviewer"), "adjudicator alias");
  const reviews = await readReviewerFiles();
  if (reviews.some(review => review.reviewerAlias === adjudicatorAlias)) fail("Adjudicator alias must differ from both reviewers.");
  const disagreements = disagreementKeys(reviews);
  const template = {
    schema: "fine-print-evidence-adjudication/1",
    datasetVersion,
    adjudicatorAlias,
    decisions: disagreements.map(([key, rows]) => {
      const [caseId, claimId] = key.split(":");
      return { caseId, claimId, reviewerLabels: rows.map(row => ({ alias: row.alias, relation: row.relation, applicability: row.applicability })), relation: null, applicability: null, relationRationale: "", applicabilityRationale: "" };
    }),
  };
  await safeWrite("adjudication.packet.json", template);
  console.log(`Wrote ${disagreements.length} disagreement row(s) for independent adjudication.`);
  console.log("The adjudication file includes prior labels by design; the adjudicator must be a distinct qualified reviewer.");
}

async function adjudicate(args) {
  const filename = args[0];
  const input = await safeRead(filename);
  assertKeys(input, ["schema", "datasetVersion", "adjudicatorAlias", "decisions"], "adjudication packet");
  if (input.schema !== "fine-print-evidence-adjudication/1" || input.datasetVersion !== datasetVersion || !Array.isArray(input.decisions)) fail("Adjudication schema or dataset version is invalid.");
  const alias = validateAlias(input.adjudicatorAlias, "adjudicator alias");
  const reviews = await readReviewerFiles();
  if (reviews.length < 2 || reviews.some(review => review.reviewerAlias === alias)) fail("Adjudication requires two reviewers and a third distinct alias.");
  const disagreements = disagreementKeys(reviews);
  const expected = new Map(disagreements);
  if (input.decisions.length !== expected.size) fail("Adjudication file must resolve every disagreement exactly once.");
  const seen = new Set();
  const output = [];
  for (const decision of input.decisions) {
    assertKeys(decision, ["caseId", "claimId", "reviewerLabels", "relation", "applicability", "relationRationale", "applicabilityRationale"], "adjudication decision");
    const key = `${decision.caseId}:${decision.claimId}`;
    if (!expected.has(key) || seen.has(key)) fail("Adjudication packet contains an unexpected or duplicate disagreement.");
    const expectedLabels = expected.get(key);
    if (!Array.isArray(decision.reviewerLabels) || canonical(decision.reviewerLabels) !== canonical(expectedLabels.map(row => ({ alias: row.alias, relation: row.relation, applicability: row.applicability })))) fail("Adjudication packet does not preserve the two imported reviewer labels.");
    if (!relationLabels.has(decision.relation) || !applicabilityLabels.has(decision.applicability)) fail("Select a final relation and applicability label for every disagreement.");
    if (typeof decision.relationRationale !== "string" || decision.relationRationale.trim().length < 20 || decision.relationRationale.length > 2000) fail("Adjudication relation rationale must be 20–2000 characters.");
    if (typeof decision.applicabilityRationale !== "string" || decision.applicabilityRationale.trim().length < 20 || decision.applicabilityRationale.length > 2000) fail("Adjudication applicability rationale must be 20–2000 characters.");
    seen.add(key);
    output.push({ caseId: decision.caseId, claimId: decision.claimId, relation: decision.relation, applicability: decision.applicability, relationRationale: decision.relationRationale, applicabilityRationale: decision.applicabilityRationale, adjudicatorAlias: alias });
  }
  if (seen.size !== expected.size) fail("Adjudication file must resolve every disagreement exactly once.");
  await safeWrite("adjudication.labels.json", { schema: "fine-print-evidence-adjudication/1", datasetVersion, adjudicatorAlias: alias, decisions: output });
  console.log(`Recorded ${output.length} adjudication decision(s). Candidate status remains pending qualified sign-off.`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  await ensureReviewDir();
  if (command === "export") return exportPacket(args);
  if (command === "import") return importPacket(args);
  if (command === "report") return report();
  if (command === "adjudication-template") return adjudicationTemplate(args);
  if (command === "adjudicate") return adjudicate(args);
  printUsage();
}

main().catch(error => {
  console.error(`Evidence review error: ${error.message}`);
  process.exitCode = 1;
});
