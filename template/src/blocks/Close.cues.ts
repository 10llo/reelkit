import { DROP_LAND } from "../brand/motion";
import type { Talent } from "../episode/talent";
import { STAGGER, type BeatTiming } from "../frame/timing";
import type { SocialIconName } from "../icons/names";
import type { CueFn } from "./cue-types";

// Fractions of a 135-frame reference beat.
export const ACTIONS_AT = 30 / 135;
export const BRAND_AT = 45 / 135;
export const CONTACT_AT = 60 / 135;
export const TEASER_AT = 75 / 135;

export const closeContacts = (h: Talent["handles"]): { icon: SocialIconName; text: string }[] =>
  (
    [
      { icon: "instagram", text: h.instagram },
      { icon: "tiktok", text: h.tiktok },
      { icon: "whatsapp", text: h.whatsapp },
      { icon: "facebook", text: h.facebook },
    ] as const
  )
    .filter((c) => c.text)
    .map((c) => ({ ...c }));

export const contactAt = (timing: BeatTiming, i: number) => timing.at(CONTACT_AT) + i * STAGGER;

export const closeCues: CueFn<"Close"> = (props, timing, talent) => [
  ...props.actions.map((_, i) => ({ name: "tick" as const, at: timing.at(ACTIONS_AT) + i * STAGGER })),
  ...closeContacts(talent.handles).map((_, i) => ({ name: "boing" as const, at: contactAt(timing, i) + DROP_LAND })),
];
