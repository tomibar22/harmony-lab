import { describe, expect, it } from "vitest";
import {
  degreePitch,
  findKey,
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

describe("staff helpers", () => {
  it("round-trips dia ↔ pitch", () => {
    expect(pitchFromDia(30)).toEqual({ letter: 2, alter: 0, octave: 4 }); // E4
    expect(vexKeyOf({ letter: 5, alter: 1, octave: 4 })).toBe("a#/4");
    expect(vexKeyOf({ letter: 6, alter: -2, octave: 2 })).toBe("bbb/2");
  });
});
