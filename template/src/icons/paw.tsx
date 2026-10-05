export const PawShape: React.FC<{ readonly fill: string }> = ({ fill }) => (
  <g fill={fill}>
    <ellipse cx="50" cy="66" rx="24" ry="20" />
    <ellipse cx="22" cy="42" rx="10" ry="13" transform="rotate(-20 22 42)" />
    <ellipse cx="40" cy="24" rx="10" ry="14" transform="rotate(-6 40 24)" />
    <ellipse cx="60" cy="24" rx="10" ry="14" transform="rotate(6 60 24)" />
    <ellipse cx="78" cy="42" rx="10" ry="13" transform="rotate(20 78 42)" />
  </g>
);
