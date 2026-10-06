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
  const body = source.slice(source.indexOf("export const BLOCK_SCHEMAS = {"), source.indexOf("};", source.indexOf("export const BLOCK_SCHEMAS")));
  return [...body.matchAll(/^\s+(\w+): \w+Schema,/gm)].map((m) => m[1]);
};
const skillFiles = () =>
  fs.existsSync(path.join(ROOT, "skills"))
    ? fs.readdirSync(path.join(ROOT, "skills")).map((d) => `skills/${d}/SKILL.md`).filter((f) => fs.existsSync(path.join(ROOT, f)))
    : [];
const pluginFiles = () => [...listMarkdown("commands"), ...skillFiles(), ...listMarkdown("agents")];

test("helpers read the code they lint against", () => {
  assert.ok(cliCommands().includes("sync"));
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
