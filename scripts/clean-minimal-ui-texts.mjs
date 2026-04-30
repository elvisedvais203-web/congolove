import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const targetDir = path.join(root, "apps/frontend/src/app");

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, out);
    } else if (e.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

const files = await walk(targetDir);
let touched = 0;

for (const file of files) {
  let src = await fs.readFile(file, "utf8");
  const before = src;

  // Remove verbose subtitles from SectionHeader usage.
  src = src.replace(/\s+subtitle="[^"]*"/g, "");

  // Remove a few remaining promotional labels.
  src = src.replace(/Messagerie type whatsapp/gi, "");
  src = src.replace(/Thread moderne et rapide/gi, "");

  if (src !== before) {
    await fs.writeFile(file, src, "utf8");
    touched += 1;
  }
}

console.log(JSON.stringify({ touched }, null, 2));

