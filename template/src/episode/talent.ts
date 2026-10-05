import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #RRGGBB color");

export const paletteSchema = z.object({
  bg: hex,
  bg2: hex,
  accent: hex,
  text: hex,
  danger: hex,
  safe: hex,
  extra: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/), hex).default({}),
});
export type Palette = z.infer<typeof paletteSchema>;

const EMPTY_HANDLES = { instagram: "", tiktok: "", whatsapp: "", facebook: "" };

export const talentSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1),
  pillName: z.string().min(1).max(18),
  profession: z.string().min(1),
  city: z.string().min(1),
  country: z.string().length(2),
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
  voiceNotes: z.string().default(""),
  handles: z
    .object({
      instagram: z.string().default(""),
      tiktok: z.string().default(""),
      whatsapp: z.string().default(""),
      facebook: z.string().default(""),
    })
    .default(EMPTY_HANDLES),
  colors: paletteSchema,
  disclaimer: z.tuple([z.string(), z.string()]),
  recordingNotes: z.string().default(""),
});
export type Talent = z.infer<typeof talentSchema>;

const BASE_KEYS = ["bg", "bg2", "accent", "text", "danger", "safe"] as const;
type BaseKey = (typeof BASE_KEYS)[number];
const isBaseKey = (ref: string): ref is BaseKey => (BASE_KEYS as readonly string[]).includes(ref);

/** A block color prop is either #RRGGBB or a palette token (base key or an `extra` name). */
export const resolveColor = (ref: string, palette: Palette): string => {
  if (/^#[0-9a-fA-F]{6}$/.test(ref)) {
    return ref;
  }
  if (isBaseKey(ref)) {
    return palette[ref];
  }
  const extra = palette.extra[ref];
  if (extra) {
    return extra;
  }
  throw new Error(
    `Unknown color "${ref}". Use #RRGGBB or one of: ${[...BASE_KEYS, ...Object.keys(palette.extra)].join(", ")}`,
  );
};
