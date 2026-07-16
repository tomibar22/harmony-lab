import { describe, expect, it } from "vitest";
import {
  SpelledPitch,
  applyInterval,
  degreePitch,
  diatonicTriad,
  figureOf,
  findKey,
  invertChord,
  seventhPitches,
  triadPitches,
  intervalBetween,
  invertIv,
  ivNameHe,
  keyOf,
  midiOf,
  nameOf,
  pitchFromDia,
  spellScale,
  vexKeyOf,
} from "./pitch";

const names = (ps: { letter: number; alter: number }[]) => ps.map(nameOf).join(" ");

describe("keys", () => {
  it("builds the circle of fifths correctly", () => {
    expect(nameOf(keyOf(0, "major").tonic)).toBe("C");
    expect(nameOf(keyOf(3, "major").tonic)).toBe("A");
    expect(nameOf(keyOf(-4, "major").tonic)).toBe("A♭");
    expect(nameOf(keyOf(7, "major").tonic)).toBe("C♯");
    expect(nameOf(keyOf(-7, "major").tonic)).toBe("C♭");
    expect(nameOf(keyOf(0, "minor").tonic)).toBe("A");
    expect(nameOf(keyOf(4, "minor").tonic)).toBe("C♯");
    expect(nameOf(keyOf(-5, "minor").tonic)).toBe("B♭");
  });

  it("finds keys by Hebrew name", () => {
    expect(findKey("מי♭", "major").sharps).toBe(-3);
    expect(findKey("פה♯", "minor").sharps).toBe(3);
  });
});

describe("spellScale", () => {
  it("spells D major", () => {
    const scale = spellScale({ letter: 1, alter: 0, octave: 4 }, "major");
    expect(names(scale)).toBe("D E F♯ G A B C♯ D");
  });

  it("spells G♭ major with the right flats", () => {
    const key = findKey("סול♭", "major");
    const scale = spellScale({ ...key.tonic, octave: 3 }, "major");
    expect(names(scale)).toBe("G♭ A♭ B♭ C♭ D♭ E♭ F G♭");
  });

  it("spells harmonic minor with a raised 7 only", () => {
    const scale = spellScale({ letter: 0, alter: 0, octave: 4 }, "minor", "harmonic");
    expect(names(scale)).toBe("C D E♭ F G A♭ B C");
  });

  it("spells melodic minor ascending with raised 6 and 7", () => {
    const scale = spellScale({ letter: 0, alter: 0, octave: 4 }, "minor", "melodic");
    expect(names(scale)).toBe("C D E♭ F G A B C");
  });

  it("uses a double sharp where the spelling demands it (G♯ melodic minor)", () => {
    const key = findKey("סול♯", "minor");
    const scale = spellScale({ ...key.tonic, octave: 3 }, "minor", "melodic");
    expect(names(scale)).toBe("G♯ A♯ B C♯ D♯ E♯ F𝄪 G♯");
  });

  it("keeps midi consistent with the pattern", () => {
    const scale = spellScale({ letter: 4, alter: 0, octave: 3 }, "major"); // G major
    const midis = scale.map(midiOf);
    expect(midis).toEqual([55, 57, 59, 60, 62, 64, 66, 67]);
  });
});

describe("degreePitch", () => {
  it("finds 3̂ of E major = G♯", () => {
    expect(nameOf(degreePitch(findKey("מי", "major"), 3, 4))).toBe("G♯");
  });
  it("finds natural vs harmonic 7̂ of B minor", () => {
    const b = findKey("סי", "minor");
    expect(nameOf(degreePitch(b, 7, 3, "natural"))).toBe("A");
    expect(nameOf(degreePitch(b, 7, 3, "harmonic"))).toBe("A♯");
  });
});

const P = (letter: number, alter: number, octave: number): SpelledPitch => ({ letter, alter, octave });

