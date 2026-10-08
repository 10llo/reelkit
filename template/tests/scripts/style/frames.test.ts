import { expect, it } from "vitest";
import { alignSamples } from "../../../scripts/lib/style/frames";

const f = (n: number) => ({ width: 1, height: 1, data: new Uint8Array([n, n, n, 255]) });

it("drops the timestamp of a missing sample and keeps the rest aligned", () => {
  const out = alignSamples([0, 0.1, 0.2], [null, f(1), f(2)]);
  expect(out.map((o) => o.t)).toEqual([0.1, 0.2]);
  expect(out.map((o) => o.frame.data[0])).toEqual([1, 2]);
});
