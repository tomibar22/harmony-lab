/** Unit 6 error-hunt data, kept in a plain module so tests can assert that
 *  the intended answer of every item matches what the rule engine derives. */

import { ExpectedChord, SatbChord } from "../../engine/voiceLeading";
import { ErrorHuntOption } from "../../workbook/errorHunt";
import { SpelledPitch, midiOf, triadPitches } from "../../workbook/pitch";

/** letter: 0=C 1=D 2=E 3=F 4=G 5=A 6=B */
const P = (letter: number, alter: number, octave: number): SpelledPitch => ({ letter, alter, octave });
const pc = (p: SpelledPitch) => ((midiOf(p) % 12) + 12) % 12;

const satb = (b: SpelledPitch, t: SpelledPitch, a: SpelledPitch, s: SpelledPitch): SatbChord => ({
  s,
  a,
  t,
  b,
});

export const CONSTRUCTION_OPTIONS: ErrorHuntOption[] = [
  { value: "range", label: "חריגה מטווח הקול", rules: ["range"] },
  { value: "crossing", label: "הצלבת קולות", rules: ["crossing"] },
  { value: "spacing", label: "מרווח גדול מאוקטבה בין קולות עליונים", rules: ["spacing"] },
  { value: "incomplete", label: "אקורד חסר", rules: ["incomplete"] },
  { value: "doubling", label: "הכפלה שגויה", rules: ["doubling"] },
  { value: "none", label: "אין שגיאה", rules: [] },
];

export const VL_OPTIONS: ErrorHuntOption[] = [
  { value: "p5", label: "קווינטות מקבילות", rules: ["parallel-fifths"] },
  { value: "p8", label: "אוקטבות מקבילות", rules: ["parallel-octaves"] },
  { value: "hidden", label: "קווינטה/אוקטבה סמויה בקולות החיצוניים", rules: ["hidden-fifths", "hidden-octaves"] },
  { value: "overlap", label: "חפיפת קולות", rules: ["overlap"] },
  { value: "none", label: "הכול תקין", rules: [] },
];

const C_TONES = triadPitches(P(0, 0, 4), "M");
const C_EXPECTED: ExpectedChord = { pcs: C_TONES.map(pc), bassPc: pc(C_TONES[0]) };
const C_EXPECTED_D: ExpectedChord = { ...C_EXPECTED, doublePc: pc(C_TONES[0]) };

export type ErrSpec = { chord: SatbChord; expected: ExpectedChord; intended: string };

/** All items are "I of C major, complete, root doubled" with one planted flaw. */
export const ERR_ITEMS: ErrSpec[] = [
  { chord: satb(P(0, 0, 3), P(4, 0, 3), P(2, 0, 4), P(0, 0, 5)), expected: C_EXPECTED_D, intended: "none" },
  { chord: satb(P(0, 0, 3), P(2, 0, 3), P(4, 0, 3), P(0, 0, 5)), expected: C_EXPECTED_D, intended: "spacing" },
  { chord: satb(P(0, 0, 2), P(4, 0, 3), P(2, 0, 4), P(0, 0, 5)), expected: C_EXPECTED_D, intended: "range" },
  { chord: satb(P(0, 0, 3), P(4, 0, 3), P(4, 0, 4), P(2, 0, 4)), expected: C_EXPECTED, intended: "crossing" },
  { chord: satb(P(0, 0, 3), P(0, 0, 4), P(2, 0, 4), P(0, 0, 5)), expected: C_EXPECTED_D, intended: "incomplete" },
  { chord: satb(P(0, 0, 3), P(2, 0, 3), P(2, 0, 4), P(4, 0, 4)), expected: C_EXPECTED_D, intended: "doubling" },
  { chord: satb(P(0, 0, 3), P(2, 0, 4), P(2, 0, 5), P(4, 0, 5)), expected: C_EXPECTED, intended: "range" },
  { chord: satb(P(0, 0, 3), P(0, 0, 4), P(2, 0, 4), P(4, 0, 4)), expected: C_EXPECTED_D, intended: "none" },
];

export type VlSpec = { pair: [SatbChord, SatbChord]; intended: string };

export const VL_ITEMS: VlSpec[] = [
  {
    // parallel fifths (tenor–bass): C → d
    pair: [
      satb(P(0, 0, 3), P(4, 0, 3), P(2, 0, 4), P(0, 0, 5)),
      satb(P(1, 0, 3), P(5, 0, 3), P(1, 0, 4), P(3, 0, 4)),
    ],
    intended: "p5",
  },
  {
    // parallel octaves (soprano–bass): C → G
    pair: [
      satb(P(0, 0, 3), P(4, 0, 3), P(2, 0, 4), P(0, 0, 5)),
      satb(P(4, 0, 2), P(6, 0, 3), P(1, 0, 4), P(4, 0, 4)),
    ],
    intended: "p8",
  },
  {
    // hidden octaves: both outer voices rise, soprano leaps onto the octave
    pair: [
      satb(P(0, 0, 3), P(4, 0, 3), P(0, 0, 4), P(2, 0, 4)),
      satb(P(4, 0, 3), P(6, 0, 3), P(1, 0, 4), P(4, 0, 4)),
    ],
    intended: "hidden",
  },
  {
    // overlap: the bass rises above where the tenor just was
    pair: [
      satb(P(0, 0, 3), P(4, 0, 3), P(2, 0, 4), P(0, 0, 5)),
      satb(P(5, 0, 3), P(0, 0, 4), P(3, 0, 4), P(3, 0, 5)),
    ],
    intended: "overlap",
  },
  {
    // clean: contrary motion into the dominant
    pair: [
      satb(P(0, 0, 3), P(4, 0, 3), P(2, 0, 4), P(0, 0, 5)),
      satb(P(4, 0, 2), P(4, 0, 3), P(1, 0, 4), P(6, 0, 4)),
    ],
    intended: "none",
  },
  {
    // parallel fifths (soprano–alto)
    pair: [
      satb(P(2, 0, 3), P(6, 0, 3), P(2, 0, 4), P(6, 0, 4)),
      satb(P(1, 0, 3), P(1, 0, 4), P(3, 0, 4), P(0, 0, 5)),
    ],
    intended: "p5",
  },
  {
    // hidden fifths: outer voices in similar motion, soprano leap onto a fifth
    pair: [
      satb(P(0, 0, 3), P(4, 0, 3), P(2, 0, 4), P(5, 0, 4)),
      satb(P(3, 0, 3), P(5, 0, 3), P(0, 0, 4), P(0, 0, 5)),
    ],
    intended: "hidden",
  },
  {
    // clean: outer-voice exchange over held upper voices
    pair: [
      satb(P(0, 0, 3), P(2, 0, 4), P(4, 0, 4), P(0, 0, 5)),
      satb(P(2, 0, 3), P(0, 0, 4), P(4, 0, 4), P(0, 0, 5)),
    ],
    intended: "none",
  },
];
