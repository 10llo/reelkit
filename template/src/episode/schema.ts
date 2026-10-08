import { z } from "zod";
import { accented } from "../blocks/schema-parts";

export const beatSchema = z.object({
  block: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
});
export type Beat = z.infer<typeof beatSchema>;

export const sceneSchema = z.object({
  title: accented.optional(),
  beats: z.array(beatSchema).min(1).max(2),
  split: z.number().min(0.3).max(0.7).default(0.5),
});
export type Scene = z.infer<typeof sceneSchema>;

export const STAGES = ["researched", "scripted", "built", "synced", "exported"] as const;

const stepLabel = z.string().min(1).max(12);

export const episodeSchema = z.object({
  schemaVersion: z.literal(1),
  talent: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  durationSeconds: z.number().int().min(15).max(60),
  stage: z.enum(STAGES),
  frame: z.object({ steps: z.tuple([stepLabel, stepLabel, stepLabel]) }),
  script: z.array(z.string().min(1)).length(5),
  sceneStarts: z.array(z.number().int()).length(5).nullable(),
  scenes: z.object({
    hook: sceneSchema,
    step1: sceneSchema,
    step2: sceneSchema,
    step3: sceneSchema,
    close: sceneSchema,
  }),
  facts: z.array(z.object({ claim: z.string(), source: z.string() })).default([]),
  clip: z
    .object({ src: z.string(), trimStartFrames: z.number().int().min(0) })
    .default({ src: "", trimStartFrames: 0 }),
  captionsSrc: z.string().default(""),
  coverFrame: z.number().int().min(0).default(60),
  musicSrc: z.string().default(""),
  /** Brand sound effects; false silences every cue (music and the talent clip are unaffected). */
  sfx: z.boolean().default(true),
});
export type Episode = z.infer<typeof episodeSchema>;
