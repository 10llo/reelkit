import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { accountId, median, parseAccount, profileUrl, readAccounts, writeAccounts } from "../../../scripts/lib/style/accounts";

describe("parseAccount", () => {
  it.each([
    ["tiktok:@dogtora.dani", "tiktok", "dogtora.dani"],
    ["tiktok:dogtora.dani", "tiktok", "dogtora.dani"],
    ["instagram:dogtoradanivet", "instagram", "dogtoradanivet"],
    ["ig:@dogtoradanivet", "instagram", "dogtoradanivet"],
    ["https://www.tiktok.com/@dogtora.dani", "tiktok", "dogtora.dani"],
    ["https://www.tiktok.com/@dogtora.dani?lang=es", "tiktok", "dogtora.dani"],
    ["tiktok.com/@Dogtora.Dani/", "tiktok", "dogtora.dani"],
    ["https://www.instagram.com/dogtoradanivet/", "instagram", "dogtoradanivet"],
    ["https://instagram.com/dogtoradanivet/reels/", "instagram", "dogtoradanivet"],
  ])("%s → %s %s", (spec, network, handle) => {
    expect(parseAccount(spec)).toEqual({ network, handle });
  });
  it("rejects a bare handle (the plugin command asks for the network)", () => {
    expect(() => parseAccount("@dogtora.dani")).toThrow(/tiktok:@handle/);
  });
  it("rejects other sites and empty handles", () => {
    expect(() => parseAccount("https://youtube.com/@x")).toThrow();
    expect(() => parseAccount("tiktok:@")).toThrow();
  });
});

it("builds ids and profile URLs", () => {
  expect(accountId({ network: "tiktok", handle: "dogtora.dani" })).toBe("tiktok-dogtora.dani");
  expect(profileUrl({ network: "tiktok", handle: "dogtora.dani" })).toBe("https://www.tiktok.com/@dogtora.dani");
  expect(profileUrl({ network: "instagram", handle: "dogtoradanivet" })).toBe("https://www.instagram.com/dogtoradanivet/");
});

describe("median", () => {
  it("ignores nulls", () => {
    expect(median([3, null, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
  it("is null when every value is null or the list is empty", () => {
    expect(median([null, null])).toBeNull();
    expect(median([])).toBeNull();
  });
});

it("round-trips accounts.json", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "style-acc-"));
  expect(readAccounts(dir)).toBeNull();
  const file = { createdAt: "2026-10-07T00:00:00.000Z", accounts: [] };
  writeAccounts(dir, file);
  expect(readAccounts(dir)).toEqual(file);
  fs.rmSync(dir, { recursive: true, force: true });
});
