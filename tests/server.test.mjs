import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { createStaticServer } from "../server.mjs";

async function withServer(run) {
  const server = createStaticServer(fileURLToPath(new URL("..", import.meta.url)));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("le serveur livre l’application et le manifeste avec les bons types", async () => {
  await withServer(async (origin) => {
    const page = await fetch(`${origin}/`);
    const manifest = await fetch(`${origin}/app.webmanifest`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type"), /^text\/html/);
    assert.equal(manifest.headers.get("content-type"), "application/manifest+json; charset=utf-8");
    assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  });
});

test("le serveur ne livre aucun fichier hors de la racine UNI", async () => {
  await withServer(async (origin) => {
    const response = await fetch(`${origin}/%2e%2e/USER.md`);
    assert.equal(response.status, 404);
  });
});
