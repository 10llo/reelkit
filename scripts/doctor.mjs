#!/usr/bin/env node
// Usage: node scripts/doctor.mjs [workspaceDir]
// Checks this machine (and optionally a workspace) for what reelkit needs. Node built-ins only.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MIN_NODE_MAJOR = 20;
export const MIN_FREE_BYTES = 3 * 1024 ** 3;

const ok = (label) => ({ ok: true, label });
const fail = (label, fix) => ({ ok: false, label, fix });

export const checkNode = (version = process.versions.node) =>
  Number(version.split(".")[0]) >= MIN_NODE_MAJOR
    ? ok(`Node ${version}`)
    : fail(`Node ${version} is too old`, `Install Node ${MIN_NODE_MAJOR} or newer from https://nodejs.org (or: brew install node)`);

/** On Windows npm is a .cmd script, which only runs through a shell. */
export const npmCommand = (platform = process.platform) =>
  platform === "win32" ? { cmd: "npm.cmd", shell: true } : { cmd: "npm", shell: false };

export const checkCommand = (name, fix) => {
  const { cmd, shell } = name === "npm" ? npmCommand() : { cmd: name, shell: false };
  try {
    const out = execFileSync(cmd, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], shell });
    return ok(`${name} ${out.trim().split("\n")[0]}`);
  } catch {
    return fail(`${name} not found`, fix);
  }
};

export const checkOptionalCommand = (name, fix) => {
  const result = checkCommand(name, fix);
  return result.ok ? result : { ok: false, optional: true, label: `${name} not found (optional)`, fix };
};

export const checkDisk = (dir, statfs = fs.statfsSync) => {
  let existing = dir;
  while (!fs.existsSync(existing) && path.dirname(existing) !== existing) {
    existing = path.dirname(existing);
  }
  const { bavail, bsize } = statfs(existing);
  const free = bavail * bsize;
  const gb = (free / 1024 ** 3).toFixed(1);
  return free >= MIN_FREE_BYTES
    ? ok(`${gb} GB free`)
    : fail(`${gb} GB free`, "Free at least 3 GB (Whisper's model and the renders need it)");
};

export const checkWorkspace = (dir) => {
  if (!fs.existsSync(path.join(dir, "reelkit.json"))) {
    return null;
  }
  return fs.existsSync(path.join(dir, "node_modules"))
    ? ok("Workspace dependencies installed")
    : fail("Workspace dependencies are missing", `Run: npm install (in ${dir})`);
};

export const runDoctor = (dir) =>
  [
    checkNode(),
    checkCommand("npm", "npm comes with Node: reinstall Node from https://nodejs.org"),
    checkCommand("git", "Install git: xcode-select --install (macOS) or https://git-scm.com"),
    checkOptionalCommand("yt-dlp", "Only for /reelkit:style — brew install yt-dlp (macOS) or pip install yt-dlp"),
    checkDisk(dir),
    checkWorkspace(dir),
  ].filter(Boolean);

export const formatResults = (results) =>
  results.map((r) => (r.ok ? `✓ ${r.label}` : `${r.optional ? "⚠" : "✗"} ${r.label} → ${r.fix}`)).join("\n");

const isMain = () => {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};

if (isMain()) {
  const results = runDoctor(path.resolve(process.argv[2] ?? "."));
  console.log(formatResults(results));
  process.exitCode = results.every((r) => r.ok || r.optional) ? 0 : 1;
}
