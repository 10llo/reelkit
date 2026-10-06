import { describe, expect, it } from "vitest";
import { expandToken, normalizeWord, spanishNumberWords } from "../../scripts/lib/normalize";

describe("normalizeWord", () => {
  it.each([
    ["¡Mira", "mira"],
    ["tóxico!", "toxico"],
    ["¿Cuándo", "cuando"],
    ["Doce", "doce"],
    ["UNA", "uno"],
    ["un", "uno"],
    ["doscientas", "doscientos"],
    ["kg", "kilos"],
    ["niño", "nino"],
    ["—", ""],
    ["constructor", "constructor"],
    ["toString", "tostring"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeWord(input)).toBe(expected);
  });
});

describe("spanishNumberWords", () => {
  it.each([
    [0, ["cero"]],
    [7, ["siete"]],
    [12, ["doce"]],
    [16, ["dieciséis"]],
    [22, ["veintidós"]],
    [30, ["treinta"]],
    [31, ["treinta", "y", "uno"]],
    [45, ["cuarenta", "y", "cinco"]],
    [100, ["cien"]],
    [101, ["ciento", "uno"]],
    [222, ["doscientos", "veintidós"]],
    [500, ["quinientos"]],
    [1000, ["mil"]],
    [2026, ["dos", "mil", "veintiséis"]],
    [15500, ["quince", "mil", "quinientos"]],
  ])("%d", (n, expected) => {
    expect(spanishNumberWords(n)).toEqual(expected);
  });
  it("rejects what it can't say", () => {
    expect(() => spanishNumberWords(1_000_000)).toThrow(RangeError);
    expect(() => spanishNumberWords(2.5)).toThrow(RangeError);
  });
});

describe("expandToken", () => {
  it.each([
    ["12", ["doce"]],
    ["12.", ["doce"]],
    ["31,", ["treinta", "y", "uno"]],
    ["39,2", ["treinta", "y", "nueve", "con", "dos"]],
    ["39.2", ["treinta", "y", "nueve", "con", "dos"]],
    ["0,5", ["cero", "con", "cinco"]],
    ["5%", ["cinco", "por", "ciento"]],
    ["6-12", ["seis", "a", "doce"]],
    ["1.000", ["mil"]],
    ["veintidós", ["veintidos"]],
    ["¿Cuándo", ["cuando"]],
    ["—", []],
    ["“12”", ["doce"]],
  ])("%s", (token, expected) => {
    expect(expandToken(token)).toEqual(expected);
  });
  it("spells a standalone % as por ciento", () => {
    expect(expandToken("%")).toEqual(["por", "ciento"]);
  });
  it("gives a spoken number and its digits the same keys", () => {
    const spoken = "treinta y uno".split(" ").flatMap(expandToken);
    expect(spoken).toEqual(expandToken("31"));
  });
  it("handles long decimals by spelling digit by digit", () => {
    const result = expandToken("3,1415926");
    expect(result.slice(0, 4)).toEqual(["tres", "con", "uno", "cuatro"]);
    expect(result).not.toThrow;
  });
});
