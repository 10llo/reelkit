---
description: Show reelkit episodes, the stage each one is at, and the next command to run
argument-hint: "[episode]"
---

Show the status. Arguments: `$ARGUMENTS` (optional episode folder).

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs"`. If it fails, show its message and stop. Line 1 is `<ws>`; show a `⚠` line (template update available) if present.
2. Run `cd "<ws>" && npm run reelkit -- status episodes` and show the list.
3. If an episode was given, also list the files in its folder (research, script, clip, captions, exports) and explain its next step in one sentence.
