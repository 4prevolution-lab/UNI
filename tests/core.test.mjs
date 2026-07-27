import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGoalOSExport,
  buildCredentialDrafts,
  buildProofBundle,
  canonicalize,
  capabilityGaps,
  claimLevel,
  compileContributionSuggestions,
  createDemoState,
  missionMetrics,
  normalizeState,
  verifyProofBundle
} from "../core.js";

test("les métriques distinguent preuve et validation", () => {
  const metrics = missionMetrics(createDemoState());
  assert.equal(metrics.total, 3);
  assert.equal(metrics.withEvidence, 2);
  assert.equal(metrics.validated, 1);
  assert.equal(metrics.evidenceRate, 67);
  assert.equal(metrics.validationRate, 33);
});

test("les lacunes de capacités sont classées", () => {
  const gaps = capabilityGaps(createDemoState());
  assert.ok(gaps.length >= 1);
  assert.ok(gaps.every((gap) => gap.gap > 0));
});

test("le niveau d’affirmation ne confond pas preuve et validation", () => {
  const state = createDemoState();
  assert.equal(claimLevel(state.contributions[0]), "validated");
  assert.equal(claimLevel(state.contributions[1]), "demonstrated");
  assert.equal(claimLevel(state.contributions[2]), "observed");
});

test("l’export GoalOS conserve les garde-fous", () => {
  const state = createDemoState();
  const output = buildGoalOSExport(state);
  assert.equal(output.mission.id, state.mission.id);
  assert.equal(output.contributions.length, 3);
  assert.equal(output.proofPosture.ready, false);
  assert.equal(output.capabilities.find((item) => item.id === "cap-logistics").disposition, "UPGRADE");
});

test("la normalisation rejette un état vide", () => {
  assert.throws(() => normalizeState(null));
});

test("le compilateur local cible les lacunes sans attribuer de responsable", () => {
  const state = createDemoState();
  const suggestions = compileContributionSuggestions(state);
  assert.ok(suggestions.length >= 1);
  assert.equal(suggestions[0].ownerId, "");
  assert.equal(suggestions[0].status, "planned");
  assert.match(suggestions[0].aiUse, /Assistant local/);
  assert.ok(suggestions.every((suggestion) => suggestion.capabilityIds.length === 1));
});

test("la sérialisation canonique ne dépend pas de l’ordre des clés", () => {
  assert.equal(canonicalize({ b: 2, a: 1 }), canonicalize({ a: 1, b: 2 }));
});

test("un ProofBundle intact est vérifiable et une altération est détectée", async () => {
  const bundle = await buildProofBundle(createDemoState());
  assert.equal(bundle.algorithm, "SHA-256");
  assert.equal(await verifyProofBundle(bundle), true);
  bundle.payload.mission.title = "Titre falsifié";
  assert.equal(await verifyProofBundle(bundle), false);
});

test("les attestations ne sont créées que pour les validations acceptées et restent non signées", () => {
  const drafts = buildCredentialDrafts(createDemoState());
  assert.equal(drafts.length, 1);
  assert.ok(drafts[0].type.includes("OpenBadgeCredential"));
  assert.equal(drafts[0].credentialStatus.status, "unsignedDraft");
  assert.equal("proof" in drafts[0], false);
});
