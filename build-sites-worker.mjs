import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const source = resolve(root, "worker-sites.mjs");
const target = resolve(root, "dist/server/index.js");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("Sites worker written to dist/server/index.js");
