/** Soprano-harmonization engine.
 *
 *  Given a soprano line, a key and a harmonic vocabulary level, enumerates
 *  every four-voice realization that satisfies the book's voice-leading rules
 *  (ranges, spacing, doublings, parallels, leading-tone and seventh treatment,
 *  cross-relations) and ranks them by musical quality: smooth inner voices,
 *  common tones, functional grammar, cadence strength.
 *
 *  Hard rules reject a candidate outright; soft preferences only add cost.
 *  The search is a beam over voicing paths - transition cost is Markovian
 *  (depends only on the previous voicing), so per (progression, voicing) only
 *  the cheapest path is kept, and a per-progression cap keeps the beam diverse.
 *
 *  No rhythm here on purpose: the tool is a theoretical canvas - one soprano
 *  tone, one chord - exactly like the book's four-part exercises.
 */

import {
  Key,
  MinorForm,
  SpelledPitch,
  degreePitch,
  diaOf,
  diatonicTriad,
  intervalBetween,
  midiOf,
  nameHeOf,
  numeralOf,
  sameSpelling,
  spellScale,
} from "../../workbook/pitch";
import {
  RANGES,
  SatbChord,
  VoiceName,
  checkHidden,
  checkOverlap,
  checkParallels,
} from "../../engine/voiceLeading";

export type Level = 1 | 2 | 3;

export type ChordSpec = {
  /** unique id, doubles as the display label: "I", "ii6", "V65", "V7/ii" */
  id: string;
  /** root-position tones [root, 3rd, 5th, (7th)], spelled (octave arbitrary) */
  tones: SpelledPitch[];
  /** which tone is in the bass (inversion) */
  bassIdx: number;
  /** diatonic root degree; for a secondary dominant - the TARGET's degree */
  degree: number;
  /** set when the chord is an applied dominant of that degree */
  secondaryOf?: number;
  isSeventh: boolean;
  /** pc that behaves as a leading tone in this chord (never doubled) */
  ltPc: number | null;
  seventhPc: number | null;
  rootPc: number;
  /** pc the leading tone must resolve to, when the chord has dominant duty */
  resolvePc: number | null;
};

export type Voicing = { spec: ChordSpec; chord: SatbChord; cost: number };

export type Solution = {
  numerals: string[];
  chords: SatbChord[];
  specs: ChordSpec[];
  cost: number;
  cadence: string | null;
  warnings: string[];
};

export type HarmonizeResult = { solutions: Solution[]; problems: string[] };

const chroma = (p: SpelledPitch) => ((midiOf(p) % 12) + 12) % 12;

/* ================= vocabulary ================= */

const TRIAD_FIGS = ["", "6"];
const SEVENTH_FIGS = ["7", "65", "43", "42"];

function diatonicSeventhTones(key: Key, degree: number, form: MinorForm): SpelledPitch[] {
  const lower = spellScale({ ...key.tonic, octave: 4 }, key.mode, form);
  const upper = spellScale({ ...key.tonic, octave: 5 }, key.mode, form);
  const scale = [...lower.slice(0, 7), ...upper.slice(0, 7)];
  return [scale[degree - 1], scale[degree + 1], scale[degree + 3], scale[degree + 5]];
}

/** In minor, dominant-function chords borrow the raised 7̂; the rest stay natural. */
function formFor(key: Key, degree: number): MinorForm {
  return key.mode === "minor" && (degree === 5 || degree === 7) ? "harmonic" : "natural";
}

function keyLtPc(key: Key): number {
  return ((midiOf(degreePitch(key, 7, 4, "harmonic")) % 12) + 12) % 12;
}

function mkSpec(
  base: Omit<ChordSpec, "isSeventh" | "seventhPc" | "rootPc">
): ChordSpec {
  return {
    ...base,
    isSeventh: base.tones.length === 4,
    seventhPc: base.tones.length === 4 ? chroma(base.tones[3]) : null,
    rootPc: chroma(base.tones[0]),
  };
}

