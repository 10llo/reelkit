import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const VETERINARY_ICONS = {
  cat: icon((c, a) => (
    <g>
      <path d="M22 30 L26 8 L42 22 Q50 20 58 22 L74 8 L78 30 Q86 42 84 56 Q80 84 50 86 Q20 84 16 56 Q14 42 22 30 Z" fill={c} />
      <circle cx="38" cy="50" r="5" fill={a === c ? "#00000066" : a} />
      <circle cx="62" cy="50" r="5" fill={a === c ? "#00000066" : a} />
      <path d="M46 62 L50 66 L54 62 Z" fill={a === c ? "#00000066" : a} />
    </g>
  )),
  bone: icon((c) => (
    <g fill={c} transform="rotate(-30 50 50)">
      <rect x="22" y="42" width="56" height="16" rx="6" />
      <circle cx="20" cy="40" r="10" />
      <circle cx="20" cy="60" r="10" />
      <circle cx="80" cy="40" r="10" />
      <circle cx="80" cy="60" r="10" />
    </g>
  )),
  fish: icon((c, a) => (
    <g>
      <ellipse cx="44" cy="50" rx="32" ry="20" fill={c} />
      <path d="M70 50 L94 30 V70 Z" fill={c} />
      <circle cx="30" cy="46" r="4" fill={a === c ? "#00000066" : a} />
    </g>
  )),
  bird: icon((c, a) => (
    <g>
      <path d="M26 56 C26 34 44 24 60 30 C72 34 74 50 66 62 C58 74 38 78 26 56 Z" fill={c} />
      <path d="M30 60 L6 86 L40 76 Z" fill={c} />
      <path d="M66 36 L94 44 L68 52 Z" fill={a} />
      <circle cx="58" cy="40" r="4" fill={a === c ? "#00000066" : a} />
      <path d="M46 84 V94 M58 80 V94" stroke={c} strokeWidth="7" strokeLinecap="round" />
    </g>
  )),
  collar: icon((c, a) => (
    <g>
      <ellipse cx="50" cy="40" rx="36" ry="18" fill="none" stroke={c} strokeWidth="10" />
      <path d="M50 58 V64" stroke={c} strokeWidth="5" />
      <circle cx="50" cy="74" r="11" fill={a} />
    </g>
  )),
  flea: icon((c, a) => (
    <g>
      <ellipse cx="56" cy="46" rx="28" ry="22" fill={c} transform="rotate(-25 56 46)" />
      <circle cx="26" cy="32" r="12" fill={c} />
      <circle cx="23" cy="30" r="3.5" fill={a} />
      <path d="M44 62 L40 90 M60 66 L66 90 M72 58 L94 40 L96 88" stroke={c} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M52 30 L64 56" stroke={a} strokeWidth="5" strokeLinecap="round" />
    </g>
  )),
  bowl: icon((c, a) => (
    <g>
      <path d="M22 40 H78 L72 26 H28 Z" fill={a} />
      <path d="M8 46 H92 L80 80 H20 Z" fill={c} />
      <rect x="4" y="40" width="92" height="10" rx="5" fill={c} />
    </g>
  )),
  leash: icon((c, a) => (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="8" width="30" height="34" rx="15" stroke={c} strokeWidth="10" />
      <path d="M30 40 C46 50 40 66 58 74 C70 80 74 82 78 84" stroke={c} strokeWidth="10" />
      <circle cx="84" cy="86" r="10" stroke={a} strokeWidth="8" />
    </g>
  )),
  weight: icon((c, a) => (
    <g>
      <rect x="8" y="34" width="84" height="56" rx="12" fill={c} />
      <path d="M30 60 A20 20 0 0 1 70 60" stroke={a === c ? "#00000066" : a} strokeWidth="6" fill="none" />
      <path d="M50 60 L60 46" stroke={a === c ? "#00000066" : a} strokeWidth="6" strokeLinecap="round" />
      <rect x="40" y="22" width="20" height="14" rx="4" fill={c} />
    </g>
  )),
  leaf: icon((c, a) => (
    <g>
      <path d="M86 14 C40 14 14 40 14 70 C14 78 18 86 18 86 C18 86 26 90 34 90 C66 90 86 60 86 14 Z" fill={c} />
      <path d="M22 82 L66 34" stroke={a === c ? "#00000055" : a} strokeWidth="5" strokeLinecap="round" />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
