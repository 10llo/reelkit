import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { configFile, defaultWorkspace, rememberWorkspace, resolveWorkspace, versionNotice } from "../workspace.mjs";

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
