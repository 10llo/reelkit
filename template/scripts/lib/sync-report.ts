import type { Episode } from "../../src/episode/schema";
import { FPS } from "../../src/frame/timing";
import type { Alignment, WordStatus } from "./align";
import type { ClipInfo } from "./probe";
import { cell, sceneNames } from "./script-sheet";

export type SyncProposal = {
  clip: { src: string; trimStartFrames: number };
  sceneStarts: number[] | null;
  captionsSrc: string;
  transcribed: boolean;
  model: string;
  speechOverrunSeconds: number;
  clipOverrunSeconds: number;
  createdAt: string;
};

export type SyncReportInput = {
  dir: string;
  episode: Episode;
  info: ClipInfo;
  proposal: SyncProposal;
  alignment: Alignment | null;
  unavailable: string | null;
  warnings: string[];
  previousStarts: number[];
};

const s1 = (seconds: number) => seconds.toFixed(1).replace(".", ",");
const LABELS: Record<Exclude<WordStatus, "match">, string> = {
  corrected: "Corregida (se muestra el guion)",
  check: "⚠ Revisar (se muestra lo que se escuchó)",
  missing: "⚠ No se escuchó",
};

export const buildSyncReport = (input: SyncReportInput): string => {
  const { dir, episode, info, proposal, alignment, unavailable, warnings, previousStarts } = input;
  const trimMs = (proposal.clip.trimStartFrames / FPS) * 1000;
  const at = (ms: number | null) => (ms === null ? "—" : `${s1((ms - trimMs) / 1000)} s`);
  const names = sceneNames(episode);
  const lines: string[] = [`# Sincronización — ${episode.slug}`, ""];

  lines.push(
    `**Clip:** ${proposal.clip.src} · ${s1(info.durationSeconds)} s · ${info.width}×${info.height}${info.fps ? ` · ${Math.round(info.fps)} fps` : ""}`,
    "",
    proposal.clip.trimStartFrames
      ? `**Inicio recortado:** ${s1(proposal.clip.trimStartFrames / FPS)} s de silencio (${proposal.clip.trimStartFrames} cuadros).`
      : "**Sin recorte:** la voz empieza enseguida.",
    "",
  );
  if (proposal.speechOverrunSeconds > 0) {
    lines.push(
      `> ⚠ La voz sigue ${s1(proposal.speechOverrunSeconds)} s después del final del video (${episode.durationSeconds} s): las últimas palabras se cortarían. Vuelve a grabar más corto, o aplica igual con \`--accept-overrun\`.`,
      "",
    );
  } else if (proposal.clipOverrunSeconds > 0) {
    lines.push(`El clip dura ${s1(proposal.clipOverrunSeconds)} s más que el video; ese final (sin voz) se corta.`, "");
  }

  if (!alignment) {
    lines.push(
      "## ⚠ Sin transcripción",
      "",
      unavailable ?? "No se escuchó voz.",
      "",
      "El clip se adjunta igual. Los subtítulos siguen el tiempo del guion (provisionales) y los cortes de escena no cambian.",
      "Para reintentar: `npm run reelkit -- whisper check`, y luego vuelve a correr `sync prepare`.",
      "",
    );
  } else {
    if (proposal.sceneStarts) {
      lines.push("## Cortes de escena", "", "| Escena | Antes | Ahora |", "| --- | --- | --- |");
      names.forEach((name, i) => {
        lines.push(`| ${name} | ${s1(previousStarts[i] / FPS)} s | ${s1(proposal.sceneStarts![i] / FPS)} s |`);
      });
      lines.push("");
    }
    const total = alignment.words.length;
    const matched = alignment.words.filter((w) => w.status === "match").length;
    lines.push("## Palabras", "", `**${matched} de ${total} palabras del guion coinciden** con lo que se escuchó.`, "");
    const review = alignment.words.filter((w) => w.status !== "match");
    if (review.length || alignment.adLibs.length) {
      lines.push("| Escena | Guion | Se escuchó | Estado | Tiempo |", "| --- | --- | --- | --- | --- |");
      for (const w of review) {
        lines.push(
          `| ${names[w.scene]} | ${cell(w.text)} | ${cell(w.heard) || "—"} | ${LABELS[w.status as Exclude<WordStatus, "match">]} | ${at(w.startMs)} |`,
        );
      }
      for (const w of alignment.adLibs) {
        lines.push(`| ${names[w.scene]} | — | ${cell(w.text)} | Agregada (se muestra tal cual) | ${at(w.startMs)} |`);
      }
      lines.push("");
    }
  }

  if (warnings.length) {
    lines.push("## Avisos", "", ...warnings.map((w) => `- ${w}`), "");
  }
  lines.push("## Siguiente paso", "");
  if (alignment) {
    lines.push('- Para corregir una palabra, cambia su `"text"` en `captions.proposed.json`.');
  }
  lines.push(`- Si todo se ve bien: \`npm run reelkit -- sync apply ${dir}\``);
  return `${lines.join("\n")}\n`;
};