export function vocabulary(key: Key, level: Level): ChordSpec[] {
  const out: ChordSpec[] = [];
  const lt = keyLtPc(key);
  const tonicPc = ((midiOf({ ...key.tonic, octave: 4 }) % 12) + 12) % 12;

  for (let d = 1; d <= 7; d++) {
    const form = formFor(key, d);
    const tones = diatonicTriad(key, d, 4, form);
    const fifthSemis = ((midiOf(tones[2]) - midiOf(tones[0])) % 12 + 12) % 12;
    if (fifthSemis === 8) continue; // augmented triad (III+ etc.) - out of scope
    const dim = fifthSemis === 6;
    const numeral = numeralOf(key, d, form);
    // diminished triads appear in first inversion only (the book's rule)
    const inversions = dim ? [1] : [0, 1];
    for (const inv of inversions) {
      const hasLt = tones.some((t) => chroma(t) === lt);
      out.push(
        mkSpec({
          id: numeral + TRIAD_FIGS[inv],
          tones,
          bassIdx: inv,
          degree: d,
          ltPc: hasLt ? lt : null,
          resolvePc: d === 5 || d === 7 ? tonicPc : null,
        })
      );
    }
  }

  if (level >= 2) {
    const sevenths: { degree: number; inversions: number[] }[] = [
      { degree: 5, inversions: [0, 1, 2, 3] },
      { degree: 2, inversions: [0, 1] },
    ];
    for (const { degree, inversions } of sevenths) {
      const form = formFor(key, degree);
      const tones = diatonicSeventhTones(key, degree, form);
      const thirdSemis = ((midiOf(tones[1]) - midiOf(tones[0])) % 12 + 12) % 12;
      const fifthSemis = ((midiOf(tones[2]) - midiOf(tones[0])) % 12 + 12) % 12;
      let base = numeralOf(key, degree, form);
      if (fifthSemis === 6 && thirdSemis === 3) base = base.replace("°", "") + "ø";
      const hasLt = tones.some((t) => chroma(t) === lt);
      for (const inv of inversions) {
        out.push(
          mkSpec({
            id: base + SEVENTH_FIGS[inv],
            tones,
            bassIdx: inv,
            degree,
            ltPc: hasLt ? lt : null,
            resolvePc: degree === 5 ? tonicPc : null,
          })
        );
      }
    }
  }

  if (level >= 3) {
    const targets = key.mode === "minor" ? [3, 4, 5, 6] : [2, 3, 4, 5, 6];
    for (const t of targets) {
      const targetTones = diatonicTriad(key, t, 4, formFor(key, t));
      const targetFifth = ((midiOf(targetTones[2]) - midiOf(targetTones[0])) % 12 + 12) % 12;
      if (targetFifth === 6 || targetFifth === 8) continue; // no dominant of °/+
      const targetRoot = targetTones[0];
      // the applied dominant sits a perfect 5th above its target root
      const root = spellUp(targetRoot, 4, 7);
      const tones3 = [root, spellUp(root, 2, 4), spellUp(root, 4, 7)];
      const tones4 = [...tones3, spellUp(root, 6, 10)];
      const targetLabel = numeralOf(key, t, formFor(key, t));
      const resolvePc = chroma(targetRoot);
      for (const inv of [0, 1]) {
        out.push(
          mkSpec({
            id: `V${TRIAD_FIGS[inv]}/${targetLabel}`,
            tones: tones3,
            bassIdx: inv,
            degree: t,
            secondaryOf: t,
            ltPc: chroma(tones3[1]),
            resolvePc,
          })
        );
      }
      for (const inv of [0, 1, 2, 3]) {
        out.push(
          mkSpec({
            id: `V${SEVENTH_FIGS[inv]}/${targetLabel}`,
            tones: tones4,
            bassIdx: inv,
            degree: t,
            secondaryOf: t,
            ltPc: chroma(tones4[1]),
            resolvePc,
          })
        );
      }
    }
  }

  return out;
}

