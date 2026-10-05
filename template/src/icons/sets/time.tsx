import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const TIME_ICONS = {
  calendar: icon((c, a) => (
    <g>
      <rect x="10" y="18" width="80" height="72" rx="8" fill={c} />
      <rect x="10" y="18" width="80" height="18" rx="8" fill={a} />
      <path d="M30 10 V24 M70 10 V24" stroke={c} strokeWidth="7" strokeLinecap="round" />
      <rect x="24" y="48" width="14" height="12" rx="2" fill={a === c ? "#00000055" : a} />
      <rect x="44" y="48" width="14" height="12" rx="2" fill={a === c ? "#00000055" : a} />
      <rect x="24" y="68" width="14" height="12" rx="2" fill={a === c ? "#00000055" : a} />
    </g>
  )),
  hourglass: icon((c, a) => (
    <g>
      <path d="M22 8 H78 M22 92 H78" stroke={c} strokeWidth="7" strokeLinecap="round" />
      <path d="M30 10 C30 40 50 44 50 50 C50 56 30 60 30 90 H70 C70 60 50 56 50 50 C50 44 70 40 70 10 Z" fill="none" stroke={c} strokeWidth="6" strokeLinejoin="round" />
      <path d="M38 88 C40 72 50 66 50 66 C50 66 60 72 62 88 Z M40 22 H60 C58 32 50 38 50 38 C50 38 42 32 40 22 Z" fill={a} />
    </g>
  )),
  alarm: icon((c, a) => (
    <g>
      <circle cx="50" cy="54" r="34" fill={c} />
      <path d="M14 26 A16 16 0 0 1 34 12 M86 26 A16 16 0 0 0 66 12" stroke={c} strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M50 36 V54 L62 62" stroke={a === c ? "#00000066" : a} strokeWidth="7" strokeLinecap="round" fill="none" />
    </g>
  )),
  stopwatch: icon((c, a) => (
    <g>
      <rect x="42" y="6" width="16" height="10" rx="3" fill={c} />
      <circle cx="50" cy="56" r="36" fill="none" stroke={c} strokeWidth="8" />
      <path d="M50 56 L62 38" stroke={a} strokeWidth="7" strokeLinecap="round" />
      <circle cx="50" cy="56" r="5" fill={a} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
