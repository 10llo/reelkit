import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const HEALTH_ICONS = {
  heart: icon((c) => <path d="M50 86 C20 64 8 46 8 32 A20 20 0 0 1 50 24 A20 20 0 0 1 92 32 C92 46 80 64 50 86 Z" fill={c} />),
  pill: icon((c, a) => (
    <g transform="rotate(-45 50 50)">
      <rect x="14" y="34" width="72" height="32" rx="16" fill={c} />
      <path d="M50 34 H70 A16 16 0 0 1 70 66 H50 Z" fill={a} opacity={0.6} />
    </g>
  )),
  syringe: icon((c, a) => (
    <g transform="rotate(-45 50 50)" strokeLinecap="round" strokeLinejoin="round">
      <rect x="26" y="38" width="44" height="24" rx="4" fill={a} opacity={0.5} />
      <rect x="26" y="38" width="44" height="24" rx="4" fill="none" stroke={c} strokeWidth="7" />
      <path d="M70 50 H92 M10 50 H26 M10 38 V62 M40 38 V50 M52 38 V50" stroke={c} strokeWidth="7" fill="none" />
    </g>
  )),
  thermometer: icon((c, a) => (
    <g>
      <rect x="40" y="8" width="20" height="58" rx="10" fill="none" stroke={c} strokeWidth="7" />
      <rect x="46" y="34" width="8" height="40" rx="4" fill={a} />
      <circle cx="50" cy="76" r="16" fill={a} />
    </g>
  )),
  stethoscope: icon((c, a) => (
    <g fill="none" stroke={c} strokeWidth="7" strokeLinecap="round">
      <path d="M26 12 V38 A24 24 0 0 0 74 38 V12" />
      <path d="M50 62 V72 A14 14 0 0 0 78 72 V62" />
      <circle cx="78" cy="54" r="9" fill={a} stroke="none" />
    </g>
  )),
  bandage: icon((c, a) => (
    <g transform="rotate(-45 50 50)">
      <rect x="8" y="34" width="84" height="32" rx="16" fill={c} />
      <rect x="36" y="34" width="28" height="32" fill={a} opacity={0.6} />
      <circle cx="44" cy="44" r="2.5" fill={c} />
      <circle cx="56" cy="56" r="2.5" fill={c} />
    </g>
  )),
  tooth: icon((c) => (
    <path
      d="M30 14 C18 14 12 26 14 40 C16 52 22 58 24 70 C26 84 30 92 36 92 C42 92 42 74 50 74 C58 74 58 92 64 92 C70 92 74 84 76 70 C78 58 84 52 86 40 C88 26 82 14 70 14 C62 14 58 20 50 20 C42 20 38 14 30 14 Z"
      fill={c}
    />
  )),
  lungs: icon((c, a) => (
    <g>
      <path d="M50 8 V44 M50 38 L40 48 M50 38 L60 48" stroke={a} strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M40 32 C24 32 12 56 12 76 C12 88 22 92 32 88 C40 84 42 76 42 66 V40 Z" fill={c} />
      <path d="M60 32 C76 32 88 56 88 76 C88 88 78 92 68 88 C60 84 58 76 58 66 V40 Z" fill={c} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