/** Spell the note `diaSteps` letters and `semis` semitones above base. */
function spellUp(base: SpelledPitch, diaSteps: number, semis: number): SpelledPitch {
  const dia = diaOf(base) + diaSteps;
  const letter = ((dia % 7) + 7) % 7;
  const octave = Math.floor(dia / 7);
  const natural: SpelledPitch = { letter, alter: 0, octave };
  return { letter, alter: midiOf(base) + semis - midiOf(natural), octave };
}

/* ================= voicings for one soprano tone ================= */

function tonesInRange(tone: SpelledPitch, range: [number, number]): SpelledPitch[] {
  const res: SpelledPitch[] = [];
  for (let o = 1; o <= 6; o++) {
    const p = { ...tone, octave: o };
    const m = midiOf(p);
    if (m >= range[0] && m <= range[1]) res.push(p);
  }
  return res;
}

function staticCost(spec: ChordSpec, chord: SatbChord, counts: number[]): number {
  let c = 0;
  const doubledIdx = counts.findIndex((n) => n >= 2);
  if (!spec.isSeventh) {
    if (counts[0] === 3) c += 0.35; // final tripled-root tonic - fine, mildly plain
    else if (spec.bassIdx === 0) {
      if (doubledIdx === 2) c += 0.5;
      else if (doubledIdx === 1) c += 0.9;
    } else {
      // 6/3: prefer doubling one of the outer voices' tones
      const dPc = chroma(spec.tones[doubledIdx]);
      if (dPc !== chroma(chord.s) && dPc !== chroma(chord.b)) c += 0.55;
      else c += 0.1;
    }
  } else if (counts[2] === 0) c += 0.25; // omitted fifth
  const span = midiOf(chord.t) - midiOf(chord.b);
  if (span > 19) c += 0.6;
  else if (span > 14) c += 0.2;
  // adjacent unisons are legal but weaken the texture
  if (midiOf(chord.s) === midiOf(chord.a)) c += 0.25;
  if (midiOf(chord.a) === midiOf(chord.t)) c += 0.25;
  if (midiOf(chord.t) === midiOf(chord.b)) c += 0.25;
  return c;
}

export function voicingsFor(
  spec: ChordSpec,
  soprano: SpelledPitch,
  isLast: boolean
): Voicing[] {
  const si = spec.tones.findIndex((t) => sameSpelling(t, soprano));
  if (si < 0) return [];
  const sMidi = midiOf(soprano);

  // candidate tone-count distributions over [root, 3rd, 5th, (7th)]
  const distributions: number[][] = [];
  if (!spec.isSeventh) {
    for (let d = 0; d < 3; d++) {
      if (spec.ltPc !== null && chroma(spec.tones[d]) === spec.ltPc) continue;
      const counts = [1, 1, 1];
      counts[d] += 1;
      distributions.push(counts);
    }
    // final tonic may omit the fifth with a tripled root
    if (isLast && spec.degree === 1 && spec.secondaryOf == null && spec.bassIdx === 0) {
      distributions.push([3, 1, 0]);
    }
  } else {
    distributions.push([1, 1, 1, 1]);
    // root-position dominant seventh: the fifth may be omitted, root doubled
    if (spec.bassIdx === 0 && spec.ltPc !== null) distributions.push([2, 1, 0, 1]);
  }

  const out: Voicing[] = [];
  for (const counts of distributions) {
    const rem = [...counts];
    rem[spec.bassIdx] -= 1;
    rem[si] -= 1;
    if (rem.some((n) => n < 0)) continue;
    const remIdx: number[] = [];
    rem.forEach((n, i) => {
      for (let k = 0; k < n; k++) remIdx.push(i);
    });
    if (remIdx.length !== 2) continue;
    const assigns =
      remIdx[0] === remIdx[1]
        ? [[remIdx[0], remIdx[1]]]
        : [
            [remIdx[0], remIdx[1]],
            [remIdx[1], remIdx[0]],
          ];
    for (const [ai, ti] of assigns) {
      for (const b of tonesInRange(spec.tones[spec.bassIdx], RANGES.b)) {
        const bm = midiOf(b);
        if (bm > sMidi) continue;
        for (const a of tonesInRange(spec.tones[ai], RANGES.a)) {
          const am = midiOf(a);
          if (am > sMidi || sMidi - am > 12) continue;
          for (const t of tonesInRange(spec.tones[ti], RANGES.t)) {
            const tm = midiOf(t);
            if (tm > am || am - tm > 12 || tm < bm) continue;
            const chord: SatbChord = { s: soprano, a, t, b };
            out.push({ spec, chord, cost: staticCost(spec, chord, counts) });
          }
        }
      }
    }
  }
  out.sort((x, y) => x.cost - y.cost);
  return out.slice(0, 18);
}

