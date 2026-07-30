import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()"
};

export function createStaticServer(rootDirectory = process.cwd()) {
  const root = resolve(rootDirectory);
  return createServer(async (request, response) => {
    const pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const file = resolve(root, relative);
    if (file !== root && !file.startsWith(`${root}${sep}`)) {
      response.writeHead(403, securityHeaders).end("Forbidden");
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        ...securityHeaders,
        "content-type": types[extname(file)] || "application/octet-stream"
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404, securityHeaders).end("Not found");
    }
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT || 4173);
  createStaticServer().listen(port, () => console.log(`UNI Mission Lab: http://localhost:${port}`));
}
