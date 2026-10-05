import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ICONS } from "../src/icons";
import { ICON_NAMES } from "../src/icons/names";

it("registers a component for exactly the declared icon names", () => {
  expect(Object.keys(ICONS).sort()).toEqual([...ICON_NAMES].sort());
});

it("has no duplicate names", () => {
  expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
});

describe.each([...ICON_NAMES])("icon %s", (name) => {
  it("renders a 100×100 svg using the given colors", () => {
    const html = renderToStaticMarkup(createElement(ICONS[name], { size: 64, color: "#123456", accent: "#ABCDEF" }));
    expect(html.startsWith("<svg")).toBe(true);
    expect(html).toContain('viewBox="0 0 100 100"');
    expect(html).toContain("#123456");
  });
});

it("includes the health, veterinary and food icons", () => {
  for (const name of ["heart", "pill", "thermometer", "cat", "flea", "bowl", "apple", "drop"]) {
    expect(ICON_NAMES).toContain(name);
  }
});

it("includes the home, time, people, warning and action icons", () => {
  for (const name of ["house", "calendar", "person", "hand", "shield", "ban", "arrowRight", "question"]) {
    expect(ICON_NAMES).toContain(name);
  }
  expect(ICON_NAMES.length).toBe(68);
});
