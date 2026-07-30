import test from "node:test";
import assert from "node:assert/strict";
import { createDemoState } from "../core.js";
import { ensureProtectedIds, loadProtectedState, syncProtectedState } from "../protected-state.js";

const ids = {
  workspace: "11111111-1111-4111-8111-111111111111",
  mission: "22222222-2222-4222-8222-222222222222",
  user: "33333333-3333-4333-8333-333333333333",
  capability: "44444444-4444-4444-8444-444444444444",
  person: "55555555-5555-4555-8555-555555555555",
  contribution: "66666666-6666-4666-8666-666666666666"
};

test("les identifiants locaux deviennent des UUID cohérents avant synchronisation", () => {
  const state = createDemoState();
  const previousCapability = state.capabilities[0].id;
  const previousPerson = state.people[0].id;
  ensureProtectedIds(state);
  assert.match(state.capabilities[0].id, /^[0-9a-f-]{36}$/);
  assert.equal(state.people[0].capabilities.includes(previousCapability), false);
  assert.equal(state.contributions.some((item) => item.ownerId === previousPerson), false);
});

test("le chargement protégé reconstruit un état Mission Lab normalisé", async () => {
  const rows = {
    missions: [{
      id: ids.mission, workspace_id: ids.workspace, owner_id: ids.user, title: "Mission protégée",
      outcome: "Résultat", beneficiaries: "Communauté", participation: "hybride", status: "active",
      deadline: "2026-10-01", success_criteria: ["Mesure"], stop_conditions: ["Arrêt"],
      completed_criteria: [0], settings: { language: "fr" }, goalos: { enabled: true },
      created_at: "2026-07-30T00:00:00Z"
    }],
    capabilities: [{ id: ids.capability, name: "Analyse", required_level: 3, available_level: 2 }],
    participants: [{
      id: ids.person, display_name: "Maya", role_label: "Analyse", availability: "4 h",
      visibility: "mission", consent_at: "2026-07-30T00:00:00Z", withdrawn_at: null,
      capability_ids: [ids.capability]
    }],
    contributions: [{
      id: ids.contribution, participant_id: ids.person, title: "Analyser", description: "Données",
      status: "review", human_role: "Jugement", ai_use: "Structuration", effort: "3 h",
      capability_ids: [ids.capability]
    }],
    evidence: [{
      id: "77777777-7777-4777-8777-777777777777", contribution_id: ids.contribution,
      evidence_type: "document", reference: "Rapport", note: "Version 1", created_at: "2026-07-30T01:00:00Z"
    }],
    validations: [],
    audit_events: []
  };
  const runtime = { select: async (table) => rows[table] };
  const state = await loadProtectedState(runtime, ids.workspace, ids.mission);
  assert.equal(state.mission.title, "Mission protégée");
  assert.equal(state.people[0].capabilities[0], ids.capability);
  assert.equal(state.contributions[0].evidence.reference, "Rapport");
  assert.equal(state.__protected.missionOwnerId, ids.user);
  assert.equal(JSON.stringify(state).includes("__protected"), false);
});

test("la synchronisation utilise les tables normalisées et ajoute les preuves sans les modifier", async () => {
  const state = createDemoState();
  state.mission.id = ids.mission;
  const calls = [];
  const runtime = {
    upsert: async (table, records) => { calls.push({ operation: "upsert", table, records }); return records; },
    insert: async (table, records) => {
      calls.push({ operation: "insert", table, records });
      return records.map((record) => ({ id: crypto.randomUUID(), ...record }));
    },
    update: async (table, id, values) => {
      calls.push({ operation: "update", table, id, values });
      return [values];
    },
    select: async () => []
  };
  await syncProtectedState(runtime, state, {
    workspaceId: ids.workspace, userId: ids.user, missionOwnerId: ids.user
  });
  assert.ok(calls.some((call) => call.operation === "upsert" && call.table === "missions"));
  const contributionInsert = calls.find((call) => call.operation === "insert" && call.table === "contributions");
  assert.ok(contributionInsert);
  assert.equal(contributionInsert.records[0].created_by, ids.user);
  assert.ok(calls.some((call) => call.operation === "insert" && call.table === "evidence"));
  assert.ok(calls.some((call) => call.operation === "insert" && call.table === "validations"));
  assert.ok(calls.some((call) => call.operation === "insert" && call.table === "audit_events"));
  const proofWrites = calls.filter((call) => call.table === "evidence");
  assert.equal(proofWrites.every((call) => call.operation === "insert"), true);
});
