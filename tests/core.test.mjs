import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGoalOSExport,
  capabilityGaps,
  claimLevel,
  createDemoState,
  missionMetrics,
  normalizeState
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
