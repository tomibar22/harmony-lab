/** Interval data for unit 2. Comparisons are by semitone count / pitch class, never by string. */

export type Quality = "perfect" | "major" | "minor" | "aug" | "dim";

export const NUMBER_NAMES_HE = [
  "פרימה",
  "סקונדה",
  "טרצה",
  "קוורטה",
  "קווינטה",
  "סקסטה",
  "ספטימה",
  "אוקטבה",
] as const;

/** Interval names are feminine in Hebrew, so qualities take the feminine form. */
export const QUALITY_HE: Record<Quality, string> = {
  perfect: "זכה",
  major: "גדולה",
  minor: "קטנה",
  aug: "מוגדלת",
  dim: "מוקטנת",
};

export type Interval = {
  number: number;      // 1–8 (numeric size, letters counted inclusively)
  quality: Quality;
  semitones: number;
  upperKey: string;    // VexFlow key of the upper note when built above C4
};

/** The intervals of unit 2, all built above C4 for display. */
export const INTERVALS: Interval[] = [
  { number: 1, quality: "perfect", semitones: 0, upperKey: "c/4" },
  { number: 2, quality: "minor", semitones: 1, upperKey: "db/4" },
  { number: 2, quality: "major", semitones: 2, upperKey: "d/4" },
  { number: 3, quality: "minor", semitones: 3, upperKey: "eb/4" },
  { number: 3, quality: "major", semitones: 4, upperKey: "e/4" },
  { number: 4, quality: "perfect", semitones: 5, upperKey: "f/4" },
  { number: 4, quality: "aug", semitones: 6, upperKey: "f#/4" },
  { number: 5, quality: "dim", semitones: 6, upperKey: "gb/4" },
  { number: 5, quality: "perfect", semitones: 7, upperKey: "g/4" },
  { number: 6, quality: "minor", semitones: 8, upperKey: "ab/4" },
  { number: 6, quality: "major", semitones: 9, upperKey: "a/4" },
  { number: 7, quality: "minor", semitones: 10, upperKey: "bb/4" },
  { number: 7, quality: "major", semitones: 11, upperKey: "b/4" },
  { number: 8, quality: "perfect", semitones: 12, upperKey: "c/5" },
];

export function findInterval(number: number, quality: Quality): Interval {
  return INTERVALS.find((iv) => iv.number === number && iv.quality === quality)!;
}

export function nameHe(iv: Pick<Interval, "number" | "quality">): string {
  return `${NUMBER_NAMES_HE[iv.number - 1]} ${QUALITY_HE[iv.quality]}`;
}

const QUALITY_INVERSION: Record<Quality, Quality> = {
  perfect: "perfect",
  major: "minor",
  minor: "major",
  aug: "dim",
  dim: "aug",
};

/** Inversion: numbers sum to 9, semitones to 12, quality flips (perfect stays). */
export function invert(iv: Interval): Interval {
  return findInterval(9 - iv.number, QUALITY_INVERSION[iv.quality]);
}

export type Consonance = "perfect" | "imperfect" | "dissonant" | "contextual";

export const CONSONANCE_HE: Record<Consonance, string> = {
  perfect: "קונסוננס מושלם",
  imperfect: "קונסוננס לא־מושלם",
  dissonant: "דיסוננס",
  contextual: "תלוי בהקשר",
};

export function classify(iv: Interval): Consonance {
  if (iv.quality === "aug" || iv.quality === "dim") return "dissonant";
  if (iv.number === 4) return "contextual"; // the perfect fourth: dissonant against the bass
  if (iv.number === 1 || iv.number === 5 || iv.number === 8) return "perfect";
  if (iv.number === 3 || iv.number === 6) return "imperfect";
  return "dissonant"; // seconds and sevenths
}

/** Solfège letter names used for the numeric-size drill. */
export const LETTERS_HE = ["דו", "רה", "מי", "פה", "סול", "לה", "סי"] as const;
