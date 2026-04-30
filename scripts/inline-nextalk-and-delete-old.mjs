import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dirs = ["apps/frontend/src", "apps/backend/src", "packages/shared/src"];
const exts = [".ts", ".tsx", ".js", ".mjs", ".cjs"];
const skipDir = new Set(["node_modules", ".next", "dist", "build", ".turbo"]);
const files = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!skipDir.has(ent.name)) await walk(full);
      continue;
    }
    if (exts.includes(path.extname(ent.name))) files.push(path.normalize(full));
  }
}

for (const d of dirs) {
  const abs = path.join(root, d);
  try {
    await fs.access(abs);
    await walk(abs);
  } catch {}
}

const fileSet = new Set(files);
const refs = new Map();

for (const f of files) {
  const src = await fs.readFile(f, "utf8");
  const re =
    /(?:from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|export\s+\*\s+from\s+["']([^"']+)["'])/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1] || m[2] || m[3];
    if (!spec || !spec.startsWith(".")) continue;
    const base = path.resolve(path.dirname(f), spec);
    const cands = [];
    if (path.extname(base)) {
      cands.push(base);
    } else {
      for (const e of exts) cands.push(base + e);
      for (const e of exts) cands.push(path.join(base, "index" + e));
    }
    for (const c0 of cands) {
      const c = path.normalize(c0);
      if (fileSet.has(c)) {
        if (!refs.has(c)) refs.set(c, new Set());
        refs.get(c).add(f);
        break;
      }
    }
  }
}

const old = files.filter((f) => !path.basename(f).startsWith("nextalk"));
const migrated = [];

for (const f of old) {
  const dir = path.dirname(f);
  const ext = path.extname(f);
  const stem = path.basename(f, ext);
  const alias = path.normalize(path.join(dir, `nextalk${stem.toLowerCase()}${ext}`));
  if (!fileSet.has(alias)) continue;

  const incoming = [...(refs.get(f) || new Set())];
  const nonAliasIncoming = incoming.filter((r) => !path.basename(r).startsWith("nextalk"));
  if (nonAliasIncoming.length > 0) continue;

  const oldContent = await fs.readFile(f, "utf8");
  await fs.writeFile(alias, oldContent, "utf8");
  await fs.unlink(f);
  migrated.push({
    old: path.relative(root, f).replace(/\\/g, "/"),
    nextalk: path.relative(root, alias).replace(/\\/g, "/")
  });
}

console.log(JSON.stringify({ migratedCount: migrated.length, migrated }, null, 2));