/* ================= grammar ================= */

/** Functional successions the book teaches; same-degree repeats are allowed. */
const NEXT: Record<number, number[]> = {
  1: [1, 2, 3, 4, 5, 6, 7],
  2: [2, 5, 7],
  3: [3, 4, 6],
  4: [1, 2, 4, 5, 7],
  5: [1, 5, 6],
  6: [2, 3, 4, 5, 6],
  7: [1, 7],
};

function stepAllowed(a: number, b: number): number | null {
  if (!NEXT[a].includes(b)) return null;
  if (a === b) return 0.15;
  if (a === 4 && b === 1) return 0.35; // plagal motion mid-phrase - real but marked
  return 0;
}

function grammarCost(a: ChordSpec, b: ChordSpec): number | null {
  if (a.secondaryOf != null) {
    if (b.secondaryOf != null) {
      if (b.secondaryOf === a.secondaryOf) return 0.2; // revoiced / 7th added
      if (chroma0(b.rootPc) === a.resolvePc) return 0.3; // chain of dominants
      return null;
    }
    return b.degree === a.secondaryOf ? 0 : null;
  }
  if (b.secondaryOf != null) {
    if (a.degree === b.secondaryOf) return 0.15; // a chord moving to its own dominant
    const viaTarget = stepAllowed(a.degree, b.secondaryOf);
    return viaTarget == null ? 0.7 : viaTarget + 0.15;
  }
  return stepAllowed(a.degree, b.degree);
}

const chroma0 = (pc: number) => ((pc % 12) + 12) % 12;

/* ================= transitions ================= */

/** Melodic legality/quality of one inner or bass voice's move. */
function melodicCost(p: SpelledPitch, q: SpelledPitch, voice: VoiceName): number | null {
  const d = midiOf(q) - midiOf(p);
  if (d === 0 && sameSpelling(p, q)) return 0;
  const iv = intervalBetween(p, q);
  if (!iv) return null;
  if (iv.quality === "aug" && iv.size > 1) return null; // aug 2nd/4th... - never
  if (iv.size > 8 || iv.size === 7) return null;
  let c = 0;
  if (iv.quality === "aug" && iv.size === 1) c += 0.15; // chromatic semitone - fine
  if (iv.quality === "dim") c += 0.7;
  if (iv.size === 8) c += voice === "b" ? 0.2 : 0.9;
  else if (iv.size === 6) c += voice === "b" ? 0.25 : 0.8;
  else if (iv.size >= 4) c += voice === "b" ? 0.05 : 0.25;
  return c;
}

/** Same chord (root + type): inversion shifts may carry LT/7th along. */
function sameFamily(a: ChordSpec, b: ChordSpec): boolean {
  return a.rootPc === b.rootPc && a.isSeventh === b.isSeventh;
}

