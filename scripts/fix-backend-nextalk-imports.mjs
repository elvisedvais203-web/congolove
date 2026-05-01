import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const backendSrc = path.join(root, "apps/backend/src");
const exts = [".ts", ".tsx", ".js", ".mjs", ".cjs"];

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", "dist", "build", ".next", ".turbo"].includes(e.name)) continue;
      await walk(full, out);
    } else if (/\.(ts|tsx|js|mjs|cjs)$/i.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

function aliasStem(stem) {
  if (stem.startsWith("nextalk")) return stem;
  return `nextalk${stem.toLowerCase()}`;
}

async function resolveAlias(importer, spec) {
  if (!spec.startsWith(".")) return null;
  if (spec.includes("/nextalk")) return null;

  const importerDir = path.dirname(importer);
  const rawTarget = path.resolve(importerDir, spec);
  const rawExt = path.extname(rawTarget);
  const rawExtIsCodeExt = exts.includes(rawExt);

  if (rawExtIsCodeExt) {
    const d = path.dirname(rawTarget);
    const st = path.basename(rawTarget, rawExt);
    const aliased = path.join(d, `${aliasStem(st)}${rawExt}`);
    if (await exists(aliased)) {
      return path.relative(importerDir, aliased).replace(/\\/g, "/").replace(/\.(ts|tsx|js|mjs|cjs)$/i, "");
    }
    return null;
  }

  const d = path.dirname(rawTarget);
  const st = path.basename(rawTarget);
  for (const ext of exts) {
    const aliased = path.join(d, `${aliasStem(st)}${ext}`);
    if (await exists(aliased)) {
      return path.relative(importerDir, aliased).replace(/\\/g, "/").replace(/\.(ts|tsx|js|mjs|cjs)$/i, "");
    }
  }
  for (const ext of exts) {
    const aliased = path.join(rawTarget, `${aliasStem("index")}${ext}`);
    if (await exists(aliased)) {
      return path.relative(importerDir, aliased).replace(/\\/g, "/").replace(/\.(ts|tsx|js|mjs|cjs)$/i, "");
    }
  }
  return null;
}

async function main() {
  const files = await walk(backendSrc);
  let touched = 0;
  let rewrites = 0;

  for (const f of files) {
    const base = path.basename(f);
    if (!base.startsWith("nextalk")) continue;

    const src = await fs.readFile(f, "utf8");
    let out = src;

    const re = /(from\s+["']([^"']+)["'])|(import\(\s*["']([^"']+)["']\s*\))|(export\s+\*\s+from\s+["']([^"']+)["'])/g;
    const matches = [...src.matchAll(re)];
    for (const m of matches) {
      const spec = m[2] || m[4] || m[6];
      if (!spec) continue;
      const alias = await resolveAlias(f, spec);
      if (!alias) continue;
      const normalized = alias.startsWith(".") ? alias : `./${alias}`;
      if (normalized === spec) continue;
      const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp(`(["'])${escaped}\\1`), `"${normalized}"`);
      rewrites += 1;
    }

    if (out !== src) {
      await fs.writeFile(f, out, "utf8");
      touched += 1;
    }
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ touched, rewrites }, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

