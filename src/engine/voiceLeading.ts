/** Four-part-writing rule checker.
 *  Pure functions over spelled pitches; every check returns Violations with
 *  Hebrew messages ready for the UI. Pitch-class comparisons use chroma
 *  (midi mod 12), never string equality. */

import { SpelledPitch, midiOf, nameHeOf } from "../workbook/pitch";

export type VoiceName = "s" | "a" | "t" | "b";
export const VOICES: VoiceName[] = ["s", "a", "t", "b"];
export const VOICE_HE: Record<VoiceName, string> = {
  s: "סופרן",
  a: "אלט",
  t: "טנור",
  b: "בס",
};

export type SatbChord = Record<VoiceName, SpelledPitch>;

export type RuleId =
  | "range"
  | "spacing"
  | "crossing"
  | "wrong-tone"
  | "wrong-bass"
  | "incomplete"
  | "doubling"
  | "parallel-fifths"
  | "parallel-octaves"
  | "hidden-fifths"
  | "hidden-octaves"
  | "overlap";

export type Violation = {
  rule: RuleId;
  severity: "error" | "warning";
  chordIndex: number;
  voices: VoiceName[];
  message: string;
};

const chroma = (p: SpelledPitch) => ((midiOf(p) % 12) + 12) % 12;

/** Voice ranges (inclusive, midi) - the book's practical SATB compass. */
export const RANGES: Record<VoiceName, [number, number]> = {
  s: [60, 79], // C4–G5
  a: [55, 74], // G3–D5
  t: [48, 67], // C3–G4
  b: [40, 60], // E2–C4
};

/* ---------------- single-chord checks ---------------- */

export function checkRanges(chord: SatbChord, chordIndex = 0): Violation[] {
  const out: Violation[] = [];
  for (const v of VOICES) {
    const m = midiOf(chord[v]);
    const [lo, hi] = RANGES[v];
    if (m < lo || m > hi) {
      out.push({
        rule: "range",
        severity: "error",
        chordIndex,
        voices: [v],
        message: `${nameHeOf(chord[v])} חורג מטווח ה${VOICE_HE[v]}`,
      });
    }
  }
  return out;
}

export function checkSpacingOrder(chord: SatbChord, chordIndex = 0): Violation[] {
  const out: Violation[] = [];
  const { s, a, t } = chord;
  if (midiOf(s) - midiOf(a) > 12)
    out.push({
      rule: "spacing",
      severity: "error",
      chordIndex,
      voices: ["s", "a"],
      message: "יותר מאוקטבה בין סופרן לאלט",
    });
  if (midiOf(a) - midiOf(t) > 12)
    out.push({
      rule: "spacing",
      severity: "error",
      chordIndex,
      voices: ["a", "t"],
      message: "יותר מאוקטבה בין אלט לטנור",
    });
  const pairs: [VoiceName, VoiceName][] = [
    ["s", "a"],
    ["a", "t"],
    ["t", "b"],
  ];
  for (const [hi, lo] of pairs) {
    if (midiOf(chord[hi]) < midiOf(chord[lo]))
      out.push({
        rule: "crossing",
        severity: "error",
        chordIndex,
        voices: [hi, lo],
        message: `הצלבת קולות: ה${VOICE_HE[hi]} מתחת ל${VOICE_HE[lo]}`,
      });
  }
  return out;
}

export type ExpectedChord = {
  /** pitch classes of the chord tones (chroma) */
  pcs: number[];
  /** required bass pitch class */
  bassPc: number;
  /** pitch class that must be doubled (triads in four voices), if enforced */
  doublePc?: number;
  /** must every chord tone appear? (default true) */
  requireComplete?: boolean;
};

export function checkChordContent(
  chord: SatbChord,
  expected: ExpectedChord,
  chordIndex = 0
): Violation[] {
  const out: Violation[] = [];
  const pcSet = new Set(expected.pcs.map((p) => ((p % 12) + 12) % 12));

  for (const v of VOICES) {
    if (!pcSet.has(chroma(chord[v]))) {
      out.push({
        rule: "wrong-tone",
        severity: "error",
        chordIndex,
        voices: [v],
        message: `${nameHeOf(chord[v])} (${VOICE_HE[v]}) אינו צליל של האקורד`,
      });
    }
  }
  if (chroma(chord.b) !== ((expected.bassPc % 12) + 12) % 12) {
    out.push({
      rule: "wrong-bass",
      severity: "error",
      chordIndex,
      voices: ["b"],
      message: "צליל הבס אינו הצליל שהמצב (הספרור) דורש",
    });
  }
  if (expected.requireComplete !== false) {
    const present = new Set(VOICES.map((v) => chroma(chord[v])));
    if (![...pcSet].every((pc) => present.has(pc))) {
      out.push({
        rule: "incomplete",
        severity: "error",
        chordIndex,
        voices: [...VOICES],
        message: "האקורד חסר - לא כל צלילי האקורד נוכחים",
      });
    }
  }
  if (expected.doublePc !== undefined) {
    const dp = ((expected.doublePc % 12) + 12) % 12;
    const count = VOICES.filter((v) => chroma(chord[v]) === dp).length;
    if (count < 2) {
      out.push({
        rule: "doubling",
        severity: "error",
        chordIndex,
        voices: [...VOICES],
        message: "ההכפלה שגויה - הצליל שנדרש להכפלה מופיע פעם אחת בלבד",
      });
    }
  }
  return out;
}