const INNER: VoiceName[] = ["a", "t", "b"];
const ALL: VoiceName[] = ["s", "a", "t", "b"];

export function transition(
  a: Voicing,
  b: Voicing
): { cost: number; warnings: string[] } | null {
  const g = grammarCost(a.spec, b.spec);
  if (g == null) return null;
  let cost = g;
  const warnings: string[] = [];

  // melodic lines of the three written voices (the soprano is the given)
  for (const v of INNER) {
    const mc = melodicCost(a.chord[v], b.chord[v], v);
    if (mc == null) return null;
    cost += mc;
  }

  // cross-relation: a chromatic inflection must stay in one voice
  for (const v of ALL) {
    for (const w of ALL) {
      if (v === w) continue;
      const p = a.chord[v];
      const q = b.chord[w];
      if (p.letter === q.letter && p.alter !== q.alter) return null;
    }
  }

  if (checkParallels(a.chord, b.chord).length > 0) return null;
  for (const h of checkHidden(a.chord, b.chord)) {
    cost += 1.2;
    warnings.push(h.message);
  }
  for (const o of checkOverlap(a.chord, b.chord)) {
    cost += 1.1;
    warnings.push(o.message);
  }

  // leading-tone duty: on resolution to the target (or deceptively to VI)
  const fam = sameFamily(a.spec, b.spec);
  if (a.spec.ltPc != null && a.spec.resolvePc != null && !fam) {
    const isDiatonicDom = a.spec.secondaryOf == null;
    const resolvesNow =
      b.spec.secondaryOf == null &&
      (b.spec.degree === a.spec.degree ? false : b.spec.degree === (a.spec.secondaryOf ?? 1));
    const deceptive = isDiatonicDom && b.spec.secondaryOf == null && b.spec.degree === 6;
    if (resolvesNow || deceptive) {
      const fifthPc = chroma0(a.spec.resolvePc + 7);
      for (const v of ALL) {
        if (chroma(a.chord[v]) !== a.spec.ltPc) continue;
        const d = midiOf(b.chord[v]) - midiOf(a.chord[v]);
        const toTonic = d === 1 && chroma(b.chord[v]) === a.spec.resolvePc;
        // an inner-voice leading tone may fall a third to the fifth
        const innerDrop =
          v !== "s" && !deceptive && d === -4 && chroma(b.chord[v]) === fifthPc;
        if (!toTonic && !innerDrop) return null;
      }
    }
  }

  // a chordal seventh resolves down by step (unless the chord is revoiced)
  if (a.spec.seventhPc != null && !fam) {
    for (const v of ALL) {
      if (chroma(a.chord[v]) !== a.spec.seventhPc) continue;
      const dDia = diaOf(b.chord[v]) - diaOf(a.chord[v]);
      const d = midiOf(b.chord[v]) - midiOf(a.chord[v]);
      if (dDia !== -1 || d < -2 || d > -1) return null;
    }
  }

  // approaching a seventh: common tone is best, step is fine, leap is marked
  if (b.spec.seventhPc != null && !sameFamily(b.spec, a.spec)) {
    for (const v of ALL) {
      if (chroma(b.chord[v]) !== b.spec.seventhPc) continue;
      const d = Math.abs(midiOf(b.chord[v]) - midiOf(a.chord[v]));
      if (d === 0) cost -= 0.25;
      else if (d > 2) cost += b.spec.ltPc != null ? 0.45 : 0.9;
    }
  }

  // smoothness: total motion, common tones, outer-voice independence
  let motion = 0;
  let common = 0;
  for (const v of INNER) {
    const d = Math.abs(midiOf(b.chord[v]) - midiOf(a.chord[v]));
    motion += d;
    if (d === 0) common += 1;
  }
  cost += motion * 0.12 - common * 0.28;
  const sd = midiOf(b.chord.s) - midiOf(a.chord.s);
  const bd = midiOf(b.chord.b) - midiOf(a.chord.b);
  if (sd === 0 || bd === 0 || Math.sign(sd) !== Math.sign(bd)) cost -= 0.2;
  if (ALL.every((v) => midiOf(a.chord[v]) === midiOf(b.chord[v]))) cost += 1.2;

  // the deceptive resolution forces a doubled third in VI - don't punish it
  if (
    a.spec.secondaryOf == null &&
    (a.spec.degree === 5 || a.spec.degree === 7) &&
    b.spec.degree === 6 &&
    b.spec.secondaryOf == null
  ) {
    const thirdPc = chroma(b.spec.tones[1]);
    const n = ALL.filter((v) => chroma(b.chord[v]) === thirdPc).length;
    if (n >= 2) cost -= 0.7;
  }

  return { cost, warnings };
}

