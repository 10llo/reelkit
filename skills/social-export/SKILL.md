---
name: social-export
description: Use when exporting a reelkit episode for TikTok, Instagram Reels, WhatsApp and Facebook — the render targets, the checks every file must pass, and how to deliver each file.
---

# Social export

All commands run from the workspace root.

## Before exporting

- `npm run check -- episodes/<folder>` must pass.
- If `/reelkit:status` says captions are `provisional` (no synced transcript), tell the user the captions follow the script timing, not the voice, and ask whether to export anyway.
- The episode needs a talent clip (`/reelkit:clip`); covers and subtitles can be exported without one: `--only=cover-9x16,cover-4x5,srt`.

## Export

```bash
npm run reelkit -- export episodes/<folder> [--only=9x16,whatsapp,4x5,cover-9x16,cover-4x5,srt]
```

| File (in `exports/`) | For | Settings |
|---|---|---|
| `<slug>-9x16.mp4` | TikTok, Instagram Reels, Facebook Reels, YouTube Shorts | 1080×1920, H.264 CRF 18, AAC 192 kbps |
| `<slug>-whatsapp.mp4` | WhatsApp (chats and status) | 1080×1920, CRF 18 capped to stay under 16 MB |
| `<slug>-4x5.mp4` | Instagram and Facebook feed posts | 1080×1350, same quality as the master |
| `cover-9x16.png` | Reels / TikTok cover | the hook frame |
| `cover-4x5.png` | feed cover | the hook frame |
| `<slug>.srt` | platforms that accept a subtitle file (Facebook, YouTube) | the captions as shown on screen |

Every file is read back: duration within 0.1 s, exact size, H.264 with audio, WhatsApp under 16 MB. Any miss is a `✗` line and exit 1 — report it, don't hand over the file. A complete export sets the episode's stage to `exported`.

## Report to the user

A table with each file's size, duration and resolution, the folder path, and where each goes. Writing the post copy, hashtags and posting are not part of reelkit.
