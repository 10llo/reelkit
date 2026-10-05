// A minimal valid episode where every scene is one BigStat. Tests clone and break it.
export const minimalEpisode = () => {
  const stat = (label: string) => ({ block: "BigStat", props: { value: 42, label } });
  return {
    schemaVersion: 1,
    talent: "dani",
    slug: "test-episode",
    durationSeconds: 20,
    stage: "built",
    frame: { steps: ["UNO", "DOS", "TRES"] },
    script: ["Hola.", "Uno.", "Dos.", "Tres.", "Chao."],
    sceneStarts: null,
    scenes: {
      hook: { beats: [stat("Gancho")] },
      step1: { title: { text: "¿UNO?", accent: "UNO" }, beats: [stat("Uno")] },
      step2: { beats: [stat("Dos A"), stat("Dos B")] },
      step3: { beats: [stat("Tres")] },
      close: { beats: [stat("Cierre")] },
    },
  };
};