/* ================= opening and cadence ================= */

function firstCost(spec: ChordSpec): number {
  if (spec.secondaryOf == null && spec.degree === 1 && !spec.isSeventh) {
    return spec.bassIdx === 0 ? -2 : -0.5;
  }
  return 1.6;
}

function cadenceOf(
  prev: ChordSpec | null,
  last: ChordSpec,
  soprano: SpelledPitch,
  key: Key
): { bonus: number; label: string | null } {
  const tonicPc = ((midiOf({ ...key.tonic, octave: 4 }) % 12) + 12) % 12;
  const prevDiatonic = prev && prev.secondaryOf == null;
  if (last.secondaryOf == null && last.degree === 1 && !last.isSeventh) {
    if (last.bassIdx === 0) {
      if (prevDiatonic && prev!.degree === 5) {
        return chroma(soprano) === tonicPc
          ? { bonus: -3.2, label: "קדנצה אותנטית שלמה" }
          : { bonus: -2.4, label: "קדנצה אותנטית" };
      }
      if (prevDiatonic && prev!.degree === 7) return { bonus: -1.4, label: null };
      if (prevDiatonic && prev!.degree === 4) return { bonus: -1.2, label: "קדנצה פלגלית" };
      return { bonus: -0.5, label: null };
    }
    return { bonus: 0.6, label: null };
  }
  if (last.secondaryOf == null && last.degree === 5 && !last.isSeventh && last.bassIdx === 0) {
    return { bonus: -0.9, label: "חצי קדנצה" };
  }
  if (
    last.secondaryOf == null &&
    last.degree === 6 &&
    prevDiatonic &&
    (prev!.degree === 5 || prev!.degree === 7)
  ) {
    return { bonus: -0.9, label: "קדנצה נמנעת" };
  }
  return { bonus: 2.2, label: null };
}

/* ================= search ================= */

type Node = {
  vi: number;
  parent: Node | null;
  cost: number;
  prog: string;
  warnings: string[];
};

const BEAM = 350;
const PER_PROG = 3;
const MAX_SOLUTIONS = 12;

function prune(nodes: Node[]): Node[] {
  // Markov property: per (progression, current voicing) only the cheapest
  // path can ever win - drop the rest before the diversity cap
  const best = new Map<string, Node>();
  for (const n of nodes) {
    const k = n.prog + "#" + n.vi;
    const cur = best.get(k);
    if (!cur || n.cost < cur.cost) best.set(k, n);
  }
  const sorted = [...best.values()].sort((x, y) => x.cost - y.cost);
  const perProg = new Map<string, number>();
  const out: Node[] = [];
  for (const n of sorted) {
    const c = perProg.get(n.prog) ?? 0;
    if (c >= PER_PROG) continue;
    perProg.set(n.prog, c + 1);
    out.push(n);
    if (out.length >= BEAM) break;
  }
  return out;
}

export type HarmonizeInput = { key: Key; soprano: SpelledPitch[]; level: Level };

