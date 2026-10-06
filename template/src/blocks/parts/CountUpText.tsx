/**
 * Shows `current` while reserving the width of `final`, so a counting number never
 * changes the layout after FitStage has measured the scene.
 */
export const CountUpText: React.FC<{
  readonly current: React.ReactNode;
  readonly final: React.ReactNode;
  readonly align?: "left" | "center" | "right";
}> = ({ current, final, align = "center" }) => (
  <span style={{ display: "inline-grid" }}>
    <span aria-hidden style={{ gridArea: "1 / 1", visibility: "hidden" }}>
      {final}
    </span>
    <span
      style={{
        gridArea: "1 / 1",
        justifySelf: align === "left" ? "start" : align === "right" ? "end" : "center",
      }}
    >
      {current}
    </span>
  </span>
);
