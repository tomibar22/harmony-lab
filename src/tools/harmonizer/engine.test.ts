import { describe, expect, it } from "vitest";
import { findKey, midiOf, SpelledPitch, degreePitch } from "../../workbook/pitch";
import { checkProgression, ExpectedChord, SatbChord, VOICES } from "../../engine/voiceLeading";
import { harmonize, vocabulary, voicingsFor, Solution } from "./engine";

const C = findKey("דו", "major");
const Am = findKey("לה", "minor");
const G = findKey("סול", "major");

const chroma = (p: SpelledPitch) => ((midiOf(p) % 12) + 12) % 12;

/** soprano helper: scale degrees in the key, tonic octave 4 (or 5 for high lines) */
function line(key: typeof C, degrees: number[], octave = 4): SpelledPitch[] {
  return degrees.map((d) =>
    d > 7
      ? degreePitch(key, d - 7, octave + 1, "natural")
      : degreePitch(key, d, octave, "natural")
  );
}

/** every returned solution must pass the full rule checker with zero errors */
function assertClean(solutions: Solution[]) {
  expect(solutions.length).toBeGreaterThan(0);
  for (const sol of solutions) {
    const expected: ExpectedChord[] = sol.specs.map((spec) => ({
      pcs: spec.tones.map((t) => chroma(t)),
      bassPc: chroma(spec.tones[spec.bassIdx]),
      requireComplete: false,
    }));
    const errors = checkProgression(sol.chords, expected).filter((v) => v.severity === "error");
    expect(errors).toEqual([]);
  }
}

describe("vocabulary", () => {
  it("major level 1: triads in root position and first inversion, vii° only in 6", () => {
    const ids = vocabulary(C, 1).map((s) => s.id);
    expect(ids).toContain("I");
    expect(ids).toContain("ii6");
    expect(ids).toContain("vii°6");
    expect(ids).not.toContain("vii°");
    expect(ids).not.toContain("V7");
  });

  it("minor: V is major (raised leading tone), III is natural", () => {
    const specs = vocabulary(Am, 1);
    const v = specs.find((s) => s.id === "V")!;
    // third of V in A minor is G#
    expect(v.tones[1].letter).toBe(4);
    expect(v.tones[1].alter).toBe(1);
    const iii = specs.find((s) => s.id === "III")!;
    expect(iii.tones.every((t) => t.alter === 0)).toBe(true);
  });

  it("level 2 adds V7 in all inversions and ii7; minor gets iiø7", () => {
    const ids = vocabulary(C, 2).map((s) => s.id);
    for (const f of ["V7", "V65", "V43", "V42", "ii7", "ii65"]) expect(ids).toContain(f);
    const mids = vocabulary(Am, 2).map((s) => s.id);
    expect(mids).toContain("iiø7");
  });

  it("level 3 adds secondary dominants, none of a diminished target", () => {
    const ids = vocabulary(C, 3).map((s) => s.id);
    expect(ids).toContain("V7/V");
    expect(ids).toContain("V65/ii");
    expect(ids.some((id) => id.endsWith("/vii°"))).toBe(false);
  });
});

describe("voicingsFor", () => {
  it("never doubles the leading tone", () => {
    const v = vocabulary(C, 1).find((s) => s.id === "V")!;
    const sopB4: SpelledPitch = { letter: 6, alter: 0, octave: 4 }; // B4 = leading tone
    for (const { chord } of voicingsFor(v, sopB4, false)) {
      const n = VOICES.filter((vn) => chroma(chord[vn]) === 11).length;
      expect(n).toBe(1);
    }
  });

  it("rejects a soprano that is not a chord tone (by spelling)", () => {
    const I = vocabulary(C, 1).find((s) => s.id === "I")!;
    expect(voicingsFor(I, { letter: 1, alter: 0, octave: 4 }, false)).toEqual([]);
  });
});

