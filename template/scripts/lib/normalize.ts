const UNITS = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete",
  "veintiocho", "veintinueve",
];
const TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const HUNDREDS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

const ALIASES: Record<string, string> = {
  un: "uno",
  una: "uno",
  veintiun: "veintiuno",
  veintiuna: "veintiuno",
  punto: "con",
  kg: "kilos",
  kilogramos: "kilos",
  g: "gramos",
  mg: "miligramos",
};

export const normalizeWord = (word: string): string => {
  const plain = word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return ALIASES[plain] ?? plain.replace(/ientas$/, "ientos");
};

const below100 = (n: number): string[] => {
  if (n < 30) {
    return [UNITS[n]];
  }
  const tens = TENS[Math.floor(n / 10)];
  return n % 10 === 0 ? [tens] : [tens, "y", UNITS[n % 10]];
};

const below1000 = (n: number): string[] => {
  if (n === 100) {
    return ["cien"];
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [...(hundreds ? [HUNDREDS[hundreds]] : []), ...(rest || !hundreds ? below100(rest) : [])];
};

export const spanishNumberWords = (n: number): string[] => {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) {
    throw new RangeError(`Can't spell ${n} in Spanish (0–999 999 only)`);
  }
  if (n < 1000) {
    return below1000(n);
  }
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  return [...(thousands === 1 ? [] : below1000(thousands)), "mil", ...(rest ? below1000(rest) : [])];
};

// 12 · 1.000 · 39,2 · 39.2 · 5% — thousands use dots in groups of three.
const NUMBER = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,](\d+))?(%?)$/;
const RANGE = /^(\d+)[-–](\d+)$/;
const EDGE_PUNCTUATION = /^[¿¡"'«"(\[]+|[?!"'»")\].,;:…]+$/g;

const decimalWords = (digits: string): string[] =>
  digits.startsWith("0") ? [...digits].flatMap((d) => spanishNumberWords(Number(d))) : spanishNumberWords(Number(digits));

export const expandToken = (token: string): string[] => {
  const t = token.trim().replace(EDGE_PUNCTUATION, "");
  const range = t.match(RANGE);
  if (range) {
    return [...expandToken(range[1]), "a", ...expandToken(range[2])];
  }
  const number = t.match(NUMBER);
  if (number) {
    const whole = Number(number[1].replace(/\./g, ""));
    if (whole <= 999_999) {
      const words = spanishNumberWords(whole);
      if (number[2]) {
        words.push("con", ...decimalWords(number[2]));
      }
      if (number[3]) {
        words.push("por", "ciento");
      }
      return words.map(normalizeWord);
    }
  }
  const word = normalizeWord(t);
  return word ? [word] : [];
};
