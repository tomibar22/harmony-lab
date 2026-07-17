import { describe, expect, it } from "vitest";
import { SpelledPitch } from "../workbook/pitch";
import {
  SatbChord,
  checkChordContent,
  checkHidden,
  checkOverlap,
  checkParallels,
  checkProgression,
  checkRanges,
  checkSpacingOrder,
} from "./voiceLeading";

/** letter: 0=C 1=D 2=E 3=F 4=G 5=A 6=B */
const P = (letter: number, alter: number, octave: number): SpelledPitch => ({ letter, alter, octave });

const chord = (s: SpelledPitch, a: SpelledPitch, t: SpelledPitch, b: SpelledPitch): SatbChord => ({
  s,
  a,
  t,
  b,
});

/* C major, good voicing: C4 in bass... (b t a s) = C3 G3 E4 C5 */
const C_GOOD = chord(P(0, 0, 5), P(2, 0, 4), P(4, 0, 3), P(0, 0, 3));
/* G major, approached cleanly from C_GOOD: (b t a s) = G2 G3 D4 B4 -
 * soprano steps down, bass leaps down, no perfect-interval parallels */
const G_GOOD = chord(P(6, 0, 4), P(1, 0, 4), P(4, 0, 3), P(4, 0, 2));

const rules = (v: { rule: string }[]) => v.map((x) => x.rule).sort();

describe("single-chord checks", () => {
  it("passes a clean chord", () => {
    expect(checkRanges(C_GOOD)).toEqual([]);
    expect(checkSpacingOrder(C_GOOD)).toEqual([]);
  });

  it("flags range violations", () => {
    const tooHigh = chord(P(0, 0, 6), P(2, 0, 4), P(4, 0, 3), P(0, 0, 3)); // soprano C6
    expect(rules(checkRanges(tooHigh))).toEqual(["range"]);
  });

  it("flags spacing beyond an octave between upper voices", () => {
    const wide = chord(P(0, 0, 5), P(6, -1, 3), P(4, 0, 3), P(0, 0, 3)); // S C5, A Bb3
    expect(rules(checkSpacingOrder(wide))).toContain("spacing");
  });

  it("flags voice crossing", () => {
    const crossed = chord(P(2, 0, 4), P(0, 0, 5), P(4, 0, 3), P(0, 0, 3)); // A above S
    expect(rules(checkSpacingOrder(crossed))).toContain("crossing");
  });

  it("checks content: wrong tone, wrong bass, incomplete, doubling", () => {
    const exp = { pcs: [0, 4, 7], bassPc: 0, doublePc: 0 };
    expect(checkChordContent(C_GOOD, exp)).toEqual([]);
    // F in the alto is not a chord tone
    const wrong = chord(P(0, 0, 5), P(3, 0, 4), P(4, 0, 3), P(0, 0, 3));
    expect(rules(checkChordContent(wrong, exp))).toContain("wrong-tone");
    // bass must be E for a 6 chord
    expect(rules(checkChordContent(C_GOOD, { pcs: [0, 4, 7], bassPc: 4 }))).toContain("wrong-bass");
    // no G anywhere → incomplete (the tripled C still satisfies the doubling rule)
    const noFifth = chord(P(0, 0, 5), P(2, 0, 4), P(0, 0, 4), P(0, 0, 3));
    expect(rules(checkChordContent(noFifth, exp))).toEqual(["incomplete"]);
    // E doubled instead of the required root
    const badDouble = chord(P(2, 0, 5), P(2, 0, 4), P(4, 0, 3), P(0, 0, 3));
    expect(rules(checkChordContent(badDouble, exp))).toContain("doubling");
  });
});

describe("pair checks", () => {
  it("passes clean contrary motion", () => {
    expect(checkParallels(C_GOOD, G_GOOD)).toEqual([]);
  });

  it("detects parallel fifths", () => {
    // (b t a s): C3 G3 E4 C5 → D3 A3 F4 D5: bass–tenor move C–G → D–A in parallel 5ths
    const d = chord(P(1, 0, 5), P(3, 0, 4), P(5, 0, 3), P(1, 0, 3));
    const v = checkParallels(C_GOOD, d);
    expect(v.some((x) => x.rule === "parallel-fifths" && x.voices.includes("t") && x.voices.includes("b"))).toBe(true);
  });

  it("detects parallel octaves", () => {
    const a = chord(P(0, 0, 5), P(2, 0, 4), P(4, 0, 3), P(0, 0, 3)); // S C5, B C3
    const b = chord(P(1, 0, 5), P(3, 0, 4), P(5, 0, 3), P(1, 0, 3)); // S D5, B D3? that's an octave+octave? C5–C3 is 2 octaves → class 0
    const v = checkParallels(a, b);
    expect(v.some((x) => x.rule === "parallel-octaves" && x.voices.includes("s") && x.voices.includes("b"))).toBe(true);
  });

  it("ignores repeated (static) perfect intervals", () => {
    expect(checkParallels(C_GOOD, C_GOOD)).toEqual([]);
  });

  it("detects hidden octaves with a soprano leap", () => {
    // outer voices both rise, soprano leaps a third, arriving on an octave G4/G3
    const from = chord(P(2, 0, 4), P(0, 0, 4), P(4, 0, 3), P(0, 0, 3)); // S E4, B C3
    const to = chord(P(4, 0, 4), P(1, 0, 4), P(6, 0, 3), P(4, 0, 3));   // S G4, B G3
    expect(rules(checkHidden(from, to))).toContain("hidden-octaves");
  });

  it("does not flag hidden octaves when the soprano moves by step", () => {
    const from = chord(P(3, 0, 4), P(0, 0, 4), P(5, 0, 3), P(3, 0, 3)); // S F4, B F3
    const to = chord(P(4, 0, 4), P(6, 0, 3), P(1, 0, 4), P(4, 0, 3));   // S G4 (step), B G3
    expect(checkHidden(from, to)).toEqual([]);
  });

  it("detects overlap", () => {
    // tenor moves above where the alto just was
    const from = chord(P(0, 0, 5), P(4, 0, 4), P(2, 0, 4), P(0, 0, 3));
    const to = chord(P(0, 0, 5), P(0, 0, 5), P(5, 0, 4), P(3, 0, 3)); // T A4 > prev A G4? prev A = G4? wait prev a = G4... T→A4 above G4
    expect(rules(checkOverlap(from, to))).toContain("overlap");
  });
});

describe("checkProgression", () => {
  it("aggregates chord and pair violations with indices", () => {
    const d = chord(P(1, 0, 5), P(3, 0, 4), P(5, 0, 3), P(1, 0, 3));
    const v = checkProgression([C_GOOD, d]);
    expect(v.length).toBeGreaterThan(0);
    expect(v.every((x) => x.chordIndex === 1)).toBe(true);
  });
});
