#!/usr/bin/env node
// Usage: node scripts/init-workspace.mjs <target> [--update] [--no-install]
// Creates a reelkit workspace from template/, or updates one in place. Node built-ins only.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", "out", ".DS_Store"]);
const REPLACED_ON_UPDATE = [
  "src",
  "scripts",
  "tests",
  "examples",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "remotion.config.ts",
  "eslint.config.mjs",
  "vitest.config.ts",
  ".prettierrc",
];
const GITIGNORE = ["node_modules/", "out/", "episodes/*/exports/", "*.mp4", "*.mov", "*.m4v", "*.webm", ".DS_Store", ".reelkit-backup/", ""].join("\n");

const copy = (from, to) => fs.cpSync(from, to, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) });
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const npmInstall = (dir) => execFileSync("npm", ["install"], { cwd: dir, stdio: "inherit" });

export const initWorkspace = ({
  target,
  update = false,
  install = true,
  templateDir = path.join(PLUGIN_ROOT, "template"),
  runInstall = npmInstall,
  copyEntry = copy,
  now = () => new Date(),
}) => {
  const templateVersion = JSON.parse(fs.readFileSync(path.join(templateDir, "package.json"), "utf8")).version;
  const metaFile = path.join(target, "reelkit.json");
  const stamp = now().toISOString();
  let backupDir;
  if (update) {
    if (!fs.existsSync(metaFile)) {
      throw new Error(`${target} is not a reelkit workspace (no reelkit.json)`);
    }
    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
    } catch {
      throw new Error(`${metaFile} is not valid JSON`);
    }
    backupDir = path.join(target, ".reelkit-backup", stamp.replace(/[:.]/g, "-"));
    const moved = [];
    const copied = [];
    try {
      fs.mkdirSync(backupDir, { recursive: true });
      for (const name of REPLACED_ON_UPDATE.filter((n) => fs.existsSync(path.join(templateDir, n)))) {
        const dest = path.join(target, name);
        if (fs.existsSync(dest)) {
          fs.renameSync(dest, path.join(backupDir, name));
          moved.push(name);
        }
        copied.push(name);
        copyEntry(path.join(templateDir, name), dest);
      }
    } catch (err) {
      for (const name of copied) {
        fs.rmSync(path.join(target, name), { recursive: true, force: true });
      }
      for (const name of moved) {
        fs.renameSync(path.join(backupDir, name), path.join(target, name));
      }
      fs.rmSync(backupDir, { recursive: true, force: true });
      throw err;
    }
    writeJson(metaFile, { ...meta, templateVersion, updatedAt: stamp });
  } else {
    if (fs.existsSync(target) && fs.readdirSync(target).length) {
      throw new Error(`${target} is not empty. To update an existing workspace, use --update.`);
    }
    copy(templateDir, target);
    for (const dir of ["talents", "episodes"]) {
      fs.mkdirSync(path.join(target, dir), { recursive: true });
      fs.writeFileSync(path.join(target, dir, ".gitkeep"), "");
    }
    fs.writeFileSync(path.join(target, ".gitignore"), GITIGNORE);
    writeJson(metaFile, { templateVersion, createdAt: stamp, updatedAt: stamp });
  }
  if (install) {
    runInstall(target);
  }
  return update ? { target, templateVersion, updated: true, backupDir } : { target, templateVersion, updated: false };
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const unknown = args.find((a) => a.startsWith("--") && !["--update", "--no-install"].includes(a));
  if (unknown) {
    console.error(`Unknown option ${unknown}`);
    process.exit(2);
  }
  const target = args.find((a) => !a.startsWith("--"));
  if (!target) {
    console.error("Usage: node scripts/init-workspace.mjs <target> [--update] [--no-install]");
    process.exit(2);
  }
  try {
    const result = initWorkspace({
      target: path.resolve(target),
      update: args.includes("--update"),
      install: !args.includes("--no-install"),
    });
    console.log(`✓ ${result.updated ? "Updated" : "Created"} ${result.target} (template ${result.templateVersion})`);
    if (result.backupDir) {
      console.log(`Previous files saved in ${result.backupDir}`);
    }
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}
