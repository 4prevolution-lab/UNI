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
  evaluatePilot,
  missionMetrics,
  normalizeState,
  pilotToMission,
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

test("un pilote n’est prêt que lorsque les dix conditions explicites passent", () => {
  const pilot = {
    community: "Collectif du quartier",
    participants: 20,
    owner: "Maya",
    problem: "Le gaspillage alimentaire local reste élevé et non mesuré.",
    beneficiaries: "Résidents du quartier",
    outcome: "Détourner et mesurer 500 kg de nourriture en six semaines.",
    durationWeeks: 6,
    participation: "hybride",
    consentPlan: true,
    validationMethod: "Le responsable vérifie chaque pesée avec une seconde personne."
  };
  const evaluation = evaluatePilot(pilot);
  assert.equal(evaluation.ready, true);
  assert.equal(evaluation.passed, 10);
  assert.equal(evaluatePilot({ ...pilot, participants: 80 }).ready, false);
});

test("une charte pilote devient une mission bornée", () => {
  const mission = pilotToMission({
    community: "Collectif",
    participants: 18,
    owner: "Maya",
    missionTitle: "Mission test",
    outcome: "Produire un résultat observable.",
    beneficiaries: "Quartier",
    durationWeeks: 4,
    startDate: "2026-08-01",
    participation: "bénévole",
    successCriteria: "Critère A\nCritère B",
    stopConditions: "Condition A",
    validationMethod: "Revue humaine",
    consentPlan: true
  });
  assert.equal(mission.deadline, "2026-08-29");
  assert.deepEqual(mission.successCriteria, ["Critère A", "Critère B"]);
  assert.equal(mission.pilot.participants, 18);
});
