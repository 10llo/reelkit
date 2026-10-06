import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, test } from "node:test";
import { configFile, defaultWorkspace, expandHome, rememberWorkspace, resolveWorkspace, versionNotice } from "../workspace.mjs";

const SCRIPT_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../workspace.mjs");
let home;
const makeWorkspace = (dir, meta = { templateVersion: "0.4.0" }, withModules = true) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "reelkit.json"), typeof meta === "string" ? meta : JSON.stringify(meta));
  if (withModules) fs.mkdirSync(path.join(dir, "node_modules"));
  return dir;
};
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-home-"));
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

test("defaults to ~/reelkit-studio and asks for setup when it's missing", () => {
  const result = resolveWorkspace({ env: {}, home });
  assert.equal(result.ok, false);
  assert.equal(result.dir, defaultWorkspace(home));
  assert.match(result.message, /Run \/reelkit:setup first/);
});

test("uses the remembered workspace", () => {
  const dir = makeWorkspace(path.join(home, "Studio"));
  const file = rememberWorkspace(dir, { env: {}, home });
  assert.equal(file, path.join(home, ".config", "reelkit", "config.json"));
  assert.deepEqual(resolveWorkspace({ env: {}, home }), { ok: true, dir, templateVersion: "0.4.0" });
});

test("REELKIT_STUDIO wins over the config file", () => {
  rememberWorkspace(makeWorkspace(path.join(home, "A")), { env: {}, home });
  const b = makeWorkspace(path.join(home, "B"), { templateVersion: "0.3.0" });
  assert.equal(resolveWorkspace({ env: { REELKIT_STUDIO: b }, home }).dir, b);
});

test("respects XDG_CONFIG_HOME and keeps other config keys", () => {
  const env = { XDG_CONFIG_HOME: path.join(home, "xdg") };
  const file = configFile({ env, home });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ other: 1 }));
  rememberWorkspace(path.join(home, "W"), { env, home });
  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { other: 1, workspace: path.join(home, "W") });
});

test("explains a broken workspace", () => {
  const broken = makeWorkspace(path.join(home, "Broken"), "{oops");
  assert.match(resolveWorkspace({ env: { REELKIT_STUDIO: broken }, home }).message, /--update/);
  const noModules = makeWorkspace(path.join(home, "NoModules"), { templateVersion: "0.4.0" }, false);
  assert.match(resolveWorkspace({ env: { REELKIT_STUDIO: noModules }, home }).message, /Dependencies are missing.*\/reelkit:setup/);
});

test("version notice", () => {
  assert.equal(versionNotice("0.4.0", "0.4.0"), null);
  assert.match(versionNotice("0.3.0", "0.4.0"), /template 0\.3\.0; the plugin has 0\.4\.0\. Run \/reelkit:setup --update/);
  assert.match(versionNotice(null, "0.4.0"), /template unknown/);
});

test("empty REELKIT_STUDIO falls back to the config/default", () => {
  const dir = makeWorkspace(path.join(home, "Studio"));
  rememberWorkspace(dir, { env: {}, home });
  const result = resolveWorkspace({ env: { REELKIT_STUDIO: "  " }, home });
  assert.equal(result.dir, dir);
});

test("empty XDG_CONFIG_HOME falls back to ~/.config", () => {
  const dir = makeWorkspace(path.join(home, "Studio"));
  const env = { XDG_CONFIG_HOME: "  " };
  const file = configFile({ env, home });
  assert.equal(file, path.join(home, ".config", "reelkit", "config.json"));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ workspace: dir }));
  const result = resolveWorkspace({ env, home });
  assert.equal(result.dir, dir);
});

test("expandHome handles ~ and ~/path", () => {
  const tmpHome = path.join(os.tmpdir(), "test-home");
  assert.equal(expandHome("~", tmpHome), tmpHome);
  assert.equal(expandHome("~/s", tmpHome), path.join(tmpHome, "s"));
  assert.equal(expandHome("~\\x", tmpHome), path.join(tmpHome, "x"));
  assert.equal(expandHome("/abs/path", tmpHome), "/abs/path");
});

test("REELKIT_STUDIO with ~ expands to home", () => {
  const dir = makeWorkspace(path.join(home, "Studio"));
  const result = resolveWorkspace({ env: { REELKIT_STUDIO: "~/Studio" }, home });
  assert.equal(result.dir, dir);
});

test("config file containing null falls back to default", () => {
  const env = { XDG_CONFIG_HOME: path.join(home, "xdg") };
  const file = configFile({ env, home });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(null));
  const result = resolveWorkspace({ env, home });
  assert.equal(result.ok, false);
  assert.equal(result.dir, defaultWorkspace(home));
});

test("config file with non-string workspace falls back to default", () => {
  const env = { XDG_CONFIG_HOME: path.join(home, "xdg") };
  const file = configFile({ env, home });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ workspace: 5 }));
  const result = resolveWorkspace({ env, home });
  assert.equal(result.ok, false);
  assert.equal(result.dir, defaultWorkspace(home));
});

test("reelkit.json containing null gives update message", () => {
  const broken = path.join(home, "Broken");
  fs.mkdirSync(broken);
  fs.writeFileSync(path.join(broken, "reelkit.json"), JSON.stringify(null));
  fs.mkdirSync(path.join(broken, "node_modules"));
  const result = resolveWorkspace({ env: { REELKIT_STUDIO: broken }, home });
  assert.equal(result.ok, false);
  assert.match(result.message, /--update/);
});

test("reelkit.json without templateVersion gives null", () => {
  const dir = makeWorkspace(path.join(home, "Studio"), {});
  const result = resolveWorkspace({ env: { REELKIT_STUDIO: dir }, home });
  assert.equal(result.ok, true);
  assert.equal(result.templateVersion, null);
});

test("--json output has fixed shape with all six keys", () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--json"], {
    env: { ...process.env, REELKIT_STUDIO: "/nonexistent" },
    encoding: "utf8"
  });
  assert.equal(result.status, 1);
  const json = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(json).sort(), ["dir", "message", "notice", "ok", "pluginVersion", "templateVersion"].sort());
  assert.equal(json.ok, false);
});

test("--set with no path exits 2", () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--set="], {
    encoding: "utf8"
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--set needs a path/);
});
