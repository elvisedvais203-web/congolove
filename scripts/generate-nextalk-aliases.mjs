import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const targets = [
  "apps/frontend/src",
  "apps/backend/src",
  "packages/shared/src"
];

const includeExt = new Set([".ts", ".tsx"]);
const skipExact = new Set([
  "page.tsx",
  "layout.tsx",
  "route.ts",
  "loading.tsx",
  "error.tsx",
  "not-found.tsx"
]);
const skipDirNames = new Set(["node_modules", ".next", "dist", "build", ".turbo"]);

function toAliasBase(baseName) {
  const ext = path.extname(baseName);
  const stem = path.basename(baseName, ext);
  if (stem.startsWith("nextalk")) return null;
  return `nextalk${stem.toLowerCase()}${ext}`;
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirNames.has(entry.name)) {
        await walk(full, out);
      }
      continue;
    }
    const ext = path.extname(entry.name);
    if (!includeExt.has(ext)) continue;
    out.push(full);
  }
  return out;
}

async function ensureAliasFile(absPath) {
  const relDir = path.dirname(absPath);
  const base = path.basename(absPath);
  if (skipExact.has(base)) return null;

  const aliasBase = toAliasBase(base);
  if (!aliasBase) return null;

  const aliasAbs = path.join(relDir, aliasBase);
  try {
    await fs.access(aliasAbs);
    return null;
  } catch {
    // continue
  }

  const stem = path.basename(base, path.extname(base));
  const content = `export * from "./${stem}";\n`;
  await fs.writeFile(aliasAbs, content, "utf8");
  return aliasAbs;
}

async function main() {
  const created = [];
  for (const target of targets) {
    const abs = path.join(root, target);
    const files = await walk(abs);
    for (const file of files) {
      const c = await ensureAliasFile(file);
      if (c) created.push(c);
    }
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ createdCount: created.length, created }, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

