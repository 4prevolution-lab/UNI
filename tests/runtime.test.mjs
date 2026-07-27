import test from "node:test";
import assert from "node:assert/strict";
import { createRuntime, runtimeConfiguration } from "../runtime.js";

test("le runtime reste local sans configuration", () => {
  const configuration = runtimeConfiguration();
  assert.equal(configuration.mode, "local");
  assert.equal(configuration.configured, false);
});

test("les valeurs d’exemple ne peuvent pas activer le runtime protégé", () => {
  const configuration = runtimeConfiguration({
    provider: "supabase",
    url: "https://YOUR_PROJECT.supabase.co",
    anonKey: "YOUR_PUBLIC_ANON_KEY"
  });
  assert.equal(configuration.mode, "local");
});

test("une configuration Supabase valide active le mode protégé", () => {
  const configuration = runtimeConfiguration({
    provider: "supabase",
    url: "https://uni-project.supabase.co/",
    anonKey: "public-anon-key-longer-than-twenty-characters"
  });
  assert.equal(configuration.mode, "protected");
  assert.equal(configuration.url, "https://uni-project.supabase.co");
});

test("aucune requête distante n’est possible sans session", async () => {
  const runtime = createRuntime({
    mode: "protected",
    configured: true,
    provider: "supabase",
    url: "https://uni-project.supabase.co",
    anonKey: "public-anon-key-longer-than-twenty-characters"
  });
  await assert.rejects(runtime.listWorkspaces(), /Session authentifiée requise/);
});
