import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));
const listMarkdown = (dir) =>
  fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".md")).map((f) => `${dir}/${f}`) : [];
const frontmatter = (text) => {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  return Object.fromEntries(
    match[1]
      .split("\n")
      .filter((line) => /^[\w-]+:/.test(line))
      .map((line) => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1).trim()]),
  );
};
const cliCommands = () => [...read("template/scripts/reelkit.ts").matchAll(/^\s+(\w+): \(\) => import\(/gm)].map((m) => m[1]);
const npmScripts = () => Object.keys(json("template/package.json").scripts);
const blockNames = () => {
  const source = read("template/src/blocks/schemas.ts");
  const body = source.slice(source.indexOf("export const BLOCK_SCHEMAS = {"), source.indexOf("} as const", source.indexOf("export const BLOCK_SCHEMAS")));
  return [...body.matchAll(/^\s+(\w+): \w+Schema,/gm)].map((m) => m[1]);
};
const skillFiles = () =>
  fs.existsSync(path.join(ROOT, "skills"))
    ? fs.readdirSync(path.join(ROOT, "skills")).map((d) => `skills/${d}/SKILL.md`).filter((f) => fs.existsSync(path.join(ROOT, f)))
    : [];
const pluginFiles = () => [...listMarkdown("commands"), ...skillFiles(), ...listMarkdown("agents")];

test("helpers read the code they lint against", () => {
  assert.deepEqual([...cliCommands()].sort(), ["catalog", "episode", "export", "script", "status", "sync", "talent", "validate", "whisper"]);
  assert.ok(npmScripts().includes("check"));
  assert.equal(blockNames().length, 20);
});

test("plugin, marketplace and template versions agree", () => {
  const plugin = json(".claude-plugin/plugin.json");
  const market = json(".claude-plugin/marketplace.json");
  const template = json("template/package.json");
  assert.equal(plugin.name, "reelkit");
  assert.equal(market.plugins.length, 1);
  assert.equal(market.plugins[0].name, "reelkit");
  assert.equal(market.plugins[0].source, "./");
  assert.equal(plugin.version, template.version);
  assert.equal(market.plugins[0].version, template.version);
});

test("claude plugin validate accepts the plugin and the marketplace", (t) => {
  if (spawnSync("claude", ["--version"]).status !== 0) {
    t.skip("claude CLI not installed");
    return;
  }
  const out = execFileSync("claude", ["plugin", "validate", ROOT], { encoding: "utf8" });
  assert.doesNotMatch(out, /✘/);
});

test("README covers install, setup and the five commands", () => {
  const readme = read("README.md");
  for (const text of [
    "/plugin marketplace add 10llo/reelkit",
    "/plugin install reelkit@reelkit",
    "/reelkit:setup",
    "/reelkit:new",
    "/reelkit:clip",
    "/reelkit:export",
    "/reelkit:status",
  ]) {
    assert.ok(readme.includes(text), `README is missing ${text}`);
  }
});

const SKILLS = ["trend-research", "script-writing", "episode-authoring", "block-authoring", "caption-sync", "social-export"];

test("every skill and agent exists with a name and a description", () => {
  for (const skill of SKILLS) {
    const meta = frontmatter(read(`skills/${skill}/SKILL.md`));
    assert.ok(meta, `${skill}: missing frontmatter`);
    assert.equal(meta.name, skill);
    assert.ok(meta.description?.length > 40, `${skill}: description too short`);
  }
  const agent = frontmatter(read("agents/trend-researcher.md"));
  assert.equal(agent.name, "trend-researcher");
  assert.ok(agent.description?.length > 40);
});

test("plugin files only name CLI commands, npm scripts and plugin paths that exist", () => {
  const commands = new Set(cliCommands());
  const scripts = new Set(npmScripts());
  for (const file of pluginFiles()) {
    const text = read(file);
    for (const [, name] of text.matchAll(/npm run reelkit -- (\w+)/g)) {
      assert.ok(commands.has(name), `${file}: unknown reelkit command "${name}"`);
    }
    for (const [, name] of text.matchAll(/npm run ([\w:]+)/g)) {
      assert.ok(scripts.has(name), `${file}: unknown npm script "${name}"`);
    }
    for (const [, rel] of text.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+[\w])/g)) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), `${file}: missing plugin file ${rel}`);
    }
  }
});

test("episode-authoring covers every block and the validate → check loop", () => {
  const text = read("skills/episode-authoring/SKILL.md");
  for (const block of blockNames()) {
    assert.ok(text.includes(`\`${block}\``), `episode-authoring does not mention \`${block}\``);
  }
  assert.ok(!text.includes("[reelkit:fit]"), "episode-authoring quotes a browser-log tag");
  assert.ok(text.includes("scaled to"), "episode-authoring does not quote check's warnings");
  for (const phrase of ["npm run reelkit -- catalog", "npm run reelkit -- validate", "npm run check --", "npm run reelkit -- episode create"]) {
    assert.ok(text.includes(phrase), `episode-authoring is missing "${phrase}"`);
  }
});

test("research and sync skills keep their safety rules", () => {
  const research = read("skills/trend-research/SKILL.md");
  assert.match(research, /actually opened/);
  assert.match(research, /confirm/i);
  const sync = read("skills/caption-sync/SKILL.md");
  assert.match(sync, /sync prepare/);
  assert.match(sync, /sync apply/);
  assert.match(sync, /--accept-overrun/);
});

const COMMANDS = ["setup", "new", "clip", "export", "status"];

test("every command exists with a description and resolves the workspace first", () => {
  for (const name of COMMANDS) {
    const text = read(`commands/${name}.md`);
    const meta = frontmatter(text);
    assert.ok(meta?.description, `${name}: missing description`);
    assert.ok("argument-hint" in meta, `${name}: missing argument-hint`);
    assert.ok(text.includes("${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs"), `${name}: does not resolve the workspace`);
  }
});

test("commands keep their approval and safety steps", () => {
  const setup = read("commands/setup.md");
  for (const phrase of ["scripts/doctor.mjs", "scripts/init-workspace.mjs", "--set=", "npm run reelkit -- whisper", "npm run reelkit -- talent validate", "never invent"]) {
    assert.ok(setup.includes(phrase), `setup is missing "${phrase}"`);
  }
  const create = read("commands/new.md");
  for (const phrase of ["reelkit:trend-researcher", "reelkit:script-writing", "reelkit:episode-authoring", "npm run reelkit -- episode create", "npm run reelkit -- script", "approve"]) {
    assert.ok(create.includes(phrase), `new is missing "${phrase}"`);
  }
  const clip = read("commands/clip.md");
  for (const phrase of ["reelkit:caption-sync", "npm run reelkit -- sync prepare", "npm run reelkit -- sync apply", "approve"]) {
    assert.ok(clip.includes(phrase), `clip is missing "${phrase}"`);
  }
  const exp = read("commands/export.md");
  for (const phrase of ["reelkit:social-export", "npm run check --", "npm run reelkit -- export", "provisional"]) {
    assert.ok(exp.includes(phrase), `export is missing "${phrase}"`);
  }
  assert.ok(read("commands/status.md").includes("npm run reelkit -- status"));
});

test("CI runs every check the plugin relies on", () => {
  const ci = read(".github/workflows/ci.yml");
  for (const step of [
    "node --test scripts/tests/*.test.mjs",
    "claude plugin validate .",
    "npm ci",
    "npm run lint",
    "npm test",
    "npx remotion browser ensure",
    "npm run check",
    "npm run check:gallery",
  ]) {
    assert.ok(ci.includes(step), `ci.yml is missing "${step}"`);
  }
});
