import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/0001_uni_core.sql", import.meta.url), "utf8");

test("toutes les tables sensibles activent RLS", () => {
  for (const table of ["workspaces", "memberships", "missions", "participants", "contributions", "evidence", "validations", "audit_events"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
});

test("les preuves, validations et audits n’ont aucune politique de modification destructive", () => {
  for (const table of ["evidence", "validations", "audit_events"]) {
    assert.doesNotMatch(sql, new RegExp(`policy[\\s\\S]{0,100}on public\\.${table} for (update|delete)`, "i"));
  }
});

test("la chaîne d’audit est calculée par un déclencheur serveur", () => {
  assert.match(sql, /create trigger uni_audit_hash_before_insert/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /digest\(/i);
});

test("le propriétaire initial est créé atomiquement", () => {
  assert.match(sql, /create trigger uni_workspace_owner_after_insert/i);
  assert.match(sql, /insert into public\.memberships/i);
});
