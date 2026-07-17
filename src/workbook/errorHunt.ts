/** Pure logic behind the error-hunt items: gather engine violations and map
 *  them to the exercise's answer options. Kept UI-free so the unit data can be
 *  verified by tests against the same derivation the component uses. */

import {
  ExpectedChord,
  SatbChord,
  Violation,
  checkChordContent,
  checkPair,
  checkRanges,
  checkSpacingOrder,
} from "../engine/voiceLeading";

export type ErrorHuntOption = { value: string; label: string; rules: string[] };

export function collectViolations(
  chords: SatbChord[],
  expected?: ExpectedChord | null
): Violation[] {
  const out: Violation[] = [];
  chords.forEach((c, i) => {
    out.push(...checkRanges(c, i));
    out.push(...checkSpacingOrder(c, i));
    if (expected) out.push(...checkChordContent(c, expected, i));
  });
  if (chords.length === 2) out.push(...checkPair(chords[0], chords[1]));
  return out;
}

/** The answer is the first option (in display order) whose rules were hit. */
export function deriveAnswer(
  found: Violation[],
  options: ErrorHuntOption[],
  noneValue: string
): string {
  for (const opt of options) {
    if (opt.value === noneValue) continue;
    if (found.some((v) => opt.rules.includes(v.rule))) return opt.value;
  }
  return noneValue;
}
