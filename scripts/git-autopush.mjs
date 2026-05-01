/**
 * Surveillance locale + commit + push automatiques (OPT-IN).
 *
 * Important:
 * - Ceci synchronise uniquement les FICHIERS du depot Git (code, config versionnee, etc.).
 * - Les donnees runtime de l'app (messages/archives en base) ne touchent pas Git.
 *
 * Usage (PowerShell):
 *   cd d:\solola\nextalk
 *   $env:GIT_AUTOPUSH_REMOTE="solola"
 *   $env:GIT_AUTOPUSH_BRANCH="main"
 *   npm run git:watch-push
 *
 * Tu peux arreter avec Ctrl+C.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const REMOTE = process.env.GIT_AUTOPUSH_REMOTE ?? "solola";
const BRANCH = process.env.GIT_AUTOPUSH_BRANCH ?? "main";
const DEBOUNCE_MS = Number(process.env.GIT_AUTOPUSH_DEBOUNCE_MS ?? "2500");

/** Dossiers a surveiller (relatif repoRoot). Ajuste si besoin. */
const WATCH_ROOTS = ["apps", "packages", "scripts", "docs", "mobile", "firebase"];

const IGNORE_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  ".next",
  ".next-run",
  "dist",
  "coverage",
  ".redis-data",
  "tmp"
]);

function git(args) {
  const res = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false
  });
  if (res.status !== 0) {
    const err = (res.stderr || res.stdout || "").trim();
    throw new Error(`git ${args.join(" ")} failed${err ? `: ${err}` : ""}`);
  }
  return (res.stdout || "").trim();
}

function hasChanges() {
  const out = git(["status", "--porcelain"]);
  return out.length > 0;
}

function commitAndPush() {
  if (!hasChanges()) return;
  git(["add", "-A"]);
  const msg = `chore(auto): sync code changes (${new Date().toISOString()})`;
  git(["commit", "-m", msg]);
  git(["push", REMOTE, BRANCH]);
  console.log(`[git-autopush] pushed to ${REMOTE} ${BRANCH}`);
}

let timer = null;
function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    try {
      commitAndPush();
    } catch (e) {
      console.error("[git-autopush] error:", e instanceof Error ? e.message : e);
    }
  }, DEBOUNCE_MS);
}

function watchDir(absDir) {
  if (!fs.existsSync(absDir)) return;
  fs.watch(
    absDir,
    { persistent: true },
    (_event, filename) => {
      // filename peut etre null sur certains OS; on reschedule quand meme
      void filename;
      schedule();
    }
  );
}

function walkAndWatch(absDir) {
  if (!fs.existsSync(absDir)) return;
  const stat = fs.statSync(absDir);
  if (!stat.isDirectory()) return;
  const base = path.basename(absDir);
  if (IGNORE_DIR_NAMES.has(base)) return;

  watchDir(absDir);
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (IGNORE_DIR_NAMES.has(entry.name)) continue;
    walkAndWatch(path.join(absDir, entry.name));
  }
}

console.log(`[git-autopush] watching ${repoRoot}`);
console.log(`[git-autopush] remote=${REMOTE} branch=${BRANCH} debounce=${DEBOUNCE_MS}ms`);

for (const rel of WATCH_ROOTS) {
  walkAndWatch(path.join(repoRoot, rel));
}

// Première passe: si deja des changements non commit, on pousse apres debounce
schedule();
