/** Mark footnotes and sources with this attribute: they may be smaller than 40 px. */
export const SMALL_TEXT_ATTR = "data-reelkit-small";

const computedFontSize = (el: Element) => parseFloat(getComputedStyle(el).fontSize);

/** Smallest font size (px) of any element that directly holds visible text, ignoring small-text subtrees. */
export const measureMinFont = (root: Element, fontSizeOf: (el: Element) => number = computedFontSize): number | null => {
  let min: number | null = null;
  const visit = (el: Element) => {
    if (el.hasAttribute(SMALL_TEXT_ATTR)) {
      return;
    }
    const hasOwnText = Array.from(el.childNodes).some(
      (node) => node.nodeType === 3 && (node.textContent ?? "").trim() !== "",
    );
    if (hasOwnText) {
      const size = fontSizeOf(el);
      if (!Number.isNaN(size)) {
        min = min === null ? size : Math.min(min, size);
      }
    }
    Array.from(el.children).forEach(visit);
  };
  visit(root);
  return min;
};
