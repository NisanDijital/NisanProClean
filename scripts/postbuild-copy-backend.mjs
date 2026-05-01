import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = resolve(root, "dist");

const copyPairs = [
  ["backend/api.php", "dist/api.php"],
  ["backend/admin.html", "dist/admin.html"],
  ["backend/config.example.php", "dist/config.example.php"],
  ["backend/schema.sql", "dist/schema.sql"],
  [".htaccess", "dist/.htaccess"],
];

for (const [from, to] of copyPairs) {
  const fromPath = resolve(root, from);
  const toPath = resolve(root, to);
  await mkdir(dirname(toPath), { recursive: true });
  await copyFile(fromPath, toPath);
}

console.log("postbuild: backend/admin files copied into dist");
