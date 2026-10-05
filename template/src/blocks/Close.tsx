import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { AccentText } from "../frame/AccentText";
import { usePalette, useTalent } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, STAGGER, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

// Fractions of a 135-frame reference beat.
const ACTIONS_AT = 30 / 135;
const BRAND_AT = 45 / 135;
const CONTACT_AT = 60 / 135;
const TEASER_AT = 75 / 135;
const BOUNCE_FRAMES = 16;

export const Close: BlockComponent<"Close"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const talent = useTalent();
  const { at } = timing;
  const head = enter(frame, fps, 0);
  const brand = enter(frame, fps, at(BRAND_AT));
  const contact = enter(frame, fps, at(CONTACT_AT));
  const teaser = enter(frame, fps, at(TEASER_AT));
  const { instagram, tiktok, whatsapp, facebook } = talent.handles;
  const contacts = [instagram, tiktok, whatsapp ? `WhatsApp ${whatsapp}` : "", facebook].filter(Boolean);

  // No fade-out: the end of the close holds a static frame so the loop is clean.
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ opacity: head, translate: `0px ${interpolate(head, [0, 1], [30, 0])}px` }}>
        <div style={{ ...headStyle(80), color: c.text, whiteSpace: "nowrap" }}>{props.line1}</div>
        <div
          style={{
            ...headStyle(80),
            color: c.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            whiteSpace: "nowrap",
          }}
        >
          <span>
            <AccentText value={props.line2} accentStyle={{ fontSize: 140, lineHeight: 1 }} />
          </span>
          {props.accentIcon ? <Icon name={props.accentIcon} size={92} color={c.accent} accent={c.safe} /> : null}
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
                key={name}
                name={name}
                size={92}
                color={c.text}
                style={{
                  opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP),
                  scale: interpolate(p, [0, 1], [0.3, 1]),
                  translate: `0px ${-24 * Math.sin(bounce)}px`,
                }}
              />
            );
          })}
        </div>
      ) : null}
      <div style={{ marginTop: 26, opacity: brand, translate: `0px ${interpolate(brand, [0, 1], [24, 0])}px` }}>
        <div style={{ ...headStyle(72), color: c.text }}>{talent.displayName}</div>
        <div style={{ ...bodyStyle(44), color: c.text, opacity: 0.85, whiteSpace: "nowrap" }}>
          {talent.profession} · {talent.city}
        </div>
      </div>
      {contacts.length ? (
        <div
          style={{
            ...bodyStyle(44),
            color: c.accent,
            marginTop: 16,
            whiteSpace: "nowrap",
            opacity: contact,
            translate: `0px ${interpolate(contact, [0, 1], [24, 0])}px`,
          }}
        >
          {contacts.join(" · ")}
        </div>
      ) : null}
      {props.teaser ? (
        <div
          style={{
            ...bodyStyle(40),
            color: c.text,
            marginTop: 18,
            padding: "6px 26px",
            borderRadius: 999,
            border: `3px solid ${c.text}`,
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
