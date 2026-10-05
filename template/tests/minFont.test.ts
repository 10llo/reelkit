// @vitest-environment jsdom
import { expect, it } from "vitest";
import { SMALL_TEXT_ATTR, countOverflow, measureMinFont } from "../src/frame/minFont";

const fromInline = (el: Element) => parseFloat((el as HTMLElement).style.fontSize || "0");

const build = (html: string) => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
};

it("returns the smallest font size among elements with their own text", () => {
  const root = build('<div style="font-size:88px">Title<span style="font-size:52px">body</span></div><div style="font-size:12px"><b style="font-size:44px">only child text</b></div>');
  expect(measureMinFont(root, fromInline)).toBe(44);
});

it("skips subtrees marked as small text", () => {
  const root = build(`<div style="font-size:52px">Label</div><div ${SMALL_TEXT_ATTR} style="font-size:30px">Fuente: ejemplo<span style="font-size:20px">x</span></div>`);
  expect(measureMinFont(root, fromInline)).toBe(52);
});

it("returns null when there is no text", () => {
  expect(measureMinFont(build('<div style="font-size:52px">   </div>'), fromInline)).toBeNull();
});

const sized = (el: Element, scrollWidth: number, clientWidth: number) => {
  Object.defineProperty(el, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(el, "clientWidth", { configurable: true, value: clientWidth });
};

it("countOverflow counts an over-wide element that holds its own text", () => {
  const root = build("<div>Texto largo</div><div>Corto</div>");
  sized(root.children[0], 300, 200);
  sized(root.children[1], 100, 200);
  expect(countOverflow(root)).toBe(1);
});

it("countOverflow ignores small-text subtrees and zero-width boxes", () => {
  const root = build(`<div ${SMALL_TEXT_ATTR}>Fuente larga<span>dentro</span></div><div>Sin caja</div>`);
  sized(root.children[0], 500, 100);
  sized(root.children[0].children[0], 500, 100);
  sized(root.children[1], 500, 0);
  expect(countOverflow(root)).toBe(0);
});

it("countOverflow tolerates one pixel", () => {
  const root = build("<div>a</div><div>b</div>");
  sized(root.children[0], 201, 200);
  sized(root.children[1], 202, 200);
  expect(countOverflow(root)).toBe(1);
});
