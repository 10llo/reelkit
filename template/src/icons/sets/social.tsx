import type { SocialIconName } from "../names";
import { icon, type IconComponent } from "../svg";

// Drawn on a 24-unit grid and scaled to the 100×100 icon grid. Single color; the Close passes SOCIAL_COLORS.
const S = 100 / 24;
const g24 = (children: React.ReactNode) => <g transform={`scale(${S})`}>{children}</g>;

export const SOCIAL_COLORS: Record<SocialIconName, string> = {
  instagram: "#D62976",
  tiktok: "#111111",
  whatsapp: "#25D366",
  facebook: "#1877F2",
};

export const SOCIAL_ICONS = {
  instagram: icon((c) =>
    g24(
      <>
        <rect x="3" y="3" width="18" height="18" rx="5.5" fill="none" stroke={c} strokeWidth="2.4" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke={c} strokeWidth="2.4" />
        <circle cx="17.3" cy="6.7" r="1.4" fill={c} />
      </>,
    ),
  ),
  tiktok: icon((c) =>
    g24(<path d="M14 3h3c.3 2.2 1.7 3.6 4 3.9v3.1c-1.5 0-2.9-.4-4-1.2V15a6 6 0 1 1-6-6h.6v3.2a2.9 2.9 0 1 0 2.4 2.8V3z" fill={c} />),
  ),
  whatsapp: icon((c) =>
    g24(
      <>
        <path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z" fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round" />
        <path
          d="M8.6 7.6c.3-.6.6-.6.9-.6h.6c.2 0 .4.1.5.4l.8 1.9c.1.3 0 .5-.1.7l-.6.7c-.1.2-.1.4 0 .5.7 1.2 1.6 2.1 2.8 2.8.2.1.4.1.5 0l.7-.8c.2-.2.4-.2.7-.1l1.8.9c.3.1.4.3.4.5 0 .9-.6 1.8-1.5 2-1 .2-2.5 0-4.6-1.5-1.8-1.3-3-3.1-3.3-4.2-.3-1.2.1-2.3.4-2.9z"
          fill={c}
        />
      </>,
    ),
  ),
  facebook: icon((c) =>
    g24(<path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z" fill={c} />),
  ),
} satisfies Record<SocialIconName, IconComponent>;
