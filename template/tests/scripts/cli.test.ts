import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
import { TEMPLATE_ROOT } from "./paths";

const reelkit = (...args: string[]) => {
  try {
    execFileSync("npx", ["tsx", "scripts/reelkit.ts", ...args], { cwd: TEMPLATE_ROOT, stdio: "pipe", encoding: "utf8" });
    return { code: 0, stderr: "" };
  } catch (err) {
    const e = err as { status: number; stderr: string };
    return { code: e.status, stderr: e.stderr };
  }
};

it("treats inherited object keys as unknown commands", () => {
  for (const name of ["toString", "constructor", "__proto__"]) {
    const result = reelkit(name);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("Usage: npm run reelkit");
  }
}, 30_000);