/* ---------------- chord-pair checks ---------------- */

const IV_CLASS = (semis: number) => ((semis % 12) + 12) % 12;

/** All six voice pairs, upper voice first. */
const PAIRS: [VoiceName, VoiceName][] = [
  ["s", "a"],
  ["s", "t"],
  ["s", "b"],
  ["a", "t"],
  ["a", "b"],
  ["t", "b"],
];

/** Parallel and antiparallel perfect fifths/octaves between two chords.
 *  `chordIndex` refers to the SECOND chord of the pair. */
export function checkParallels(a: SatbChord, b: SatbChord, chordIndex = 1): Violation[] {
  const out: Violation[] = [];
  for (const [hi, lo] of PAIRS) {
    const iv1 = IV_CLASS(midiOf(a[hi]) - midiOf(a[lo]));
    const iv2 = IV_CLASS(midiOf(b[hi]) - midiOf(b[lo]));
    const moved = midiOf(a[hi]) !== midiOf(b[hi]) && midiOf(a[lo]) !== midiOf(b[lo]);
    if (!moved) continue;
    if (iv1 === 7 && iv2 === 7) {
      out.push({
        rule: "parallel-fifths",
        severity: "error",
        chordIndex,
        voices: [hi, lo],
        message: `קווינטות מקבילות בין ${VOICE_HE[hi]} ל${VOICE_HE[lo]}`,
      });
    }
    if (iv1 === 0 && iv2 === 0) {
      out.push({
        rule: "parallel-octaves",
        severity: "error",
        chordIndex,
        voices: [hi, lo],
        message: `אוקטבות מקבילות בין ${VOICE_HE[hi]} ל${VOICE_HE[lo]}`,
      });
    }
  }
  return out;
}

/** Hidden (direct) fifths/octaves: outer voices in similar motion into a
 *  perfect interval, with a leap in the soprano. */
export function checkHidden(a: SatbChord, b: SatbChord, chordIndex = 1): Violation[] {
  const out: Violation[] = [];
  const sMove = midiOf(b.s) - midiOf(a.s);
  const bMove = midiOf(b.b) - midiOf(a.b);
  if (sMove === 0 || bMove === 0) return out;
  if (Math.sign(sMove) !== Math.sign(bMove)) return out;
  const iv2 = IV_CLASS(midiOf(b.s) - midiOf(b.b));
  const iv1 = IV_CLASS(midiOf(a.s) - midiOf(a.b));
  const sopranoLeaps = Math.abs(sMove) > 2;
  if (!sopranoLeaps) return out;
  if (iv2 === 7 && iv1 !== 7) {
    out.push({
      rule: "hidden-fifths",
      severity: "warning",
      chordIndex,
      voices: ["s", "b"],
      message: "קווינטה סמויה: הקולות החיצוניים מגיעים לקווינטה בתנועה דומה ובקפיצת סופרן",
    });
  }
  if (iv2 === 0 && iv1 !== 0) {
    out.push({
      rule: "hidden-octaves",
      severity: "warning",
      chordIndex,
      voices: ["s", "b"],
      message: "אוקטבה סמויה: הקולות החיצוניים מגיעים לאוקטבה בתנועה דומה ובקפיצת סופרן",
    });
  }
  return out;
}

/** Overlap: a voice moves past the previous position of its neighbour. */
export function checkOverlap(a: SatbChord, b: SatbChord, chordIndex = 1): Violation[] {
  const out: Violation[] = [];
  const adj: [VoiceName, VoiceName][] = [
    ["s", "a"],
    ["a", "t"],
    ["t", "b"],
  ];
  for (const [hi, lo] of adj) {
    if (midiOf(b[lo]) > midiOf(a[hi]) || midiOf(b[hi]) < midiOf(a[lo])) {
      out.push({
        rule: "overlap",
        severity: "warning",
        chordIndex,
        voices: [hi, lo],
        message: `חפיפת קולות בין ${VOICE_HE[hi]} ל${VOICE_HE[lo]} במעבר בין האקורדים`,
      });
    }
  }
  return out;
}

export function checkPair(a: SatbChord, b: SatbChord, chordIndex = 1): Violation[] {
  return [
    ...checkParallels(a, b, chordIndex),
    ...checkHidden(a, b, chordIndex),
    ...checkOverlap(a, b, chordIndex),
  ];
}

/** Full progression check: per-chord construction + every adjacent pair. */
export function checkProgression(
  chords: SatbChord[],
  expected?: (ExpectedChord | null)[]
): Violation[] {
  const out: Violation[] = [];
  chords.forEach((c, i) => {
    out.push(...checkRanges(c, i));
    out.push(...checkSpacingOrder(c, i));
    const exp = expected?.[i];
    if (exp) out.push(...checkChordContent(c, exp, i));
  });
  for (let i = 1; i < chords.length; i++) {
    out.push(...checkPair(chords[i - 1], chords[i], i));
  }
  return out;
}
