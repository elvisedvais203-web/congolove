import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const targets = [
  "apps/frontend/src",
  "apps/backend/src",
  "packages/shared/src"
];

const codeExts = [".ts", ".tsx", ".js", ".mjs", ".cjs"];
const includeFileExt = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const skipDirNames = new Set(["node_modules", ".next", "dist", "build", ".turbo"]);

async function exists(absPath) {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirNames.has(entry.name)) await walk(full, out);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!includeFileExt.has(ext)) continue;
    out.push(full);
  }
  return out;
}

function buildAliasName(stem) {
  if (stem.startsWith("nextalk")) return stem;
  return `nextalk${stem.toLowerCase()}`;
}

async function resolveAliasImport(importerAbs, spec) {
  if (!spec.startsWith(".")) return null;

  const importerDir = path.dirname(importerAbs);
  const resolvedBase = path.resolve(importerDir, spec);
  const directExt = path.extname(resolvedBase);
  const candidates = [];

  if (directExt) {
    const dir = path.dirname(resolvedBase);
    const stem = path.basename(resolvedBase, directExt);
    const aliasStem = buildAliasName(stem);
    candidates.push(path.join(dir, `${aliasStem}${directExt}`));
  } else {
    const dir = path.dirname(resolvedBase);
    const stem = path.basename(resolvedBase);
    const aliasStem = buildAliasName(stem);
    for (const ext of codeExts) {
      candidates.push(path.join(dir, `${aliasStem}${ext}`));
    }
    for (const ext of codeExts) {
      candidates.push(path.join(resolvedBase, `${buildAliasName("index")}${ext}`));
    }
  }

  for (const c of candidates) {
    if (await exists(c)) {
      const relNoExt = path
        .relative(importerDir, c)
        .replace(/\\/g, "/")
        .replace(/\.(ts|tsx|js|mjs|cjs)$/i, "");
      return relNoExt.startsWith(".") ? relNoExt : `./${relNoExt}`;
    }
  }

  return null;
}

async function migrateFile(absPath) {
  const src = await fs.readFile(absPath, "utf8");
  let out = src;
  let changed = 0;

  const patterns = [
    /from\s+["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
    /export\s+\*\s+from\s+["']([^"']+)["']/g
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const matches = [...src.matchAll(pattern)];
    for (const m of matches) {
      const spec = m[1];
      if (!spec.startsWith(".") || spec.includes("/nextalk")) continue;
      const alias = await resolveAliasImport(absPath, spec);
      if (!alias || alias === spec) continue;
      const escapedSpec = spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const replaceOne = new RegExp(`(["'])${escapedSpec}\\1`);
      const prev = out;
      out = out.replace(replaceOne, `"${alias}"`);
      if (out !== prev) changed += 1;
    }
  }

  if (changed > 0) {
    await fs.writeFile(absPath, out, "utf8");
  }
  return changed;
}

async function main() {
  const files = [];
  for (const t of targets) {
    const abs = path.join(root, t);
    if (await exists(abs)) {
      files.push(...(await walk(abs)));
    }
  }

  let touched = 0;
  let totalRewrites = 0;
  for (const f of files) {
    const c = await migrateFile(f);
    if (c > 0) {
      touched += 1;
      totalRewrites += c;
    }
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ touchedFiles: touched, totalRewrites }, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

