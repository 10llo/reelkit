import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { diagramName } from "../src/blocks/schema-parts";
import { DIAGRAMS } from "../src/icons/diagrams";
import { DIAGRAM_NAMES } from "../src/icons/names";

it("registers exactly the declared diagrams", () => {
  expect(Object.keys(DIAGRAMS).sort()).toEqual([...DIAGRAM_NAMES].sort());
  expect(DIAGRAM_NAMES).toEqual(["dog", "cat", "tooth", "human"]);
});

describe.each([...DIAGRAM_NAMES])("diagram %s", (name) => {
  it("renders on a 400×400 viewBox with both colors", () => {
    const html = renderToStaticMarkup(createElement(DIAGRAMS[name], { size: 400, color: "#111111", accent: "#222222" }));
    expect(html).toContain('viewBox="0 0 400 400"');
    expect(html).toContain("#111111");
    expect(html).toContain("#222222");
  });
});

it("rejects unknown diagram names in schemas", () => {
  expect(diagramName.safeParse("robot").success).toBe(false);
  expect(diagramName.safeParse("dog").success).toBe(true);
});
