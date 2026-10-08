import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { checkCommand, checkDisk, checkOptionalCommand, checkNode, checkWorkspace, formatResults, npmCommand } from "../doctor.mjs";

test("node version", () => {
  assert.equal(checkNode("22.1.0").ok, true);
  const old = checkNode("18.19.0");
  assert.equal(old.ok, false);
  assert.match(old.fix, /Node 20/);
});

test("missing command", () => {
  const result = checkCommand("reelkit-no-such-command", "install it");
  assert.deepEqual(result, { ok: false, label: "reelkit-no-such-command not found", fix: "install it" });
  assert.equal(checkCommand("node", "").ok, true);
});

test("disk space", () => {
  const statfs = (bavail) => () => ({ bavail, bsize: 4096 });
  assert.equal(checkDisk("/", statfs(2_000_000)).ok, true); // 7.6 GB
  const low = checkDisk("/", statfs(100_000)); // 0.4 GB
  assert.equal(low.ok, false);
  assert.match(low.label, /0\.4 GB free/);
});

test("workspace", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-doctor-"));
  assert.equal(checkWorkspace(dir), null);
  fs.writeFileSync(path.join(dir, "reelkit.json"), "{}");
  assert.equal(checkWorkspace(dir).ok, false);
  fs.mkdirSync(path.join(dir, "node_modules"));
  assert.equal(checkWorkspace(dir).ok, true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("formatting", () => {
  assert.equal(
    formatResults([{ ok: true, label: "Node 22" }, { ok: false, label: "git not found", fix: "xcode-select --install" }]),
    "✓ Node 22\n✗ git not found → xcode-select --install",
  );
});

test("disk check falls back to an existing parent", () => {
  const result = checkDisk(path.join(os.tmpdir(), "reelkit-missing-dir", "child"));
  assert.equal(typeof result.ok, "boolean");
});

test("npm runs through a shell as npm.cmd on Windows", () => {
  assert.deepEqual(npmCommand("win32"), { cmd: "npm.cmd", shell: true });
  assert.deepEqual(npmCommand("darwin"), { cmd: "npm", shell: false });
});

test("optional command is a warning, not a failure", () => {
  const missing = checkOptionalCommand("reelkit-no-such-command", "brew install it");
  assert.deepEqual(missing, { ok: false, optional: true, label: "reelkit-no-such-command not found (optional)", fix: "brew install it" });
  assert.equal(formatResults([missing]), "⚠ reelkit-no-such-command not found (optional) → brew install it");
  assert.equal(checkOptionalCommand("node", "").ok, true);
});