export function harmonize({ key, soprano, level }: HarmonizeInput): HarmonizeResult {
  const problems: string[] = [];
  if (soprano.length < 2) {
    return { solutions: [], problems: ["דרושים לפחות שני צלילים בקו הסופרן"] };
  }
  soprano.forEach((p, i) => {
    const m = midiOf(p);
    if (m < RANGES.s[0] || m > RANGES.s[1]) {
      problems.push(`הצליל ${i + 1} (${nameHeOf(p)}) מחוץ לטווח הסופרן (דו⁴–סול⁵)`);
    }
  });
  if (problems.length) return { solutions: [], problems };

  const specs = vocabulary(key, level);
  const n = soprano.length;
  const cols: Voicing[][] = [];
  for (let i = 0; i < n; i++) {
    const col: Voicing[] = [];
    for (const spec of specs) col.push(...voicingsFor(spec, soprano[i], i === n - 1));
    if (col.length === 0) {
      const anySpec = specs.some((s) => s.tones.some((t) => sameSpelling(t, soprano[i])));
      problems.push(
        anySpec
          ? `לא נמצאה פריסה תקינה לצליל ${i + 1} (${nameHeOf(soprano[i])})`
          : `לצליל ${i + 1} (${nameHeOf(soprano[i])}) אין אקורד מתאים ברמת המורכבות שנבחרה`
      );
    }
    col.sort((x, y) => x.cost - y.cost);
    cols.push(col.slice(0, 170));
  }
  if (problems.length) return { solutions: [], problems };

  let beam: Node[] = prune(
    cols[0].map((v, i) => ({
      vi: i,
      parent: null,
      cost: v.cost + firstCost(v.spec),
      prog: v.spec.id,
      warnings: [],
    }))
  );

  for (let c = 1; c < n; c++) {
    const next: Node[] = [];
    for (const node of beam) {
      const av = cols[c - 1][node.vi];
      for (let bi = 0; bi < cols[c].length; bi++) {
        const bv = cols[c][bi];
        const t = transition(av, bv);
        if (!t) continue;
        next.push({
          vi: bi,
          parent: node,
          cost: node.cost + bv.cost + t.cost,
          prog: node.prog + "–" + bv.spec.id,
          warnings: t.warnings.length
            ? [...node.warnings, ...t.warnings.map((m) => `אקורדים ${c}–${c + 1}: ${m}`)]
            : node.warnings,
        });
      }
    }
    beam = prune(next);
    if (beam.length === 0) {
      return {
        solutions: [],
        problems: [
          `לא נמצא חיבור תקין בין צליל ${c} לצליל ${c + 1} - נסו לשנות את הקו, את הסולם או את רמת המורכבות`,
        ],
      };
    }
  }

  // cadence scoring, then the best path per distinct progression
  const finals = new Map<string, { node: Node; total: number; cadence: string | null }>();
  for (const node of beam) {
    const lastSpec = cols[n - 1][node.vi].spec;
    const prevSpec = node.parent ? cols[n - 2][node.parent.vi].spec : null;
    const { bonus, label } = cadenceOf(prevSpec, lastSpec, soprano[n - 1], key);
    const total = node.cost + bonus;
    const cur = finals.get(node.prog);
    if (!cur || total < cur.total) finals.set(node.prog, { node, total, cadence: label });
  }

  const ranked = [...finals.values()].sort((x, y) => x.total - y.total).slice(0, MAX_SOLUTIONS);
  const solutions: Solution[] = ranked.map(({ node, total, cadence }) => {
    const vis: number[] = [];
    for (let p: Node | null = node; p; p = p.parent) vis.unshift(p.vi);
    const voicings = vis.map((vi, i) => cols[i][vi]);
    return {
      numerals: voicings.map((v) => v.spec.id),
      chords: voicings.map((v) => v.chord),
      specs: voicings.map((v) => v.spec),
      cost: total,
      cadence,
      warnings: [...new Set(node.warnings)],
    };
  });

  return { solutions, problems: [] };
}
