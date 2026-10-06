#!/usr/bin/env node
// Usage: node scripts/workspace.mjs [--set=<path>] [--json]
// Finds the user's reelkit workspace ($REELKIT_STUDIO, then ~/.config/reelkit/config.json, then ~/reelkit-studio).
// Node built-ins only.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const defaultWorkspace = (home = os.homedir()) => path.join(home, "reelkit-studio");

export const configFile = ({ env = process.env, home = os.homedir() } = {}) =>
  path.join(env.XDG_CONFIG_HOME ?? path.join(home, ".config"), "reelkit", "config.json");

const readConfig = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
};

export const rememberWorkspace = (dir, { env = process.env, home = os.homedir() } = {}) => {
  const file = configFile({ env, home });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ ...readConfig(file), workspace: path.resolve(dir) }, null, 2)}\n`);
  return file;
};

export const resolveWorkspace = ({ env = process.env, home = os.homedir() } = {}) => {
  const dir = path.resolve(env.REELKIT_STUDIO ?? readConfig(configFile({ env, home })).workspace ?? defaultWorkspace(home));
  const metaFile = path.join(dir, "reelkit.json");
  if (!fs.existsSync(metaFile)) {
    return { ok: false, dir, message: `No reelkit workspace at ${dir}. Run /reelkit:setup first.` };
  }
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
  } catch {
    return { ok: false, dir, message: `${metaFile} is not valid JSON. Run /reelkit:setup --update.` };
  }
  if (!fs.existsSync(path.join(dir, "node_modules"))) {
    return { ok: false, dir, message: `Dependencies are missing in ${dir}. Run /reelkit:setup.` };
  }
  return { ok: true, dir, templateVersion: meta.templateVersion ?? null };
};

export const pluginTemplateVersion = (root = PLUGIN_ROOT) =>
  JSON.parse(fs.readFileSync(path.join(root, "template", "package.json"), "utf8")).version;

export const versionNotice = (workspaceVersion, pluginVersion) =>
  workspaceVersion === pluginVersion
    ? null
    : `This workspace uses template ${workspaceVersion ?? "unknown"}; the plugin has ${pluginVersion}. ` +
      "Run /reelkit:setup --update to get the new blocks and fixes (talents and episodes are kept).";

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const set = args.find((a) => a.startsWith("--set="));
  if (set) {
    const dir = path.resolve(set.slice("--set=".length));
    rememberWorkspace(dir);
    console.log(`✓ Workspace set to ${dir}`);
  } else {
    const result = resolveWorkspace();
    const pluginVersion = pluginTemplateVersion();
    const notice = result.ok ? versionNotice(result.templateVersion, pluginVersion) : null;
    if (args.includes("--json")) {
      console.log(JSON.stringify({ ...result, pluginVersion, notice }));
    } else if (result.ok) {
      console.log(result.dir);
      if (notice) console.log(`⚠ ${notice}`);
    } else {
      console.error(`✗ ${result.message}`);
    }
    process.exitCode = result.ok ? 0 : 1;
  }
}
