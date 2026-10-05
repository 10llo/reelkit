import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

const person = (x: number, y: number, s: number, fill: string, outline?: string) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} stroke={outline} strokeWidth={outline ? 5 : 0}>
    <circle cx="50" cy="24" r="16" />
    <path d="M20 92 C20 62 32 48 50 48 C68 48 80 62 80 92 Z" />
  </g>
);

export const PEOPLE_ICONS = {
  person: icon((c) => person(0, 0, 1, c)),
  people: icon((c, a) => (
    <g>
      {person(30, 4, 0.7, c)}
      {person(-8, 10, 0.9, c, a === c ? "#00000099" : a)}
    </g>
  )),
  child: icon((c) => person(15, 28, 0.7, c)),
  elder: icon((c) => (
    <g>
      {person(-6, 0, 1, c)}
      <path d="M80 50 V92 M80 50 C80 42 70 42 70 48" stroke={c} strokeWidth="6" strokeLinecap="round" fill="none" />
    </g>
  )),
  hand: icon((c) => (
    <g fill={c}>
      <rect x="26" y="44" width="50" height="46" rx="14" />
      <rect x="26" y="20" width="11" height="40" rx="5.5" />
      <rect x="40" y="10" width="11" height="44" rx="5.5" />
      <rect x="54" y="14" width="11" height="40" rx="5.5" />
      <rect x="68" y="24" width="10" height="34" rx="5" />
      <rect x="10" y="48" width="24" height="11" rx="5.5" transform="rotate(35 22 54)" />
    </g>
  )),
  eye: icon((c, a) => (
    <g>
      <path d="M6 50 C22 24 78 24 94 50 C78 76 22 76 6 50 Z" fill={c} />
      <circle cx="50" cy="50" r="16" fill={a === c ? "#00000055" : a} />
      <circle cx="50" cy="50" r="7" fill={c} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