describe("harmonize", () => {
  it("3–2–1 in C major yields clean solutions including I–V–I with a full cadence", () => {
    const { solutions, problems } = harmonize({ key: C, soprano: line(C, [3, 2, 1], 4), level: 1 });
    expect(problems).toEqual([]);
    assertClean(solutions);
    const ivi = solutions.find((s) => s.numerals.join("–") === "I–V–I");
    expect(ivi).toBeDefined();
    expect(ivi!.cadence).toBe("קדנצה אותנטית שלמה");
  });

  it("5–4–3–2–1 in G major: many options, none with parallels or bad doublings", () => {
    const { solutions, problems } = harmonize({
      key: G,
      soprano: line(G, [5, 4, 3, 2, 1], 4),
      level: 2,
    });
    expect(problems).toEqual([]);
    assertClean(solutions);
    expect(solutions.length).toBeGreaterThan(3);
  });

  it("minor 3–2–1: V uses the raised leading tone, and every solution is clean", () => {
    const { solutions, problems } = harmonize({
      key: Am,
      soprano: line(Am, [3, 2, 1], 4),
      level: 1,
    });
    expect(problems).toEqual([]);
    assertClean(solutions);
    const withV = solutions.find((s) => s.numerals.includes("V") || s.numerals.includes("V6"));
    expect(withV).toBeDefined();
    // in i–V–i solutions the G# never appears doubled and always exists in V
    for (const sol of solutions) {
      sol.specs.forEach((spec, i) => {
        if (spec.degree === 5 && spec.secondaryOf == null) {
          const lt = VOICES.filter((v) => chroma(sol.chords[i][v]) === 8).length; // G#
          expect(lt).toBe(1);
        }
      });
    }
  });

  it("level 2: a 4–3 soprano supports V7→I with the seventh resolving down", () => {
    const { solutions } = harmonize({ key: C, soprano: line(C, [4, 3], 4), level: 2 });
    assertClean(solutions);
    const v7 = solutions.find((s) => s.numerals[0].startsWith("V7") && s.numerals[1].startsWith("I"));
    expect(v7).toBeDefined();
    // soprano F4 (the 7th) resolves to E4
    expect(midiOf(v7!.chords[1].s) - midiOf(v7!.chords[0].s)).toBe(-1);
  });

  it("level 3: a raised 4̂ finds V/V resolving to V", () => {
    // C major soprano: D5, F#4? keep in range: G4 F#4 G4 → V/V should appear before V
    const sop: SpelledPitch[] = [
      { letter: 4, alter: 0, octave: 4 }, // G4
      { letter: 3, alter: 1, octave: 4 }, // F#4
      { letter: 4, alter: 0, octave: 4 }, // G4
    ];
    const { solutions, problems } = harmonize({ key: C, soprano: sop, level: 3 });
    expect(problems).toEqual([]);
    assertClean(solutions);
    const sec = solutions.find((s) => s.numerals.some((n) => n.includes("/V")));
    expect(sec).toBeDefined();
    const i = sec!.numerals.findIndex((n) => n.includes("/V"));
    expect(sec!.specs[i + 1].degree).toBe(5);
  });

  it("a chromatic soprano tone at level 1 reports a helpful problem", () => {
    const sop: SpelledPitch[] = [
      { letter: 4, alter: 0, octave: 4 },
      { letter: 3, alter: 1, octave: 4 }, // F# has no diatonic chord in C
    ];
    const { solutions, problems } = harmonize({ key: C, soprano: sop, level: 1 });
    expect(solutions).toEqual([]);
    expect(problems.length).toBeGreaterThan(0);
  });

  it("out-of-range soprano reports a problem", () => {
    const sop: SpelledPitch[] = [
      { letter: 0, alter: 0, octave: 6 }, // C6 - above soprano range
      { letter: 6, alter: 0, octave: 5 },
    ];
    const { problems } = harmonize({ key: C, soprano: sop, level: 1 });
    expect(problems.length).toBeGreaterThan(0);
  });

  it("solutions are distinct progressions, ranked by cost", () => {
    const { solutions } = harmonize({ key: C, soprano: line(C, [3, 4, 2, 1], 4), level: 1 });
    const progs = solutions.map((s) => s.numerals.join("–"));
    expect(new Set(progs).size).toBe(progs.length);
    for (let i = 1; i < solutions.length; i++) {
      expect(solutions[i].cost).toBeGreaterThanOrEqual(solutions[i - 1].cost);
    }
  });

  it("no solution ever moves an inner voice by an augmented second (minor, 8–7–8 line)", () => {
    // 1̂–♯7̂–1̂ with the raised leading tone in the soprano (A4–G♯4–A4)
    const a4 = degreePitch(Am, 1, 4, "natural");
    const gs4 = degreePitch(Am, 7, 3, "harmonic");
    const { solutions } = harmonize({ key: Am, soprano: [a4, gs4, a4], level: 1 });
    assertClean(solutions);
    for (const sol of solutions) {
      for (let i = 1; i < sol.chords.length; i++) {
        for (const v of VOICES) {
          const d = Math.abs(midiOf(sol.chords[i][v]) - midiOf(sol.chords[i - 1][v]));
          expect(d).toBeLessThanOrEqual(12);
        }
      }
    }
  });
});

/** run the checker over a synthetic bad chord to be sure the harness catches errors */
describe("sanity", () => {
  it("checker wired correctly (moving parallel octaves are flagged)", () => {
    const c1: SatbChord = {
      s: { letter: 0, alter: 0, octave: 5 },
      a: { letter: 4, alter: 0, octave: 4 },
      t: { letter: 2, alter: 0, octave: 3 },
      b: { letter: 0, alter: 0, octave: 3 },
    };
    const c2: SatbChord = {
      s: { letter: 1, alter: 0, octave: 5 },
      a: { letter: 5, alter: 0, octave: 4 },
      t: { letter: 3, alter: 0, octave: 3 },
      b: { letter: 1, alter: 0, octave: 3 },
    };
    const errs = checkProgression([c1, c2]);
    expect(errs.some((e) => e.rule === "parallel-octaves")).toBe(true);
  });
});
