import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/0002_workspace_invites.sql", import.meta.url), "utf8");

test("les invitations stockent une empreinte et jamais le code en clair", () => {
  assert.match(sql, /code_hash text not null unique/i);
  assert.match(sql, /digest\(generated_code, 'sha256'\)/i);
  const tableDefinition = sql.match(/create table public\.workspace_invites \(([\s\S]*?)\n\);/i)?.[1] || "";
  assert.doesNotMatch(tableDefinition, /invite_code/i);
});

test("les invitations ont une expiration, une limite et une révocation", () => {
  assert.match(sql, /expires_at timestamptz not null/i);
  assert.match(sql, /max_uses integer not null/i);
  assert.match(sql, /revoked_at timestamptz/i);
  assert.match(sql, /invitation\.use_count >= invitation\.max_uses/i);
});

test("un facilitateur ne peut pas inviter un autre facilitateur", () => {
  assert.match(sql, /invited_role = 'facilitator' and caller_role <> 'owner'/i);
});

test("rejoindre exige profil et consentement daté", () => {
  assert.match(sql, /A UNI profile is required before joining/i);
  assert.match(sql, /values \(invitation\.workspace_id, auth\.uid\(\), invitation\.role, now\(\)\)/i);
});

test("une adhésion existante conserve son rôle", () => {
  const conflictClause = sql.match(/on conflict \(workspace_id, user_id\) do update([\s\S]*?)update public\.workspace_invites/i)?.[1] || "";
  assert.doesNotMatch(conflictClause, /role\s*=/i);
});
