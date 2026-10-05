import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const WARNING_ICONS = {
  shield: icon((c, a) => (
    <g>
      <path d="M50 6 L86 20 V46 C86 70 70 86 50 94 C30 86 14 70 14 46 V20 Z" fill={c} />
      <path d="M34 50 L46 62 L68 38" stroke={a === c ? "#00000066" : a} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  )),
  stop: icon((c, a) => (
    <g>
      <path d="M32 6 H68 L94 32 V68 L68 94 H32 L6 68 V32 Z" fill={c} />
      <rect x="24" y="43" width="52" height="14" rx="4" fill={a === c ? "#FFFFFF" : a} />
    </g>
  )),
  ban: icon((c) => (
    <g fill="none" stroke={c} strokeWidth="10">
      <circle cx="50" cy="50" r="38" />
      <path d="M24 24 L76 76" strokeLinecap="round" />
    </g>
  )),
  siren: icon((c, a) => (
    <g>
      <path d="M26 74 V50 A24 24 0 0 1 74 50 V74 Z" fill={c} />
      <rect x="16" y="74" width="68" height="14" rx="4" fill={c} />
      <path d="M50 6 V16 M18 20 L25 27 M82 20 L75 27" stroke={c} strokeWidth="7" strokeLinecap="round" />
      <rect x="30" y="58" width="40" height="4" rx="2" fill={a === c ? "#00000055" : a} />
    </g>
  )),
  poison: icon((c, a) => (
    <g>
      <rect x="40" y="6" width="20" height="14" rx="3" fill={c} />
      <path d="M38 20 H62 V30 C76 36 82 48 82 62 V86 A6 6 0 0 1 76 92 H24 A6 6 0 0 1 18 86 V62 C18 48 24 36 38 30 Z" fill={c} />
      <path d="M38 52 L62 76 M62 52 L38 76" stroke={a === c ? "#00000066" : a} strokeWidth="8" strokeLinecap="round" />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
