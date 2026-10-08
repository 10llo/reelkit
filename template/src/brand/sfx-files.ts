// Bundled with the template, so renders never need public/ or the network.
import bonk from "./sfx/bonk.wav";
import boing from "./sfx/boing.wav";
import chime from "./sfx/chime.wav";
import ding from "./sfx/ding.wav";
import pop from "./sfx/pop.wav";
import tick from "./sfx/tick.wav";
import whoosh from "./sfx/whoosh.wav";
import type { SfxName } from "./sfx";

export const SFX_FILES: Record<SfxName, string> = { whoosh, pop, boing, ding, chime, bonk, tick };
