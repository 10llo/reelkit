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

/** Counts text-holding elements (outside small-text subtrees) whose content is wider than their box. */
export const countOverflow = (root: Element): number => {
  let count = 0;
  const visit = (el: Element) => {
    if (el.hasAttribute(SMALL_TEXT_ATTR)) {
      return;
    }
    const hasOwnText = Array.from(el.childNodes).some(
      (node) => node.nodeType === 3 && (node.textContent ?? "").trim() !== "",
    );
    if (hasOwnText && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
      count++;
    }
    Array.from(el.children).forEach(visit);
  };
  visit(root);
  return count;
};
