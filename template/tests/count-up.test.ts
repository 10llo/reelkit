import { expect, it } from "vitest";
import { widestText } from "../src/blocks/parts/CountUpText";

it("picks the longest text, the first on ties", () => {
  expect(widestText(["5", "-1.000"])).toBe("-1.000");
  expect(widestText(["38,5", "42,0"])).toBe("38,5");
  expect(widestText(["100"])).toBe("100");
});
