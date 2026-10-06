import { z } from "zod";
import { BLOCK_SCHEMAS, type BlockName } from "../../src/blocks/schemas";
import { episodeSchema } from "../../src/episode/schema";
import { talentSchema } from "../../src/episode/talent";

export type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  [key: string]: unknown;
};

const toJsonSchema = (schema: z.ZodType): JsonSchema =>
  z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as JsonSchema;

export const blockNames = (): BlockName[] => (Object.keys(BLOCK_SCHEMAS) as BlockName[]).sort();

export const blockSchema = (name: string): JsonSchema => {
  if (!Object.prototype.hasOwnProperty.call(BLOCK_SCHEMAS, name)) {
    throw new Error(`Unknown block "${name}". Blocks: ${blockNames().join(", ")}`);
  }
  return toJsonSchema(BLOCK_SCHEMAS[name as BlockName]);
};

export const episodeJsonSchema = (): JsonSchema => toJsonSchema(episodeSchema);
export const talentJsonSchema = (): JsonSchema => toJsonSchema(talentSchema);

/** One line per block: required props first, `?` optional, `[min–max]` list lengths. */
export const summarizeBlock = (name: string): string => {
  const schema = blockSchema(name);
  const required = new Set(schema.required ?? []);
  const props = Object.entries(schema.properties ?? {}).map(([key, prop]) => {
    const range = prop.type === "array" ? `[${prop.minItems ?? 0}–${prop.maxItems ?? "∞"}]` : "";
    return { text: `${key}${range}${required.has(key) ? "" : "?"}`, required: required.has(key) };
  });
  const ordered = [...props.filter((p) => p.required), ...props.filter((p) => !p.required)];
  return `${name}: ${ordered.length ? ordered.map((p) => p.text).join(", ") : `(see --block=${name})`}`;
};
