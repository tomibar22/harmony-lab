/** Music-theory data for the lessons. Pitch comparisons are by pitch class / midi, never strings. */

export const DEGREE_NAMES_HE = [
  "טוניקה",
  "סופרטוניקה",
  "מדיאנטה",
  "סובדומיננטה",
  "דומיננטה",
  "סובמדיאנטה",
  "צליל מוביל",
  "טוניקה",
] as const;

/** Interval patterns in semitones from the tonic (8 notes incl. octave). */
export const SCALE_PATTERNS = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10, 12],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11, 12],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11, 12],
} as const;

export type MajorKey = {
  name: string;        // display, e.g. "F♯"
  vex: string;         // VexFlow key signature, e.g. "F#"
  tonicMidi: number;   // tonic in octave 4 region
  sharps: number;      // positive = sharps, negative = flats
  relativeMinor: string;
};

/** The fifteen major keys, sharps ascending then flats descending. */
export const MAJOR_KEYS: MajorKey[] = [
  { name: "דו", vex: "C", tonicMidi: 60, sharps: 0, relativeMinor: "לה" },
  { name: "סול", vex: "G", tonicMidi: 67, sharps: 1, relativeMinor: "מי" },
  { name: "רה", vex: "D", tonicMidi: 62, sharps: 2, relativeMinor: "סי" },
  { name: "לה", vex: "A", tonicMidi: 69, sharps: 3, relativeMinor: "פה♯" },
  { name: "מי", vex: "E", tonicMidi: 64, sharps: 4, relativeMinor: "דו♯" },
  { name: "סי", vex: "B", tonicMidi: 71, sharps: 5, relativeMinor: "סול♯" },
  { name: "פה♯", vex: "F#", tonicMidi: 66, sharps: 6, relativeMinor: "רה♯" },
  { name: "דו♯", vex: "C#", tonicMidi: 61, sharps: 7, relativeMinor: "לה♯" },
  { name: "פה", vex: "F", tonicMidi: 65, sharps: -1, relativeMinor: "רה" },
  { name: "סי♭", vex: "Bb", tonicMidi: 70, sharps: -2, relativeMinor: "סול" },
  { name: "מי♭", vex: "Eb", tonicMidi: 63, sharps: -3, relativeMinor: "דו" },
  { name: "לה♭", vex: "Ab", tonicMidi: 68, sharps: -4, relativeMinor: "פה" },
  { name: "רה♭", vex: "Db", tonicMidi: 61, sharps: -5, relativeMinor: "סי♭" },
  { name: "סול♭", vex: "Gb", tonicMidi: 66, sharps: -6, relativeMinor: "מי♭" },
  { name: "דו♭", vex: "Cb", tonicMidi: 71, sharps: -7, relativeMinor: "לה♭" },
];

export function signatureLabel(sharps: number): string {
  if (sharps === 0) return "ללא סימני היתק";
  const n = Math.abs(sharps);
  const word = sharps > 0 ? "דיאזים" : "במולים";
  const single = sharps > 0 ? "דיאז אחד" : "במול אחד";
  return n === 1 ? single : `${n} ${word}`;
}

/** The seven diatonic ("white-key") modes, in scale-degree order on C–B. */
export const MODES = [
  { he: "יוני", en: "Ionian", startMidi: 60, note: "זהה למז'ור" },
  { he: "דורי", en: "Dorian", startMidi: 62, note: "מינורי עם 6̂ גבוהה" },
  { he: "פריגי", en: "Phrygian", startMidi: 64, note: "חצי טון מעל הטוניקה" },
  { he: "לידי", en: "Lydian", startMidi: 65, note: "מז'ורי עם 4̂ מוגבהת" },
  { he: "מיקסולידי", en: "Mixolydian", startMidi: 67, note: "מז'ורי עם 7̂ נמוכה" },
  { he: "אאולי", en: "Aeolian", startMidi: 69, note: "זהה למינור הטבעי" },
  { he: "לוקרי", en: "Locrian", startMidi: 71, note: "כמעט תאורטי בלבד" },
] as const;

/** White-key scale (one octave up) starting at a given white-key midi. */
export function whiteKeyScale(startMidi: number): number[] {
  const whites = new Set([0, 2, 4, 5, 7, 9, 11]);
  const out: number[] = [];
  let m = startMidi;
  while (out.length < 8) {
    if (whites.has(m % 12)) out.push(m);
    m++;
  }
  return out;
}

/** Build a scale from a tonic midi using a semitone pattern. */
export function buildScale(tonicMidi: number, pattern: readonly number[]): number[] {
  return pattern.map((s) => tonicMidi + s);
}
