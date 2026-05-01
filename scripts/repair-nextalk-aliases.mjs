import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const targets = ["apps/frontend/src", "apps/backend/src", "packages/shared/src"];
const includeExt = new Set([".ts", ".tsx"]);
const skipDirNames = new Set(["node_modules", ".next", "dist", "build", ".turbo"]);
const preserveCustom = new Set([
  "nextalkchat.tsx" // custom named export alias
]);

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirNames.has(entry.name)) await walk(full, out);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!includeExt.has(ext)) continue;
    out.push(full);
  }
  return out;
}

function stem(file) {
  return path.basename(file, path.extname(file));
}

async function main() {
  const rewritten = [];

  for (const t of targets) {
    const base = path.join(root, t);
    const files = await walk(base);

    const byDir = new Map();
    for (const abs of files) {
      const d = path.dirname(abs);
      if (!byDir.has(d)) byDir.set(d, []);
      byDir.get(d).push(abs);
    }

    for (const [dir, dirFiles] of byDir.entries()) {
      const regular = dirFiles.filter((f) => !stem(f).startsWith("nextalk"));
      const aliases = dirFiles.filter((f) => stem(f).startsWith("nextalk"));

      for (const alias of aliases) {
        const aliasBase = path.basename(alias);
        if (preserveCustom.has(aliasBase)) continue;

        const ext = path.extname(alias);
        const aliasStem = stem(alias); // nextalkxxxx
        const raw = aliasStem.slice("nextalk".length); // xxxx
        if (!raw) continue;

        const match = regular.find((f) => stem(f).toLowerCase() === raw.toLowerCase() && path.extname(f) === ext);
        if (!match) continue;

        const targetStem = stem(match);
        const content = `export * from "./${targetStem}";\n`;
        await fs.writeFile(alias, content, "utf8");
        rewritten.push(alias);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ rewrittenCount: rewritten.length, rewritten }, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

