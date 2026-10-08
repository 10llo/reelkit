import samples from "../../src/gallery/samples.json";
import talentJson from "../../examples/dani-chocolate/talent.json";
import { BLOCK_SCHEMAS, type BlockName } from "../../src/blocks/schemas";
import type { BlockProps } from "../../src/blocks/types";
import { talentSchema } from "../../src/episode/talent";

/** The gallery's maximum-content sample for `block`, parsed (defaults applied). */
export const sampleProps = <K extends BlockName>(block: K): BlockProps<K> => {
  const sample = (samples as { block: string; props: unknown }[]).find((s) => s.block === block);
  if (!sample) {
    throw new Error(`No gallery sample for ${block}`);
  }
  return BLOCK_SCHEMAS[block].parse(sample.props) as BlockProps<K>;
};

export const BRAND_TALENT = talentSchema.parse(talentJson);
