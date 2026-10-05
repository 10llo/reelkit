// @vitest-environment jsdom
import { expect, it } from "vitest";
import { SMALL_TEXT_ATTR, measureMinFont } from "../src/frame/minFont";

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
