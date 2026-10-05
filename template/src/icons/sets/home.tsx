import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const HOME_ICONS = {
  house: icon((c, a) => (
    <g>
      <path d="M8 50 L50 12 L92 50 V90 H62 V64 H38 V90 H8 Z" fill={c} />
      <rect x="40" y="66" width="20" height="24" fill={a === c ? "#00000044" : a} />
    </g>
  )),
  door: icon((c, a) => (
    <g>
      <rect x="24" y="6" width="52" height="88" rx="4" fill={c} />
      <circle cx="64" cy="52" r="5" fill={a === c ? "#00000066" : a} />
    </g>
  )),
  bed: icon((c, a) => (
    <g>
      <rect x="8" y="24" width="10" height="64" rx="3" fill={c} />
      <rect x="8" y="54" width="84" height="20" rx="4" fill={c} />
      <rect x="82" y="64" width="10" height="24" rx="3" fill={c} />
      <rect x="22" y="40" width="26" height="14" rx="6" fill={a} />
    </g>
  )),
  sofa: icon((c, a) => (
    <g>
      <rect x="18" y="26" width="64" height="30" rx="8" fill={c} />
      <rect x="6" y="44" width="18" height="34" rx="7" fill={c} />
      <rect x="76" y="44" width="18" height="34" rx="7" fill={c} />
      <rect x="20" y="54" width="60" height="18" rx="4" fill={c} />
      <path d="M24 56 H76" stroke={a === c ? "#00000066" : a} strokeWidth="4" strokeLinecap="round" />
      <path d="M14 78 V88 M86 78 V88" stroke={c} strokeWidth="6" strokeLinecap="round" />
    </g>
  )),
  trash: icon((c, a) => (
    <g>
      <rect x="14" y="16" width="72" height="12" rx="4" fill={c} />
      <rect x="40" y="6" width="20" height="10" rx="3" fill={c} />
      <path d="M22 32 H78 L72 92 H28 Z" fill={c} />
      <path d="M40 44 V80 M60 44 V80" stroke={a === c ? "#00000055" : a} strokeWidth="5" strokeLinecap="round" />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
