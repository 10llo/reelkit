import { describe, expect, it } from "vitest";
import { CONTACT_AT, closeContacts, closeCues } from "../../../src/blocks/Close.cues";
import { STAGGER, beatTiming } from "../../../src/frame/timing";
import { BRAND_TALENT, sampleProps } from "../samples";

const timing = beatTiming(0, 135);
const all = { instagram: "@dogtora.dani", tiktok: "@dogtora.dani", whatsapp: "300 123 4567", facebook: "Dogtora Dani" };

describe("closeContacts", () => {
  it("lists networks in order, skipping empty handles", () => {
    expect(closeContacts({ ...all, tiktok: "" }).map((c) => c.icon)).toEqual(["instagram", "whatsapp", "facebook"]);
    expect(closeContacts({ instagram: "", tiktok: "", whatsapp: "", facebook: "" })).toEqual([]);
  });
  it("shows the WhatsApp number as written", () => {
    expect(closeContacts(all)[2]).toEqual({ icon: "whatsapp", text: "300 123 4567" });
  });
});

describe("closeCues", () => {
  const props = sampleProps("Close");
  it("boings once per contact, STAGGER apart", () => {
    const talent = { ...BRAND_TALENT, handles: all };
    const boings = closeCues(props, timing, talent).filter((c) => c.name === "boing");
    expect(boings.map((c) => c.at)).toEqual([0, 1, 2, 3].map((i) => timing.at(CONTACT_AT) + i * STAGGER));
  });
  it("has no boing without handles", () => {
    const talent = { ...BRAND_TALENT, handles: { instagram: "", tiktok: "", whatsapp: "", facebook: "" } };
    expect(closeCues(props, timing, talent).some((c) => c.name === "boing")).toBe(false);
  });
  it("ticks once per action icon", () => {
    expect(closeCues(props, timing, BRAND_TALENT).filter((c) => c.name === "tick")).toHaveLength(props.actions.length);
  });
});
