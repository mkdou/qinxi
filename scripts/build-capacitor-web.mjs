import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const files = [
  "index.html",
  "styles.css",
  "script.js",
  "sw.js",
  "manifest.webmanifest",
  "assets"
];

mkdirSync(dist, { recursive: true });

function emptyDir(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    rmSync(join(dir, entry.name), {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100
    });
  }
}

emptyDir(dist);

for (const file of files) {
  cpSync(join(root, file), join(dist, file), { recursive: true });
}

function removeDuplicateCopies(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (/ 2(\.|$)/.test(entry.name)) {
      rmSync(fullPath, { recursive: true, force: true });
      continue;
    }
    if (entry.isDirectory()) removeDuplicateCopies(fullPath);
  }
}

removeDuplicateCopies(dist);

console.log(`Built Capacitor web assets in ${dist}`);
