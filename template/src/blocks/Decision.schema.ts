import { z } from "zod";
import { tone } from "./schema-parts";

const outcome = z.strictObject({ label: z.string().min(1).max(40), tone });
const followUp = z.strictObject({
  question: z.string().min(1).max(44),
  yes: z.strictObject({ label: z.string().min(1).max(24), tone }),
  no: z.strictObject({ label: z.string().min(1).max(24), tone }),
});
const branch = z.union([outcome, followUp]);

/** Longest single word (characters) per text box, so no word spills out of its box at its font size. */
export const maxDecisionWord = { outcome: 15, followUp: 16, compact: 11 } as const;
const words = (s: string) => s.split(/\s+/);

export const decisionSchema = z
  .strictObject({
    question: z.string().min(1).max(60),
    yesLabel: z.string().min(1).max(6).default("SÍ"),
    noLabel: z.string().min(1).max(6).default("NO"),
    yes: branch,
    no: branch,
  })
  .superRefine((d, ctx) => {
    const check = (text: string, max: number, path: (string | number)[]) => {
      const word = words(text).find((w) => w.length > max);
      if (word) ctx.addIssue({ code: "custom", message: `word "${word}" is too long (max ${max} characters)`, path });
    };
    for (const key of ["yes", "no"] as const) {
      const b = d[key];
      if ("question" in b) {
        check(b.question, maxDecisionWord.followUp, [key, "question"]);
        check(b.yes.label, maxDecisionWord.compact, [key, "yes", "label"]);
        check(b.no.label, maxDecisionWord.compact, [key, "no", "label"]);
      } else {
        check(b.label, maxDecisionWord.outcome, [key, "label"]);
      }
    }
  })
  .refine((d) => !("question" in d.yes && "question" in d.no), {
    message: "only one branch may ask a follow-up question (depth ≤ 2)",
    path: ["no"],
  });

export type DecisionBranch = z.infer<typeof branch>;
export const isFollowUp = (b: DecisionBranch): b is z.infer<typeof followUp> => "question" in b;
