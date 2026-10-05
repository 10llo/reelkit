import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const FOOD_ICONS = {
  apple: icon((c, a) => (
    <g>
      <path d="M50 30 C38 20 14 22 14 50 C14 74 32 92 44 90 C48 89 50 87 50 87 C50 87 52 89 56 90 C68 92 86 74 86 50 C86 22 62 20 50 30 Z" fill={c} />
      <path d="M50 30 C50 22 54 14 60 10" stroke={a} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M56 18 C64 10 76 12 78 16 C72 22 62 22 56 18 Z" fill={a} />
    </g>
  )),
  drop: icon((c) => <path d="M50 8 C50 8 22 46 22 62 A28 28 0 0 0 78 62 C78 46 50 8 50 8 Z" fill={c} />),
  coffee: icon((c, a) => (
    <g>
      <path d="M16 36 H70 V64 A18 18 0 0 1 52 82 H34 A18 18 0 0 1 16 64 Z" fill={c} />
      <path d="M70 44 H78 A10 10 0 0 1 78 64 H70" stroke={c} strokeWidth="7" fill="none" />
      <path d="M32 26 Q28 20 32 12 M46 26 Q42 20 46 12" stroke={a} strokeWidth="5" strokeLinecap="round" fill="none" />
    </g>
  )),
  salt: icon((c, a) => (
    <g>
      <path d="M34 30 H66 L72 90 H28 Z" fill={c} />
      <rect x="30" y="12" width="40" height="18" rx="6" fill={a} />
      <circle cx="42" cy="21" r="2.5" fill={c} />
      <circle cx="50" cy="21" r="2.5" fill={c} />
      <circle cx="58" cy="21" r="2.5" fill={c} />
    </g>
  )),
  sugar: icon((c, a) => (
    <g>
      <rect x="14" y="46" width="36" height="36" rx="5" fill={c} />
      <rect x="54" y="46" width="36" height="36" rx="5" fill={c} />
      <rect x="34" y="12" width="36" height="36" rx="5" fill={a} transform="rotate(10 52 30)" />
    </g>
  )),
  bread: icon((c, a) => (
    <g>
      <path d="M12 46 C12 24 88 24 88 46 C88 52 82 54 80 54 V86 H20 V54 C18 54 12 52 12 46 Z" fill={c} />
      <path d="M36 42 L44 34 M50 42 L58 34 M64 42 L72 34" stroke={a === c ? "#00000055" : a} strokeWidth="5" strokeLinecap="round" />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
