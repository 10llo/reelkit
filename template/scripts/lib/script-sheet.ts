import type { Episode } from "../../src/episode/schema";
import type { Talent } from "../../src/episode/talent";
import { FPS, resolveSceneStarts, sceneDurations, totalFrames } from "../../src/frame/timing";

export const WORDS_PER_SECOND = 2.4;

const secs = (frames: number) => (frames / FPS).toFixed(1).replace(".", ",");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** A Markdown table cell: pipes escaped, one line. */
export const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

/** Gancho · the three step labels (capitalized) · Cierre. */
export const sceneNames = (episode: Episode): string[] => ["Gancho", ...episode.frame.steps.map(capitalize), "Cierre"];

export const buildScriptSheet = (episode: Episode, talent: Talent): string => {
  const total = totalFrames(episode.durationSeconds);
  const { starts } = resolveSceneStarts(episode.sceneStarts, total);
  const durations = sceneDurations(starts, total);
  const names = sceneNames(episode);
  const words = episode.script.reduce((sum, line) => sum + line.trim().split(/\s+/).filter(Boolean).length, 0);
  const speakingSeconds = Math.round(words / WORDS_PER_SECOND);

  const lines: string[] = [];
  lines.push(`# Guion — ${talent.displayName}`, "");
  lines.push(`**${words} palabras · ${episode.durationSeconds} s** (≈ ${speakingSeconds} s a ritmo tranquilo)`, "");
  if (speakingSeconds > episode.durationSeconds) {
    lines.push(`> ⚠ El texto es largo para ${episode.durationSeconds} s: acórtalo o graba con ritmo ágil.`, "");
  }
  lines.push("Una sola toma. Haz una pausa breve antes de cada pregunta: ahí se corta cada escena.", "");
  lines.push("| # | Escena | Tiempo | Qué dices | Indicación |", "| --- | --- | --- | --- | --- |");
  episode.script.forEach((line, i) => {
    const from = secs(starts[i]);
    const to = secs(starts[i] + durations[i]);
    const direction = i > 0 && line.trim().startsWith("¿") ? "Pausa breve antes de empezar" : "—";
    lines.push(`| ${i + 1} | ${names[i]} | ${from}–${to} s | ${cell(line.trim())} | ${direction} |`);
  });
  lines.push("", "## Cómo grabar", "");
  lines.push(
    "- [ ] Celular en vertical, a la altura de los ojos",
    "- [ ] Encuadre de pecho hacia arriba, con los ojos en el tercio superior",
    "- [ ] Mirando al lente; cabeza y hombros al centro, manos fuera del cuadro",
    "- [ ] Lugar silencioso: tu voz es el único audio del video",
    `- [ ] Una sola toma de menos de ${episode.durationSeconds} segundos`,
  );
  if (talent.recordingNotes.trim()) {
    lines.push(`- [ ] ${talent.recordingNotes.trim()}`);
  }
  if (episode.facts.length) {
    lines.push("", "## Para confirmar antes de publicar", "", "| Dato en pantalla | Fuente |", "| --- | --- |");
    for (const fact of episode.facts) {
      lines.push(`| ${cell(fact.claim)} | ${cell(fact.source)} |`);
    }
  }
  return `${lines.join("\n")}\n`;
};
