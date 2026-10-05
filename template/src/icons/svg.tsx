import type React from "react";

// Inline SVG icons on a 100×100 grid. `color` is the main fill/stroke; `accent` an optional second color.
export type IconProps = {
  readonly size: number;
  readonly color: string;
  readonly accent?: string;
  readonly style?: React.CSSProperties;
};
export type IconComponent = React.FC<IconProps>;

export const Svg: React.FC<{ readonly size: number; readonly style?: React.CSSProperties; readonly children: React.ReactNode }> = ({
  size,
  style,
  children,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style} overflow="visible">
    {children}
  </svg>
);

/** Builds an icon from a render function; `a` is the accent (defaults to the main color). */
export const icon =
  (render: (c: string, a: string) => React.ReactNode): IconComponent =>
  ({ size, color, accent, style }) => (
    <Svg size={size} style={style}>
      {render(color, accent ?? color)}
    </Svg>
  );
