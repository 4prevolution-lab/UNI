import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");

test("le service worker ignore les requêtes externes", () => {
  assert.match(source, /requestUrl\.origin !== self\.location\.origin/);
});

test("seules les réponses locales réussies sont mises en cache", () => {
  assert.match(source, /response\.ok && response\.type === "basic"/);
  assert.match(source, /event\.waitUntil\(caches\.open/);
});

test("le repli vers l’application ne concerne que la navigation", () => {
  assert.match(source, /event\.request\.mode === "navigate"/);
});
