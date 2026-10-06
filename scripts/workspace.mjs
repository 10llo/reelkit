#!/usr/bin/env node
// Usage: node scripts/workspace.mjs [--set=<path>] [--json]
// Finds the user's reelkit workspace ($REELKIT_STUDIO, then ~/.config/reelkit/config.json, then ~/reelkit-studio).
// Node built-ins only.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const nonEmpty = (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export const defaultWorkspace = (home = os.homedir()) => path.join(home, "reelkit-studio");

export const expandHome = (p, home = os.homedir()) => {
  if (p === "~") return home;
  if (p.startsWith("~/") || p.startsWith("~\\")) return path.join(home, p.slice(2));
  return p;
};

export const configFile = ({ env = process.env, home = os.homedir() } = {}) => {
  const xdgHome = nonEmpty(env.XDG_CONFIG_HOME);
  return path.join(xdgHome ?? path.join(home, ".config"), "reelkit", "config.json");
};

const readConfig = (file) => {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
};

export const rememberWorkspace = (dir, { env = process.env, home = os.homedir() } = {}) => {
  const file = configFile({ env, home });
  const expanded = path.resolve(expandHome(dir, home));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ ...readConfig(file), workspace: expanded }, null, 2)}\n`);
  return file;
};

export const resolveWorkspace = ({ env = process.env, home = os.homedir() } = {}) => {
  const reelkitStudio = nonEmpty(env.REELKIT_STUDIO);
  const config = readConfig(configFile({ env, home }));
  const configWorkspace = typeof config.workspace === "string" ? nonEmpty(config.workspace) : undefined;
  const candidate = reelkitStudio ?? configWorkspace ?? defaultWorkspace(home);
  const dir = path.resolve(expandHome(candidate, home));
  const metaFile = path.join(dir, "reelkit.json");
  if (!fs.existsSync(metaFile)) {
    return { ok: false, dir, templateVersion: null, message: `No reelkit workspace at ${dir}. Run /reelkit:setup first.` };
  }
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
    if (typeof meta !== "object" || meta === null || Array.isArray(meta)) {
      return { ok: false, dir, templateVersion: null, message: `${metaFile} is not valid JSON. Run /reelkit:setup --update.` };
    }
  } catch {
    return { ok: false, dir, templateVersion: null, message: `${metaFile} is not valid JSON. Run /reelkit:setup --update.` };
  }
  if (!fs.existsSync(path.join(dir, "node_modules"))) {
    return { ok: false, dir, templateVersion: null, message: `Dependencies are missing in ${dir}. Run /reelkit:setup.` };
  }
  const templateVersion = typeof meta.templateVersion === "string" ? meta.templateVersion : null;
  return { ok: true, dir, templateVersion };
};

export const pluginTemplateVersion = (root = PLUGIN_ROOT) =>
  JSON.parse(fs.readFileSync(path.join(root, "template", "package.json"), "utf8")).version;

export const versionNotice = (workspaceVersion, pluginVersion) =>
  workspaceVersion === pluginVersion
    ? null
    : `This workspace uses template ${workspaceVersion ?? "unknown"}; the plugin has ${pluginVersion}. ` +
      "Run /reelkit:setup --update to get the new blocks and fixes (talents and episodes are kept).";

const isMain = () => {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};

if (isMain()) {
  const args = process.argv.slice(2);
  const set = args.find((a) => a.startsWith("--set="));
  if (set) {
    const pathArg = set.slice("--set=".length).trim();
    if (!pathArg) {
      console.error(`✗ --set needs a path`);
      process.exitCode = 2;
    } else {
      const dir = path.resolve(expandHome(pathArg));
      rememberWorkspace(dir);
      console.log(`✓ Workspace set to ${dir}`);
    }
  } else {
    const result = resolveWorkspace();
    let pluginVersion = null;
    let notice = null;
    try {
      pluginVersion = pluginTemplateVersion();
      notice = result.ok ? versionNotice(result.templateVersion, pluginVersion) : null;
    } catch {
      pluginVersion = null;
      notice = null;
    }
    if (args.includes("--json")) {
      console.log(JSON.stringify({ ok: result.ok, dir: result.dir, templateVersion: result.templateVersion, pluginVersion, notice, message: result.message || null }));
    } else if (result.ok) {
      console.log(result.dir);
      if (notice) console.log(`⚠ ${notice}`);
    } else {
      console.error(`✗ ${result.message}`);
    }
    process.exitCode = result.ok ? 0 : 1;
  }
}
