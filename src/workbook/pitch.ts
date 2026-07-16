/** Spelled-pitch math for the workbook exercises.
 *  A pitch is letter (0=C..6=B) + alter (-2..+2) + octave (scientific).
 *  Spelling matters here - these are notation exercises - so comparisons are
 *  by letter+alter, never by midi/chroma alone. */

export type SpelledPitch = { letter: number; alter: number; octave: number };

/** Semitone of each natural letter within the octave: C D E F G A B. */
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11] as const;

const LETTER_NAMES = ["C", "D", "E", "F", "G", "A", "B"] as const;
export const LETTER_HE = ["דו", "רה", "מי", "פה", "סול", "לה", "סי"] as const;

export const ACC_GLYPH: Record<number, string> = { [-2]: "𝄫", [-1]: "♭", 0: "", 1: "♯", 2: "𝄪" };

export function midiOf(p: SpelledPitch): number {
  return 12 * (p.octave + 1) + NATURAL_PC[p.letter] + p.alter;
}

/** VexFlow key string, e.g. {E,1,4} → "e#/4". */
export function vexKeyOf(p: SpelledPitch): string {
  const acc = p.alter === 0 ? "" : p.alter > 0 ? "#".repeat(p.alter) : "b".repeat(-p.alter);
  return `${LETTER_NAMES[p.letter].toLowerCase()}${acc}/${p.octave}`;
}

/** English name without octave, e.g. "F♯". */
export function nameOf(p: { letter: number; alter: number }): string {
  return `${LETTER_NAMES[p.letter]}${ACC_GLYPH[p.alter] ?? ""}`;
}

/** Hebrew name without octave, e.g. "פה♯". */
export function nameHeOf(p: { letter: number; alter: number }): string {
  return `${LETTER_HE[p.letter]}${ACC_GLYPH[p.alter] ?? ""}`;
}

/** Same spelled note (octave ignored). */
export function sameSpelling(a: SpelledPitch, b: SpelledPitch): boolean {
  return a.letter === b.letter && a.alter === b.alter;
}

/** Diatonic staff index (C0=0): one unit per line/space step. */
export function diaOf(p: SpelledPitch): number {
  return p.octave * 7 + p.letter;
}

export function pitchFromDia(dia: number, alter = 0): SpelledPitch {
  return { letter: ((dia % 7) + 7) % 7, alter, octave: Math.floor(dia / 7) };
}

/* ---------------- keys and scales ---------------- */

export type Mode = "major" | "minor";
export type MinorForm = "natural" | "harmonic" | "melodic";

/** Tonic letter/alter for each signature, sharps −7..+7. */
function tonicOf(sharps: number, mode: Mode): { letter: number; alter: number } {
  // circle of fifths from C (major) / A (minor): +1 sharp = up a fifth (letter+4)
  const baseLetter = mode === "major" ? 0 : 5;
  const letter = (((baseLetter + sharps * 4) % 7) + 7) % 7;
  // alter is whatever makes the tonic land on the right pc of the circle
  const pc = (((mode === "major" ? 0 : 9) + sharps * 7) % 12 + 12) % 12;
  let alter = pc - NATURAL_PC[letter];
  if (alter > 2) alter -= 12;
  if (alter < -2) alter += 12;
  return { letter, alter };
}

export type Key = {
  sharps: number;           // negative = flats
  mode: Mode;
  tonic: { letter: number; alter: number };
  nameHe: string;           // "רה מז'ור" / "סי♭ מינור"
  vex: string;              // VexFlow signature: "D" / "Bbm"
};

function makeKey(sharps: number, mode: Mode): Key {
  const tonic = tonicOf(sharps, mode);
  const nameHe = `${nameHeOf(tonic)} ${mode === "major" ? "מז'ור" : "מינור"}`;
  const acc = tonic.alter === 0 ? "" : tonic.alter > 0 ? "#" : "b";
  const vex = `${LETTER_NAMES[tonic.letter]}${acc}${mode === "minor" ? "m" : ""}`;
  return { sharps, mode, tonic, nameHe, vex };
}

export const MAJOR_KEYS_WB: Key[] = Array.from({ length: 15 }, (_, i) => makeKey(i - 7, "major"));
export const MINOR_KEYS_WB: Key[] = Array.from({ length: 15 }, (_, i) => makeKey(i - 7, "minor"));

export function keyOf(sharps: number, mode: Mode): Key {
  return (mode === "major" ? MAJOR_KEYS_WB : MINOR_KEYS_WB)[sharps + 7];
}

/** Find a key by its Hebrew tonic spelling, e.g. findKey("מי♭", "major"). */
export function findKey(tonicHe: string, mode: Mode): Key {
  const k = (mode === "major" ? MAJOR_KEYS_WB : MINOR_KEYS_WB).find(
    (kk) => nameHeOf(kk.tonic) === tonicHe
  );
  if (!k) throw new Error(`unknown key: ${tonicHe} ${mode}`);
  return k;
}

/** Interval patterns in semitones from the tonic, 8 notes (1̂..8̂). */
const PATTERNS: Record<"major" | MinorForm, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  natural: [0, 2, 3, 5, 7, 8, 10, 12],
  harmonic: [0, 2, 3, 5, 7, 8, 11, 12],
  melodic: [0, 2, 3, 5, 7, 9, 11, 12],
};

/** Spell a full scale 1̂..8̂ from a tonic. Letters ascend stepwise; each alter
 *  is forced to match the pattern's semitone, so F𝄪 comes out as F𝄪. */
