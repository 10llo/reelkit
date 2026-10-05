import { PawShape } from "../paw";
import { Svg, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const CORE_ICONS = {
  paw: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <PawShape fill={color} />
    </Svg>
  ),
  check: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path d="M22 52 L42 72 L80 30" fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  x: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path
        d="M15 15 L85 85 M85 15 L15 85"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </Svg>
  ),
  milk: ({ size, color, accent = "#000000", style }) => (
    <Svg size={size} style={style}>
      <path d="M28 14 H72 L66 90 H34 Z" fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" />
      <path d="M31.5 40 Q40 34 50 40 T68.5 40 L66 90 H34 Z" fill={color} opacity="0.95" />
      <path d="M38 50 V78" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity="0.35" />
    </Svg>
  ),
  spoonDrop: ({ size, color, accent = color, style }) => (
    <Svg size={size} style={style}>
      <ellipse cx="38" cy="62" rx="22" ry="15" transform="rotate(-30 38 62)" fill="none" stroke={color} strokeWidth="6" />
      <path d="M56 50 L88 22" stroke={color} strokeWidth="8" strokeLinecap="round" />
      <path d="M70 58 C70 58 60 72 60 78 A10 10 0 0 0 80 78 C80 72 70 58 70 58 Z" fill={accent} />
    </Svg>
  ),
  vomit: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path d="M50 12 C50 12 24 46 24 62 A26 26 0 0 0 76 62 C76 46 50 12 50 12 Z" fill={color} />
      <circle cx="40" cy="62" r="6" fill="#00000033" />
    </Svg>
  ),
  panting: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <g fill="none" stroke={color} strokeWidth="8" strokeLinecap="round">
        <path d="M14 30 Q30 18 46 30 T78 30" />
        <path d="M22 52 Q38 40 54 52 T86 52" />
        <path d="M14 74 Q30 62 46 74 T78 74" />
      </g>
    </Svg>
  ),
  tremor: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path
        d="M8 50 L22 50 L30 22 L42 78 L54 22 L66 78 L74 50 L92 50"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  dog: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path
        fill={color}
        d="M18 40 L26 24 L32 34 L40 34 L46 24 L50 40 C50 46 46 50 42 52 L74 52 C80 52 84 48 88 40 L92 42 C90 50 86 56 82 58 L82 84 L74 84 L72 66 L50 66 L46 84 L38 84 L36 56 C26 56 18 50 18 40 Z"
      />
    </Svg>
  ),
  pumpkin: ({ size, color, accent = color, style }) => (
    <Svg size={size} style={style}>
      <path d="M50 26 C52 16 58 10 64 8" stroke={accent} strokeWidth="7" strokeLinecap="round" fill="none" />
      <ellipse cx="32" cy="60" rx="22" ry="30" fill={color} />
      <ellipse cx="68" cy="60" rx="22" ry="30" fill={color} />
      <ellipse cx="50" cy="60" rx="20" ry="32" fill={color} />
      <path d="M50 30 V90 M34 34 Q26 60 34 88 M66 34 Q74 60 66 88" stroke="#00000030" strokeWidth="3" fill="none" />
    </Svg>
  ),
  bookmark: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path d="M26 10 H74 V90 L50 70 L26 90 Z" fill={color} strokeLinejoin="round" />
    </Svg>
  ),
  share: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path d="M8 46 L92 10 L66 90 L48 60 Z" fill={color} strokeLinejoin="round" />
      <path d="M48 60 L92 10" stroke="#00000040" strokeWidth="5" />
    </Svg>
  ),
  clock: ({ size, color, accent = color, style }) => (
    <Svg size={size} style={style}>
      <circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="8" />
      <path d="M50 28 V50 L66 60" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  warning: ({ size, color, accent = "#00000080", style }) => (
    <Svg size={size} style={style}>
      <path d="M50 10 L92 86 H8 Z" fill={color} strokeLinejoin="round" />
      <path d="M50 38 V60" stroke={accent} strokeWidth="9" strokeLinecap="round" />
      <circle cx="50" cy="73" r="5" fill={accent} />
    </Svg>
  ),
  info: ({ size, color, accent = "#00000080", style }) => (
    <Svg size={size} style={style}>
      <circle cx="50" cy="50" r="40" fill={color} />
      <path d="M50 46 V72" stroke={accent} strokeWidth="9" strokeLinecap="round" />
      <circle cx="50" cy="31" r="5.5" fill={accent} />
    </Svg>
  ),
} satisfies Partial<Record<IconName, IconComponent>>;
