import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { drop } from "../brand/motion";
import { stickerStyle } from "../brand/sticker";
import { HIGHLIGHT, ON_COLOR, inkShadow } from "../brand/tokens";
import { AccentText } from "../frame/AccentText";
import { usePalette, useTalent } from "../frame/contexts";
import { fitFontSize } from "../frame/fit";
import { FONT_BODY, WEIGHT_BODY, bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, STAGGER, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import { SOCIAL_COLORS } from "../icons/sets/social";
import { ACTIONS_AT, BRAND_AT, TEASER_AT, closeContacts, contactAt } from "./Close.cues";
import type { BlockComponent } from "./types";

const BOUNCE_FRAMES = 16;
const LINE_MAX_WIDTH = 900;
const CONTACT_TEXT_MAX = 380;
const CONTACT_STICKER = { radius: 24, border: 5, shadow: 6 };

export const Close: BlockComponent<"Close"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const talent = useTalent();
  const { at } = timing;
  const head = enter(frame, fps, 0);
  const brand = enter(frame, fps, at(BRAND_AT));
  const teaser = enter(frame, fps, at(TEASER_AT));
  const contacts = closeContacts(talent.handles);
  const shadow = inkShadow(5, c);

  const profLine = `${talent.profession} · ${talent.city}`;
  const profSize = fitFontSize(profLine, LINE_MAX_WIDTH, 44, FONT_BODY, WEIGHT_BODY);

  // Coral close: white headline with a hard ink shadow, ink name, social stickers that drop in.
  // No fade-out: the end holds a static frame so the loop is clean.
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ opacity: head, translate: `0px ${interpolate(head, [0, 1], [30, 0])}px`, color: ON_COLOR, textShadow: shadow }}>
        <div style={{ ...headStyle(80), whiteSpace: "nowrap" }}>{props.line1}</div>
        <div style={{ ...headStyle(80), display: "flex", alignItems: "center", justifyContent: "center", gap: 18, whiteSpace: "nowrap" }}>
          <span>
            <AccentText value={props.line2} accentStyle={{ fontSize: 140, lineHeight: 1, color: HIGHLIGHT }} />
          </span>
          {props.accentIcon ? <Icon name={props.accentIcon} size={92} color={HIGHLIGHT} accent={c.text} /> : null}
        </div>
      </div>
      {props.actions.length ? (
        <div style={{ display: "flex", gap: 60, marginTop: 6 }}>
          {props.actions.map((name, i) => {
            const start = at(ACTIONS_AT) + i * STAGGER;
            const p = pop(frame, fps, start);
            const bounce = interpolate(frame, [start + 6, start + 6 + BOUNCE_FRAMES], [0, Math.PI], CLAMP);
            return (
              <Icon
                key={`${i}-${name}`}
                name={name}
                size={92}
                color={ON_COLOR}
                style={{
                  opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP),
                  scale: interpolate(p, [0, 1], [0.3, 1]),
                  translate: `0px ${-24 * Math.sin(bounce)}px`,
                  filter: `drop-shadow(4px 4px 0 ${c.text})`,
                }}
              />
            );
          })}
        </div>
      ) : null}
      <div style={{ marginTop: 20, opacity: brand, translate: `0px ${interpolate(brand, [0, 1], [24, 0])}px` }}>
        <div style={{ ...headStyle(72), color: c.text }}>{talent.displayName}</div>
        <div style={{ ...bodyStyle(profSize), color: c.text, whiteSpace: "nowrap" }}>{profLine}</div>
      </div>
      {contacts.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: contacts.length > 2 ? "repeat(2, max-content)" : "max-content",
            justifyContent: "center",
            gap: "14px 22px",
            marginTop: 18,
            paddingBottom: 8, // room for the last row's hard shadow, which the stage would clip
          }}
        >
          {contacts.map((contact, i) => (
            <div
              key={contact.icon}
              style={{
                ...stickerStyle(c, CONTACT_STICKER),
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 22px 8px 14px",
                ...drop(frame, fps, contactAt(timing, i), 200),
              }}
            >
              <Icon name={contact.icon} size={52} color={SOCIAL_COLORS[contact.icon]} />
              <span style={{ ...bodyStyle(fitFontSize(contact.text, CONTACT_TEXT_MAX, 40, FONT_BODY, WEIGHT_BODY)), whiteSpace: "nowrap" }}>
                {contact.text}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {props.teaser ? (
        <div
          style={{
            ...bodyStyle(40),
            ...stickerStyle(c, { tone: "ink", radius: 999, border: 4, shadow: 6 }),
            marginTop: 20,
            padding: "6px 26px",
            whiteSpace: "nowrap",
            opacity: teaser,
            scale: interpolate(teaser, [0, 1], [0.85, 1]),
          }}
        >
          {props.teaser}
        </div>
      ) : null}
    </div>
  );
};