export function spellScale(
  tonic: SpelledPitch,
  mode: Mode,
  form: MinorForm = "natural"
): SpelledPitch[] {
  const pattern = mode === "major" ? PATTERNS.major : PATTERNS[form];
  const tonicMidi = midiOf(tonic);
  const tonicDia = diaOf(tonic);
  return pattern.map((semis, deg) => {
    const dia = tonicDia + deg;
    const natural = pitchFromDia(dia);
    const alter = tonicMidi + semis - midiOf(natural);
    return { ...natural, alter };
  });
}

/** The pitch of a scale degree (1..7) in a key, spelled. Octave from `octave` of tonic. */
export function degreePitch(
  key: Key,
  degree: number,
  tonicOctave: number,
  form: MinorForm = "natural"
): SpelledPitch {
  const scale = spellScale({ ...key.tonic, octave: tonicOctave }, key.mode, form);
  return scale[degree - 1];
}

/** Hebrew degree names; in minor, natural 7̂ is the subtonic. */
export function degreeNameHe(degree: number, opts?: { subtonic?: boolean }): string {
  const names = ["טוניקה", "סופרטוניקה", "מדיאנטה", "סובדומיננטה", "דומיננטה", "סובמדיאנטה", "צליל מוביל"];
  if (degree === 7 && opts?.subtonic) return "סוּבּטוניקה";
  return names[degree - 1];
}

export const DEGREE_NAMES_ALL = [
  "טוניקה",
  "סופרטוניקה",
  "מדיאנטה",
  "סובדומיננטה",
  "דומיננטה",
  "סובמדיאנטה",
  "צליל מוביל",
  "סוּבּטוניקה",
] as const;

/** Label for a signature, e.g. "3♯" / "5♭" / "ללא". */
export function sigLabel(sharps: number): string {
  if (sharps === 0) return "ללא";
  return sharps > 0 ? `${sharps}♯` : `${-sharps}♭`;
}

/* ---------------- spelled intervals ---------------- */

export type IvQuality = "perfect" | "major" | "minor" | "aug" | "dim";

export const IV_NUMBER_HE = [
  "פרימה",
  "סקונדה",
  "טרצה",
  "קוורטה",
  "קווינטה",
  "סקסטה",
  "ספטימה",
  "אוקטבה",
  "נונה",
  "דצימה",
] as const;

/** Interval names are feminine in Hebrew, so qualities take the feminine form. */
export const IV_QUALITY_HE: Record<IvQuality, string> = {
  perfect: "זכה",
  major: "גדולה",
  minor: "קטנה",
  aug: "מוגדלת",
  dim: "מוקטנת",
};

export function ivNameHe(size: number, quality: IvQuality): string {
  return `${IV_NUMBER_HE[size - 1]} ${IV_QUALITY_HE[quality]}`;
}

const PERFECT_SIZES = new Set([1, 4, 5, 8, 11, 12]);

/** Reference semitones of the perfect/major interval of each generic size. */
function refSemitones(size: number): number {
  const base = [0, 2, 4, 5, 7, 9, 11][(size - 1) % 7];
  return base + 12 * Math.floor((size - 1) / 7);
}

/** The spelled interval between two pitches (low → high), or null when the
 *  spelling falls outside dim..aug. Order-insensitive: measures |a→b|. */
export function intervalBetween(
  a: SpelledPitch,
  b: SpelledPitch
): { size: number; quality: IvQuality } | null {
  const [low, high] = midiOf(a) <= midiOf(b) ? [a, b] : [b, a];
  const size = diaOf(high) - diaOf(low) + 1;
  if (size < 1 || size > IV_NUMBER_HE.length) return null;
  const delta = midiOf(high) - midiOf(low) - refSemitones(size);
  if (PERFECT_SIZES.has(size)) {
    if (delta === 0) return { size, quality: "perfect" };
    if (delta === 1) return { size, quality: "aug" };
    if (delta === -1) return { size, quality: "dim" };
  } else {
    if (delta === 0) return { size, quality: "major" };
    if (delta === -1) return { size, quality: "minor" };
    if (delta === 1) return { size, quality: "aug" };
    if (delta === -2) return { size, quality: "dim" };
  }
  return null;
}

/** Build the pitch a spelled interval above (+1) or below (−1) a base note. */
export function applyInterval(
  base: SpelledPitch,
  size: number,
  quality: IvQuality,
  direction: 1 | -1
): SpelledPitch {
  const qDelta: number = PERFECT_SIZES.has(size)
    ? { perfect: 0, aug: 1, dim: -1, major: NaN, minor: NaN }[quality]
    : { major: 0, minor: -1, aug: 1, dim: -2, perfect: NaN }[quality];
  const semis = refSemitones(size) + qDelta;
  const dia = diaOf(base) + direction * (size - 1);
  const natural = pitchFromDia(dia);
  const alter = midiOf(base) + direction * semis - midiOf(natural);
  return { ...natural, alter };
}

const QUALITY_INV: Record<IvQuality, IvQuality> = {
  perfect: "perfect",
  major: "minor",
  minor: "major",
  aug: "dim",
  dim: "aug",
};

/** Inversion (simple intervals 1..8): numbers sum to 9, quality flips. */
export function invertIv(size: number, quality: IvQuality): { size: number; quality: IvQuality } {
  return { size: 9 - size, quality: QUALITY_INV[quality] };
}
