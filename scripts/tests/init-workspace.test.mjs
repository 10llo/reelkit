import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { initWorkspace, npmCommand } from "../init-workspace.mjs";

let root;
let templateDir;
let installs;
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const options = (target, extra = {}) => ({
  target,
  templateDir,
  runInstall: (dir) => installs.push(dir),
  now: () => new Date("2026-10-05T12:00:00Z"),
  ...extra,
});

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-init-"));
  templateDir = path.join(root, "template");
  write(path.join(templateDir, "package.json"), JSON.stringify({ version: "9.9.9" }));
  write(path.join(templateDir, "src", "a.ts"), "a");
  write(path.join(templateDir, "examples", "smoke", "episode.json"), "{}");
  write(path.join(templateDir, "node_modules", "x", "index.js"), "x");
  write(path.join(templateDir, "out", "y.png"), "y");
  write(path.join(templateDir, ".DS_Store"), "");
  installs = [];
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

test("creates a workspace", () => {
  const target = path.join(root, "ws");
  const result = initWorkspace(options(target));
  assert.deepEqual(result, { target, templateVersion: "9.9.9", updated: false });
  assert.ok(fs.existsSync(path.join(target, "src", "a.ts")));
  assert.ok(fs.existsSync(path.join(target, "examples", "smoke", "episode.json")));
  for (const skipped of ["node_modules", "out", ".DS_Store"]) {
    assert.equal(fs.existsSync(path.join(target, skipped)), false, skipped);
  }
  assert.ok(fs.existsSync(path.join(target, "talents", ".gitkeep")));
  assert.ok(fs.existsSync(path.join(target, "episodes", ".gitkeep")));
  assert.match(fs.readFileSync(path.join(target, ".gitignore"), "utf8"), /episodes\/\*\/exports\//);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(target, "reelkit.json"), "utf8")), {
    templateVersion: "9.9.9",
    createdAt: "2026-10-05T12:00:00.000Z",
    updatedAt: "2026-10-05T12:00:00.000Z",
  });
  assert.deepEqual(installs, [target]);
});

test("refuses a non-empty folder without --update", () => {
  const target = path.join(root, "busy");
  write(path.join(target, "notes.txt"), "mine");
  assert.throws(() => initWorkspace(options(target)), /not empty.*--update/);
  assert.equal(fs.readFileSync(path.join(target, "notes.txt"), "utf8"), "mine");
});

test("updates the template but keeps talents and episodes", () => {
  const target = path.join(root, "ws");
  initWorkspace(options(target, { install: false }));
  write(path.join(target, "src", "old.ts"), "old");
  write(path.join(target, "episodes", "a", "episode.json"), "{\"mine\":true}");
  write(path.join(target, "talents", "dani.json"), "{}");
  write(path.join(templateDir, "package.json"), JSON.stringify({ version: "10.0.0" }));

  const result = initWorkspace(options(target, { update: true, now: () => new Date("2026-11-01T00:00:00Z") }));
  assert.equal(result.updated, true);
  assert.equal(fs.existsSync(path.join(target, "src", "old.ts")), false);
  assert.ok(fs.existsSync(path.join(target, "src", "a.ts")));
  assert.equal(fs.readFileSync(path.join(target, "episodes", "a", "episode.json"), "utf8"), "{\"mine\":true}");
  assert.ok(fs.existsSync(path.join(target, "talents", "dani.json")));
  const meta = JSON.parse(fs.readFileSync(path.join(target, "reelkit.json"), "utf8"));
  assert.deepEqual(meta, {
    templateVersion: "10.0.0",
    createdAt: "2026-10-05T12:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  });
  assert.deepEqual(installs, [target]);
});

test("--update refuses a folder that isn't a workspace", () => {
  const target = path.join(root, "plain");
  fs.mkdirSync(target);
  assert.throws(() => initWorkspace(options(target, { update: true })), /not a reelkit workspace/);
});

const makeWorkspace = () => {
  const target = path.join(root, "ws");
  initWorkspace(options(target, { install: false }));
  return target;
};

test("update backs up replaced files, including user additions", () => {
  const target = makeWorkspace();
  write(path.join(target, "src", "custom.ts"), "mine");
  const result = initWorkspace(options(target, { update: true, install: false }));
  assert.equal(fs.existsSync(path.join(target, "src", "custom.ts")), false);
  assert.equal(fs.readFileSync(path.join(result.backupDir, "src", "custom.ts"), "utf8"), "mine");
  assert.match(result.backupDir, /\.reelkit-backup[\\/]2026-10-05T12-00-00-000Z$/);
});

test("update with invalid reelkit.json throws before touching anything", () => {
  const target = makeWorkspace();
  write(path.join(target, "src", "old.ts"), "old");
  write(path.join(target, "reelkit.json"), "{oops");
  assert.throws(() => initWorkspace(options(target, { update: true })), /reelkit\.json is not valid JSON/);
  assert.ok(fs.existsSync(path.join(target, "src", "old.ts")));
  assert.equal(fs.existsSync(path.join(target, ".reelkit-backup")), false);
});

test("update leaves entries the template lacks alone", () => {
  const target = makeWorkspace();
  write(path.join(target, "examples", "mine.txt"), "keep");
  fs.rmSync(path.join(templateDir, "examples"), { recursive: true });
  initWorkspace(options(target, { update: true, install: false }));
  assert.equal(fs.readFileSync(path.join(target, "examples", "mine.txt"), "utf8"), "keep");
});

test("a failure during update restores the previous files", () => {
  const target = makeWorkspace();
  write(path.join(templateDir, "scripts", "s.ts"), "s");
  initWorkspace(options(target, { update: true, install: false }));
  write(path.join(target, "src", "old.ts"), "old");
  write(path.join(target, "scripts", "mine.ts"), "mine");
  const copyEntry = (from, to) => {
    if (path.basename(to) === "scripts") {
      throw new Error("boom");
    }
    fs.cpSync(from, to, { recursive: true });
  };
  assert.throws(() => initWorkspace(options(target, { update: true, install: false, copyEntry, now: () => new Date("2026-12-01T00:00:00Z") })), /boom/);
  assert.equal(fs.readFileSync(path.join(target, "src", "old.ts"), "utf8"), "old");
  assert.equal(fs.readFileSync(path.join(target, "scripts", "mine.ts"), "utf8"), "mine");
  assert.ok(fs.existsSync(path.join(target, "src", "a.ts")));
});

test("npm runs through a shell as npm.cmd on Windows", () => {
  assert.deepEqual(npmCommand("win32"), { cmd: "npm.cmd", shell: true });
  assert.deepEqual(npmCommand("darwin"), { cmd: "npm", shell: false });
});