describe("intervals", () => {
  it("identifies simple intervals", () => {
    expect(intervalBetween(P(0, 0, 4), P(2, 0, 4))).toEqual({ size: 3, quality: "major" }); // C–E
    expect(intervalBetween(P(1, 0, 4), P(0, 0, 5))).toEqual({ size: 7, quality: "minor" }); // D–C
    expect(intervalBetween(P(3, 0, 3), P(6, 0, 3))).toEqual({ size: 4, quality: "aug" });   // F–B
    expect(intervalBetween(P(6, 0, 3), P(3, 0, 4))).toEqual({ size: 5, quality: "dim" });   // B–F
  });

  it("distinguishes enharmonic spellings", () => {
    // C–D♯ (aug 2) vs C–E♭ (minor 3): same semitones, different names
    expect(intervalBetween(P(0, 0, 4), P(1, 1, 4))).toEqual({ size: 2, quality: "aug" });
    expect(intervalBetween(P(0, 0, 4), P(2, -1, 4))).toEqual({ size: 3, quality: "minor" });
    // C♯–B♭ = diminished 7
    expect(intervalBetween(P(0, 1, 4), P(6, -1, 4))).toEqual({ size: 7, quality: "dim" });
  });

  it("handles compounds up to a tenth", () => {
    expect(intervalBetween(P(2, 0, 4), P(4, 0, 5))).toEqual({ size: 10, quality: "minor" }); // E4–G5
    expect(ivNameHe(10, "minor")).toBe("דצימה קטנה");
  });

  it("is order-insensitive", () => {
    expect(intervalBetween(P(0, 0, 5), P(3, 0, 4))).toEqual({ size: 5, quality: "perfect" });
  });

  it("builds intervals above and below", () => {
    expect(nameOf(applyInterval(P(2, 0, 4), 3, "minor", 1))).toBe("G");        // m3 above E
    expect(applyInterval(P(1, 0, 4), 7, "dim", 1)).toEqual(P(0, -1, 5));       // d7 above D = C♭5
    expect(applyInterval(P(3, 1, 4), 7, "minor", -1)).toEqual(P(4, 1, 3));     // m7 below F♯4 = G♯3
    expect(applyInterval(P(5, 0, 3), 2, "aug", 1)).toEqual(P(6, 1, 3));        // A2 above A3 = B♯3
  });

  it("round-trips apply ↔ between", () => {
    const base = P(4, -1, 3); // G♭3
    for (const [size, q] of [[6, "major"], [5, "dim"], [4, "perfect"], [2, "minor"]] as const) {
      const up = applyInterval(base, size, q, 1);
      expect(intervalBetween(base, up)).toEqual({ size, quality: q });
      const down = applyInterval(base, size, q, -1);
      expect(intervalBetween(down, base)).toEqual({ size, quality: q });
    }
  });

  it("inverts by the rule of nine", () => {
    expect(invertIv(3, "minor")).toEqual({ size: 6, quality: "major" });
    expect(invertIv(4, "aug")).toEqual({ size: 5, quality: "dim" });
    expect(invertIv(8, "perfect")).toEqual({ size: 1, quality: "perfect" });
  });
});

describe("chords", () => {
  it("builds triads of all qualities", () => {
    expect(names(triadPitches(P(0, 0, 4), "M"))).toBe("C E G");
    expect(names(triadPitches(P(1, -1, 4), "m"))).toBe("D♭ F♭ A♭");
    expect(names(triadPitches(P(3, 1, 4), "d"))).toBe("F♯ A C");
    expect(names(triadPitches(P(2, -1, 4), "A"))).toBe("E♭ G B");
  });

  it("builds seventh chords of all qualities", () => {
    expect(names(seventhPitches(P(4, 0, 3), "X7"))).toBe("G B D F");
    expect(names(seventhPitches(P(3, 0, 4), "M7"))).toBe("F A C E");
    expect(names(seventhPitches(P(6, 0, 3), "hd7"))).toBe("B D F A");
    expect(names(seventhPitches(P(0, 1, 4), "d7"))).toBe("C♯ E G B♭");
  });

  it("stacks inversions in close position from the bass", () => {
    const cM = triadPitches(P(0, 0, 4), "M");
    expect(invertChord(cM, 1, 4).map(vexKeyOf)).toEqual(["e/4", "g/4", "c/5"]);
    expect(invertChord(cM, 2, 3).map(vexKeyOf)).toEqual(["g/3", "c/4", "e/4"]);
    const g7 = seventhPitches(P(4, 0, 3), "X7");
    expect(invertChord(g7, 3, 3).map(vexKeyOf)).toEqual(["f/3", "g/3", "b/3", "d/4"]);
  });

  it("labels figures", () => {
    expect(figureOf(3, 2)).toBe("6/4");
    expect(figureOf(4, 1)).toBe("6/5");
  });

  it("builds diatonic triads in a key", () => {
    const db = findKey("רה♭", "major");
    expect(names(diatonicTriad(db, 2, 3))).toBe("E♭ G♭ B♭"); // II of D♭
    const cs = findKey("דו♯", "minor");
    expect(names(diatonicTriad(cs, 5, 3, "harmonic"))).toBe("G♯ B♯ D♯"); // V of c♯ harmonic
  });
});

describe("staff helpers", () => {
  it("round-trips dia ↔ pitch", () => {
    expect(pitchFromDia(30)).toEqual({ letter: 2, alter: 0, octave: 4 }); // E4
    expect(vexKeyOf({ letter: 5, alter: 1, octave: 4 })).toBe("a#/4");
    expect(vexKeyOf({ letter: 6, alter: -2, octave: 2 })).toBe("bbb/2");
  });
});
