import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { run } from "../../scripts/commands/talent";
import { TEMPLATE_ROOT } from "./paths";

let dir: string;
const talent = () => JSON.parse(fs.readFileSync(path.join(TEMPLATE_ROOT, "examples", "dani-chocolate", "talent.json"), "utf8"));
const write = (name: string, value: unknown) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
};
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-talent-"));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

it("accepts a valid profile", async () => {
  expect(await run({ positional: ["validate", write("dani.json", talent())], flags: {} })).toBe(0);
  expect(vi.mocked(console.log).mock.calls.join("\n")).toContain("✓ dani: Dogtora Dani");
});
it("reports a bad colour with its path", async () => {
  const bad = { ...talent(), colors: { ...talent().colors, accent: "orange" } };
  expect(await run({ positional: ["validate", write("dani.json", bad)], flags: {} })).toBe(1);
  expect(vi.mocked(console.error).mock.calls.join("\n")).toMatch(/talent\.colors\.accent/);
});
it("requires the file name to match the id", async () => {
  expect(await run({ positional: ["validate", write("ana.json", talent())], flags: {} })).toBe(1);
  expect(vi.mocked(console.error).mock.calls.join("\n")).toContain('id "dani" does not match the file name ana.json');
});
it("prints usage without a file", async () => {
  expect(await run({ positional: [], flags: {} })).toBe(2);
});
