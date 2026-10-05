import type React from "react";
import type { DiagramName } from "./names";

// Large silhouettes for the Anatomy block, on a 400×400 grid.
// `color` fills the body; `accent` draws details (eyes, gum line, belt…).
export type DiagramProps = {
  readonly size: number;
  readonly color: string;
  readonly accent: string;
  readonly style?: React.CSSProperties;
};

const Box: React.FC<{ readonly size: number; readonly style?: React.CSSProperties; readonly children: React.ReactNode }> = ({
  size,
  style,
  children,
}) => (
  <svg width={size} height={size} viewBox="0 0 400 400" style={style}>
    {children}
  </svg>
);

export const DIAGRAMS: Record<DiagramName, React.FC<DiagramProps>> = {
  human: ({ size, color, accent, style }) => (
    <Box size={size} style={style}>
      <circle cx="200" cy="62" r="42" fill={color} />
      <rect x="184" y="96" width="32" height="30" fill={color} />
      <path
        d="M148 112 H252 C276 112 290 126 292 150 L312 262 C314 274 298 278 294 266 L270 172 V250 L262 390 H230 L212 272 H188 L170 390 H138 L130 250 V172 L106 266 C102 278 86 274 88 262 L108 150 C110 126 124 112 148 112 Z"
        fill={color}
      />
      <path d="M150 230 H250" stroke={accent} strokeWidth="8" strokeLinecap="round" />
    </Box>
  ),
  dog: ({ size, color, accent, style }) => (
    <Box size={size} style={style}>
      <rect x="120" y="148" width="204" height="96" rx="46" fill={color} />
      <path d="M104 92 L158 142 V236 H112 L96 150 Z" fill={color} />
      <circle cx="104" cy="118" r="42" fill={color} />
      <rect x="26" y="116" width="84" height="44" rx="20" fill={color} />
      <rect x="128" y="212" width="30" height="130" rx="8" fill={color} />
      <rect x="166" y="212" width="28" height="130" rx="8" fill={color} />
      <rect x="260" y="212" width="28" height="130" rx="8" fill={color} />
      <rect x="296" y="200" width="30" height="142" rx="8" fill={color} />
      <path d="M318 166 C352 146 362 118 356 84" stroke={color} strokeWidth="22" strokeLinecap="round" fill="none" />
      <ellipse cx="124" cy="112" rx="15" ry="34" fill={accent} transform="rotate(14 124 112)" />
      <circle cx="90" cy="108" r="7" fill={accent} />
      <circle cx="34" cy="126" r="10" fill={accent} />
    </Box>
  ),
  cat: ({ size, color, accent, style }) => (
    <Box size={size} style={style}>
      <path
        d="M140 122 L150 58 L186 96 H214 L250 58 L260 122 C280 152 276 190 256 212 C302 242 312 300 292 342 H108 C88 300 98 242 144 212 C124 190 120 152 140 122 Z"
        fill={color}
      />
      <path d="M290 332 C352 322 364 258 330 236" stroke={color} strokeWidth="22" strokeLinecap="round" fill="none" />
      <circle cx="176" cy="150" r="9" fill={accent} />
      <circle cx="224" cy="150" r="9" fill={accent} />
      <path d="M192 176 L200 184 L208 176 Z" fill={accent} />
    </Box>
  ),
  tooth: ({ size, color, accent, style }) => (
    <Box size={size} style={style}>
      <path
        d="M120 58 C80 58 60 100 66 150 C72 190 92 210 98 250 C104 300 116 352 140 352 C164 352 166 290 200 290 C234 290 236 352 260 352 C284 352 296 300 302 250 C308 210 328 190 334 150 C340 100 320 58 280 58 C252 58 236 78 200 78 C164 78 148 58 120 58 Z"
        fill={color}
      />
      <path d="M78 196 C140 216 260 216 322 196" stroke={accent} strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M118 98 C104 110 100 130 104 150" stroke={accent} strokeWidth="8" fill="none" strokeLinecap="round" />
    </Box>
  ),
};

export const Diagram: React.FC<DiagramProps & { readonly name: DiagramName }> = ({ name, ...rest }) => {
  const Component = DIAGRAMS[name];
  if (!Component) {
    throw new Error(`Unknown diagram "${name}"`);
  }
  return <Component {...rest} />;
};
