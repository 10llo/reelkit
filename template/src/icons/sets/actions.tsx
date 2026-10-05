import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

const stroke = (d: string, c: string, width = 10) => (
  <path d={d} stroke={c} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
);

export const ACTION_ICONS = {
  arrowRight: icon((c) => stroke("M10 50 H82 M58 26 L84 50 L58 74", c)),
  arrowUp: icon((c) => stroke("M50 90 V18 M26 42 L50 16 L74 42", c)),
  arrowDown: icon((c) => stroke("M50 10 V82 M26 58 L50 84 L74 58", c)),
  refresh: icon((c) => (
    <g>
      {stroke("M80 44 A32 32 0 1 0 74 72", c)}
      {stroke("M84 18 V44 H58", c)}
    </g>
  )),
  plus: icon((c) => stroke("M50 14 V86 M14 50 H86", c, 12)),
  minus: icon((c) => stroke("M14 50 H86", c, 12)),
  search: icon((c) => (
    <g>
      <circle cx="42" cy="42" r="26" stroke={c} strokeWidth="9" fill="none" />
      {stroke("M62 62 L88 88", c, 12)}
    </g>
  )),
  star: icon((c) => <path d="M50 8 L62 36 L92 38 L68 58 L76 88 L50 72 L24 88 L32 58 L8 38 L38 36 Z" fill={c} strokeLinejoin="round" />),
  question: icon((c, a) => (
    <g>
      {stroke("M32 34 A18 18 0 1 1 54 50 C50 52 50 56 50 64", c, 11)}
      <circle cx="50" cy="84" r="7" fill={a} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
