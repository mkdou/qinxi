import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(root, "ios", "App", "App", "public");

if (existsSync(publicDir)) {
  rmSync(publicDir, { recursive: true, force: true });
  console.log(`Cleaned ${publicDir}`);
}
