import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = join(root, "_site");
const publicFiles = [
  "index.html",
  "account.html",
  "account.js",
  "pilot.html",
  "pilot.js",
  "portfolio.html",
  "portfolio.js",
  "verify.html",
  "verify.js",
  "styles.css",
  "app.js",
  "core.js",
  "runtime.js",
  "protected-state.js",
  "runtime-config.public.js",
  "sw.js",
  "app.webmanifest",
  "assets/icon.svg",
  "schemas/mission-lab-state.schema.json",
  "schemas/goalos-bridge.schema.json",
  "schemas/proof-bundle.schema.json",
  "schemas/credential-collection.schema.json",
  "schemas/mission-portfolio.schema.json"
];

await rm(output, { recursive: true, force: true });

for (const relative of publicFiles) {
  const source = join(root, relative);
  const target = join(output, relative);
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target);
}

const supabaseUrl = String(process.env.UNI_SUPABASE_URL || "").replace(/\/+$/, "");
const supabaseAnonKey = String(process.env.UNI_SUPABASE_ANON_KEY || "");
if (Boolean(supabaseUrl) !== Boolean(supabaseAnonKey)) {
  throw new Error("UNI_SUPABASE_URL et UNI_SUPABASE_ANON_KEY doivent être fournis ensemble.");
}
if (supabaseUrl || supabaseAnonKey) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl) || supabaseAnonKey.length <= 20) {
    throw new Error("Configuration Supabase de déploiement invalide.");
  }
  const config = { provider: "supabase", url: supabaseUrl, anonKey: supabaseAnonKey };
  await writeFile(
    join(output, "runtime-config.public.js"),
    `// Generated during deployment. The anon key is public; RLS remains mandatory.\nwindow.UNI_RUNTIME_CONFIG = ${JSON.stringify(config, null, 2)};\n`,
    "utf8"
  );
}

console.log(`UNI public site: ${publicFiles.length} files copied to ${output}`);
