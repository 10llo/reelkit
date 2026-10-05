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

export const DANI_TALENT = {
  id: "dani",
  displayName: "Dogtora Dani",
  pillName: "Dogtora Dani",
  profession: "Médica veterinaria",
  city: "Manizales",
  country: "CO",
  locale: "es-CO",
  colors: {
    bg: "#1A1023",
    bg2: "#2A1838",
    accent: "#FF7A1A",
    text: "#FFF3E0",
    danger: "#FF4D4D",
    safe: "#3DDC97",
    extra: { chocoWhite: "#F3E3C7", chocoMilk: "#A8693D", chocoSemi: "#6B3F23", chocoDark: "#3B2114" },
  },
  disclaimer: ["Contenido educativo.", "No reemplaza la consulta veterinaria."],
};
