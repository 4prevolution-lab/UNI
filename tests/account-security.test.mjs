import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../account.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("le jeton protégé utilise sessionStorage et jamais localStorage", () => {
  assert.match(source, /sessionStorage\.setItem\(SESSION_KEY/);
  assert.doesNotMatch(source, /localStorage\.(setItem|getItem)\([^)]*(session|token)/i);
});

test("les paramètres d’authentification sont retirés de l’URL", () => {
  assert.match(source, /history\.replaceState/);
});

test("aucune clé service_role n’est présente dans le client", () => {
  assert.doesNotMatch(source, /service_role/i);
});

test("une mission protégée n’est jamais recopiée dans localStorage", () => {
  assert.match(appSource, /if \(protectedContext\) ensureProtectedIds\(state\);\s*else localStorage\.setItem/);
  assert.doesNotMatch(appSource, /loadProtectedState[\s\S]{0,600}localStorage\.setItem/);
});
