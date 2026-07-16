import { ReactNode, useMemo, useState } from "react";
import { playNote } from "../engine/audio";
import { Score, ScoreNote } from "../components/Score";
import { Deg, PlayButton, usePlayer } from "../components/ui";
import { Chips, Feedback } from "./exercise";
import {
  DEGREE_NAMES_ALL,
  IV_NUMBER_HE,
  IV_QUALITY_HE,
  IvQuality,
  MinorForm,
  Mode,
  SpelledPitch,
  applyInterval,
  degreeNameHe,
  degreePitch,
  findKey,
  intervalBetween,
  invertIv,
  ivNameHe,
  keyOf,
  midiOf,
  nameHeOf,
  sameSpelling,
  sigLabel,
  spellScale,
  vexKeyOf,
} from "./pitch";
import { SlotStatus, StaffInput } from "./StaffInput";

export type Clef = "treble" | "bass";

/** Put a letter inside the staff (no ledger lines): treble E4–F5, bass G2–A3. */
export function staffOctave(clef: Clef, letter: number): number {
  const bottom = clef === "treble" ? 30 : 18; // dia of the bottom line
  for (let o = 1; o < 8; o++) {
    const dia = o * 7 + letter;
    if (dia >= bottom && dia <= bottom + 8) return o;
  }
  return 4;
}

const FORM_HE: Record<MinorForm, string> = {
  natural: "טבעי",
  harmonic: "הרמוני",
  melodic: "מלודי (בעלייה)",
};

const modeHe = (mode: Mode) => (mode === "major" ? "מז'ור" : "מינור");

/* =========================================================================
 * 1. Scale writing: given one pitch + its degree, write the full scale 1̂–8̂.
 * ========================================================================= */

export type ScaleWriteSpec = {
  clef: Clef;
  tonicHe: string;       // Hebrew tonic name, e.g. "מי♭"
  mode: Mode;
  form?: MinorForm;
  givenDegree: number;   // 1..7
  tonicOctave: number;   // octave of 1̂ on the staff
};

export function ScaleWriteItem({
  spec,
  solved,
  markSolved,
}: {
  spec: ScaleWriteSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const key = findKey(spec.tonicHe, spec.mode);
  const expected = useMemo(
    () => spellScale({ ...key.tonic, octave: spec.tonicOctave }, spec.mode, spec.form ?? "natural"),
    [key, spec]
  );
  const given = expected[spec.givenDegree - 1];

  const [notes, setNotes] = useState<(SpelledPitch | null)[]>(Array(8).fill(null));
  const [status, setStatus] = useState<SlotStatus[] | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const player = usePlayer();

  const allFilled = notes.every(Boolean);

  const check = () => {
    const filled = notes as SpelledPitch[];
    // anchor: the correct tonic in the octave nearest the student's first note,
    // so a scale written an octave lower is judged on its own terms
    const cands = [-1, 0, 1].map((d) => spec.tonicOctave + d);
    const anchor = cands.reduce((best, o) =>
      Math.abs(midiOf({ ...key.tonic, octave: o }) - midiOf(filled[0])) <
      Math.abs(midiOf({ ...key.tonic, octave: best }) - midiOf(filled[0]))
        ? o
        : best
    );
    const exp = spellScale({ ...key.tonic, octave: anchor }, spec.mode, spec.form ?? "natural");
    const st: SlotStatus[] = filled.map((p, i) =>
      p.letter === exp[i].letter && p.alter === exp[i].alter && p.octave === exp[i].octave ? "ok" : "bad"
    );
    setStatus(st);
    const ok = st.every((s) => s === "ok");
    setState(ok ? "ok" : "bad");
    if (ok) {
      markSolved();
      void player.play(
        filled.map((p, i) => ({ midi: midiOf(p), time: i * 0.45, dur: 0.5, idx: i })),
        132
      );
    } else {
      setFailures((f) => f + 1);
    }
  };

  const promptNote: ScoreNote[] = [
    { keys: [vexKeyOf(given)], midi: [midiOf(given)], degree: String(spec.givenDegree), kind: "active" },
  ];
  const solutionNotes: ScoreNote[] = expected.map((p, i) => ({
    keys: [vexKeyOf(p)],
    midi: [midiOf(p)],
    degree: i === 7 ? "8" : String(i + 1),
  }));

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          הצליל המסומן הוא דרגה <Deg n={spec.givenDegree} /> בסולם{" "}
          <b>
            {spec.mode === "major" ? "מז'ורי" : `מינורי ${FORM_HE[spec.form ?? "natural"]}`}
          </b>
          . זהו את הסולם וכתבו אותו במלואו, מ־<Deg n={1} /> עד <Deg n={8} />.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
        <div className="wb-prompt-score">
          <Score notes={promptNote} clef={spec.clef} width={150} ariaLabel="הצליל הנתון ודרגתו" />
        </div>
      </div>
      <StaffInput
        clef={spec.clef}
        slots={8}
        value={notes}
        onChange={(n) => {
          setNotes(n);
          setStatus(null);
          setState(null);
        }}
        status={status}
        highlight={player.index}
        ariaLabel="חמשה לכתיבת הסולם"
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={!allFilled}>
          בדיקה
        </button>
        <PlayButton
          ghost
          label="השמעה"
          player={player}
          events={notes
            .map((p, i) => (p ? { midi: midiOf(p), time: i * 0.45, dur: 0.5, idx: i } : null))
            .filter((e): e is NonNullable<typeof e> => !!e)}
          bpm={132}
        />
        {failures >= 2 && !showSolution && (
          <button className="play-btn ghost" onClick={() => setShowSolution(true)}>
            הצגת הפתרון
          </button>
        )}
      </div>
      <Feedback state={state} />
      {showSolution && (
        <div className="wb-solution">
          <div className="wb-solution-label">הפתרון — {key.nameHe}{spec.mode === "minor" ? ` (${FORM_HE[spec.form ?? "natural"]})` : ""}:</div>
          <Score notes={solutionNotes} clef={spec.clef} ariaLabel="הסולם הפתור" />
        </div>
      )}
    </div>
  );
}

/* =========================================================================
 * 2. Single pitch from key + degree.
 * ========================================================================= */

export type PitchWriteSpec = {
  clef: Clef;
  tonicHe: string;
  mode: Mode;
  degree: number;
  form?: MinorForm;
};

export function PitchWriteItem({
  spec,
  solved,
  markSolved,
}: {
  spec: PitchWriteSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const key = findKey(spec.tonicHe, spec.mode);
  const expected = degreePitch(key, spec.degree, 4, spec.form ?? "natural");
  const [notes, setNotes] = useState<(SpelledPitch | null)[]>([null]);
  const [status, setStatus] = useState<SlotStatus[] | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);

  const check = () => {
    const p = notes[0];
    if (!p) return;
    const ok = sameSpelling(p, expected); // any octave - it's a spelling question
    setStatus([ok ? "ok" : "bad"]);
    setState(ok ? "ok" : "bad");
    if (ok) markSolved();
    else setFailures((f) => f + 1);
  };

  const formNote =
    spec.mode === "minor" && spec.form && spec.form !== "natural" ? ` — מינור ${FORM_HE[spec.form]}` : "";

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          כתבו על החמשה את דרגה <Deg n={spec.degree} /> של <b>{key.nameHe}</b>
          {formNote}. הגובה (אוקטבה) לבחירתכם — האיות הוא שנבדק.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
      </div>
      <StaffInput
        clef={spec.clef}
        slots={1}
        value={notes}
        onChange={(n) => {
          setNotes(n);
          setStatus(null);
          setState(null);
        }}
        status={status}
        ariaLabel="חמשה לכתיבת הצליל"
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={!notes[0]}>
          בדיקה
        </button>
        {failures >= 2 && !reveal && (
          <button className="play-btn ghost" onClick={() => setReveal(true)}>
            הצגת הפתרון
          </button>
        )}
      </div>
      <Feedback state={state} correct={reveal ? <>התשובה: <b>{nameHeOf(expected)}</b>.</> : undefined} />
      {reveal && state !== "ok" && (
        <div className="wb-solution">
          <div className="wb-solution-label">
            התשובה: <b>{nameHeOf(expected)}</b>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
 * 3. Signature → key + degree name (identification).
 * ========================================================================= */

export type SigIdSpec = {
  clef: Clef;
  sharps: number;
  mode: Mode;
  degree: number; // diatonic (natural minor) degree of the shown note
};

export function SigIdItem({
  spec,
  solved,
  markSolved,
}: {
  spec: SigIdSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const key = keyOf(spec.sharps, spec.mode);
  const letter = ((key.tonic.letter + spec.degree - 1) % 7 + 7) % 7;
  const note = degreePitch(key, spec.degree, staffOctave(spec.clef, letter) - Math.floor((key.tonic.letter + spec.degree - 1) / 7), "natural");
  const answerDegName = degreeNameHe(spec.degree, { subtonic: spec.mode === "minor" });

  const [pickedKey, setPickedKey] = useState<number | null>(null); // sharps
  const [pickedDeg, setPickedDeg] = useState<string | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);

  const keyOptions = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => i - 7).map((s) => ({
        value: s,
        label: nameHeOf(keyOf(s, spec.mode).tonic),
      })),
    [spec.mode]
  );
  const degOptions = (spec.mode === "minor" ? DEGREE_NAMES_ALL : DEGREE_NAMES_ALL.slice(0, 7)).map(
    (n) => ({ value: n, label: n })
  );

  const check = () => {
    const ok = pickedKey === spec.sharps && pickedDeg === answerDegName;
    setState(ok ? "ok" : "bad");
    if (ok) markSolved();
    else setFailures((f) => f + 1);
  };

  const scoreNotes: ScoreNote[] = [{ keys: [vexKeyOf(note)], midi: [midiOf(note)] }];

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          לפניכם סימן היתק של סולם <b>{modeHe(spec.mode)}</b> וצליל מתוכו. זהו את הסולם ואת שם הדרגה
          של הצליל.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
        <div className="wb-prompt-score">
          <Score
            notes={scoreNotes}
            clef={spec.clef}
            keySig={key.vex}
            width={190}
            ariaLabel="סימן ההיתק והצליל הנתון"
          />
        </div>
      </div>
      <Chips
        label="הסולם:"
        options={keyOptions}
        value={pickedKey}
        onChange={(v) => {
          setPickedKey(v);
          setState(null);
        }}
        compact
      />
      <Chips
        label="הדרגה:"
        options={degOptions}
        value={pickedDeg}
        onChange={(v) => {
          setPickedDeg(v);
          setState(null);
        }}
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={pickedKey === null || pickedDeg === null}>
          בדיקה
        </button>
        {failures >= 2 && !reveal && (
          <button className="play-btn ghost" onClick={() => setReveal(true)}>
            הצגת הפתרון
          </button>
        )}
      </div>
      <Feedback
        state={state}
        correct={
          reveal ? (
            <>
              התשובה: <b>{key.nameHe}</b>, הדרגה — <b>{answerDegName}</b>.
            </>
          ) : undefined
        }
      />
    </div>
  );
}

/* =========================================================================
 * 4. Note + degree name → signature (writing the signature).
 * ========================================================================= */

export type SigWriteSpec = {
  clef: Clef;
  sharps: number;
  mode: Mode;
  degree: number;
};

export function SigWriteItem({
  spec,
  solved,
  markSolved,
}: {
  spec: SigWriteSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const key = keyOf(spec.sharps, spec.mode);
  const letter = ((key.tonic.letter + spec.degree - 1) % 7 + 7) % 7;
  const note = degreePitch(key, spec.degree, staffOctave(spec.clef, letter) - Math.floor((key.tonic.letter + spec.degree - 1) / 7), "natural");
  const degName = degreeNameHe(spec.degree, { subtonic: spec.mode === "minor" });

  const [picked, setPicked] = useState<number | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);

  const sigOptions = Array.from({ length: 15 }, (_, i) => i - 7).map((s) => ({
    value: s,
    label: sigLabel(s),
  }));

  const check = () => {
    const ok = picked === spec.sharps;
    setState(ok ? "ok" : "bad");
    if (ok) markSolved();
    else setFailures((f) => f + 1);
  };

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          הצליל שלפניכם הוא ה<b>{degName}</b> של סולם <b>{modeHe(spec.mode)}</b> כלשהו. זהו את הסולם
          ובחרו את סימן ההיתק שלו.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
        <div className="wb-prompt-score">
          <Score
            notes={[{ keys: [vexKeyOf(note)], midi: [midiOf(note)] }]}
            clef={spec.clef}
            width={130}
            ariaLabel="הצליל הנתון"
          />
        </div>
      </div>
      <Chips
        label="סימן ההיתק:"
        options={sigOptions}
        value={picked}
        onChange={(v) => {
          setPicked(v);
          setState(null);
        }}
        compact
      />
      {picked !== null && (
        <div className="wb-sig-preview">
          <Score
            notes={[]}
            clef={spec.clef}
            keySig={keyOf(picked, "major").vex}
            width={170}
            ariaLabel={`סימן היתק: ${sigLabel(picked)}`}
          />
        </div>
      )}
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={picked === null}>
          בדיקה
        </button>
        {failures >= 2 && !reveal && (
          <button className="play-btn ghost" onClick={() => setReveal(true)}>
            הצגת הפתרון
          </button>
        )}
      </div>
      <Feedback
        state={state}
        correct={
          reveal ? (
            <>
              התשובה: <b>{key.nameHe}</b> — {sigLabel(spec.sharps)}.
            </>
          ) : undefined
        }
      />
    </div>
  );
}

/* =========================================================================
 * 5. Interval identification: a written dyad → size + quality.
 * ========================================================================= */

const IV_SIZE_OPTIONS = IV_NUMBER_HE.map((n, i) => ({ value: i + 1, label: n }));
const IV_QUALITY_OPTIONS = (Object.keys(IV_QUALITY_HE) as IvQuality[]).map((q) => ({
  value: q,
  label: IV_QUALITY_HE[q],
}));

export type IntervalIdSpec = {
  clef: Clef;
  low: SpelledPitch;
  high: SpelledPitch;
};

export function IntervalIdItem({
  spec,
  solved,
  markSolved,
}: {
  spec: IntervalIdSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const answer = intervalBetween(spec.low, spec.high)!;
  const [size, setSize] = useState<number | null>(null);
  const [quality, setQuality] = useState<IvQuality | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);

  const check = () => {
    const ok = size === answer.size && quality === answer.quality;
    setState(ok ? "ok" : "bad");
    if (ok) markSolved();
    else setFailures((f) => f + 1);
  };

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          זהו את המרווח הכתוב — גודל ואיכות. שימו לב לאיות: אותו מרחק על המקלדת יכול להיות מרווח
          אחר לגמרי על הנייר. לחיצה על המרווח משמיעה אותו.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
        <div className="wb-prompt-score">
          <Score
            notes={[
              {
                keys: [vexKeyOf(spec.low), vexKeyOf(spec.high)],
                midi: [midiOf(spec.low), midiOf(spec.high)],
              },
            ]}
            clef={spec.clef}
            width={130}
            ariaLabel="המרווח לזיהוי"
          />
        </div>
      </div>
      <Chips
        label="הגודל:"
        options={IV_SIZE_OPTIONS}
        value={size}
        onChange={(v) => {
          setSize(v);
          setState(null);
        }}
        compact
      />
      <Chips
        label="האיכות:"
        options={IV_QUALITY_OPTIONS}
        value={quality}
        onChange={(v) => {
          setQuality(v);
          setState(null);
        }}
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={size === null || quality === null}>
          בדיקה
        </button>
        {failures >= 2 && !reveal && (
          <button className="play-btn ghost" onClick={() => setReveal(true)}>
            הצגת הפתרון
          </button>
        )}
      </div>
      <Feedback
        state={state}
        correct={
          reveal ? (
            <>
              התשובה: <b>{ivNameHe(answer.size, answer.quality)}</b>.
            </>
          ) : undefined
        }
      />
    </div>
  );
}

/* =========================================================================
 * 6. Interval writing: given a note, write the named interval above/below.
 * ========================================================================= */

export type IntervalWriteSpec = {
  clef: Clef;
  base: SpelledPitch;
  size: number;
  quality: IvQuality;
  direction: 1 | -1; // 1 = write above the base, −1 = below
};

export function IntervalWriteItem({
  spec,
  solved,
  markSolved,
}: {
  spec: IntervalWriteSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const expected = applyInterval(spec.base, spec.size, spec.quality, spec.direction);
  const inv = invertIv(spec.size, spec.quality);
  const [notes, setNotes] = useState<(SpelledPitch | null)[]>([null, null]);
  const [status, setStatus] = useState<SlotStatus[] | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);

  const check = () => {
    const p = notes[1];
    if (!p) return;
    const ok = sameSpelling(p, expected) && p.octave === expected.octave;
    setStatus([null, ok ? "ok" : "bad"]);
    setState(ok ? "ok" : "bad");
    if (ok) {
      markSolved();
      void playNote([midiOf(spec.base), midiOf(p)]);
    } else setFailures((f) => f + 1);
  };

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          כתבו <b>{ivNameHe(spec.size, spec.quality)}</b>{" "}
          {spec.direction === 1 ? "מעל הצליל הנתון" : "מתחת לצליל הנתון"} — בתא הריק שלצידו.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
      </div>
      <StaffInput
        clef={spec.clef}
        slots={2}
        value={notes}
        given={[spec.base, null]}
        onChange={(n) => {
          setNotes(n);
          setStatus(null);
          setState(null);
        }}
        status={status}
        ariaLabel="חמשה לכתיבת המרווח"
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={!notes[1]}>
          בדיקה
        </button>
        {failures >= 2 && !reveal && (
          <button className="play-btn ghost" onClick={() => setReveal(true)}>
            הצגת הפתרון
          </button>
        )}
      </div>
      <Feedback
        state={state}
        correct={
          reveal ? (
            <>
              התשובה: <b>{nameHeOf(expected)}</b>.
            </>
          ) : undefined
        }
      />
      {state === "ok" && (
        <div className="wb-solution">
          <div className="wb-solution-label">
            ובהיפוך (חוק ה־9): {ivNameHe(spec.size, spec.quality)} ← <b>{ivNameHe(inv.size, inv.quality)}</b>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
 * 7. Interval inversion: name the inversion of a named interval.
 * ========================================================================= */

export type InversionSpec = { size: number; quality: IvQuality };

export function InversionItem({
  spec,
  solved,
  markSolved,
}: {
  spec: InversionSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const answer = invertIv(spec.size, spec.quality);
  const [size, setSize] = useState<number | null>(null);
  const [quality, setQuality] = useState<IvQuality | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);

  const check = () => {
    const ok = size === answer.size && quality === answer.quality;
    setState(ok ? "ok" : "bad");
    if (ok) markSolved();
    else setFailures((f) => f + 1);
  };

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          מה היפוכה של <b>{ivNameHe(spec.size, spec.quality)}</b>?
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
      </div>
      <Chips
        label="הגודל:"
        options={IV_SIZE_OPTIONS.slice(0, 8)}
        value={size}
        onChange={(v) => {
          setSize(v);
          setState(null);
        }}
        compact
      />
      <Chips
        label="האיכות:"
        options={IV_QUALITY_OPTIONS}
        value={quality}
        onChange={(v) => {
          setQuality(v);
          setState(null);
        }}
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={size === null || quality === null}>
          בדיקה
        </button>
        {failures >= 2 && !reveal && (
          <button className="play-btn ghost" onClick={() => setReveal(true)}>
            הצגת הפתרון
          </button>
        )}
      </div>
      <Feedback
        state={state}
        correct={
          reveal ? (
            <>
              התשובה: <b>{ivNameHe(answer.size, answer.quality)}</b>.
            </>
          ) : undefined
        }
      />
    </div>
  );
}

/* =========================================================================
 * 8. Transposition: rewrite a short melody in a new key.
 * ========================================================================= */

export type TransposeSpec = {
  clef: Clef;
  sourceKeyHe: string; // major keys
  targetKeyHe: string;
  melody: SpelledPitch[]; // diatonic in the source key
  size: number;           // the transposing interval...
  quality: IvQuality;
  direction: 1 | -1;      // ...and its direction
};

export function TransposeItem({
  spec,
  solved,
  markSolved,
}: {
  spec: TransposeSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const sourceKey = findKey(spec.sourceKeyHe, "major");
  const expected = useMemo(
    () => spec.melody.map((p) => applyInterval(p, spec.size, spec.quality, spec.direction)),
    [spec]
  );
  const n = spec.melody.length;
  const [notes, setNotes] = useState<(SpelledPitch | null)[]>(Array(n).fill(null));
  const [status, setStatus] = useState<SlotStatus[] | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);
  const player = usePlayer();

  const given = useMemo(() => [expected[0], ...Array(n - 1).fill(null)] as (SpelledPitch | null)[], [expected, n]);
  const merged = notes.map((p, i) => given[i] ?? p);
  const allFilled = merged.every(Boolean);

  const check = () => {
    const st: SlotStatus[] = merged.map((p, i) =>
      given[i] ? null : p && sameSpelling(p, expected[i]) && p.octave === expected[i].octave ? "ok" : "bad"
    );
    setStatus(st);
    const ok = st.every((s) => s !== "bad");
    setState(ok ? "ok" : "bad");
    if (ok) {
      markSolved();
      void player.play(
        expected.map((p, i) => ({ midi: midiOf(p), time: i * 0.5, dur: 0.55, idx: i })),
        120
      );
    } else setFailures((f) => f + 1);
  };

  const sourceNotes: ScoreNote[] = spec.melody.map((p) => ({
    keys: [vexKeyOf(p)],
    midi: [midiOf(p)],
  }));
  const solutionNotes: ScoreNote[] = expected.map((p) => ({ keys: [vexKeyOf(p)], midi: [midiOf(p)] }));

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          לפניכם מנגינה קצרה ב<b>{sourceKey.nameHe}</b>. העבירו אותה ל<b>
            {findKey(spec.targetKeyHe, "major").nameHe}
          </b>{" "}
          ({ivNameHe(spec.size, spec.quality)} {spec.direction === 1 ? "מעלה" : "מטה"}). הצליל הראשון
          כבר נתון; בלי סימן היתק בחמשה — כתבו כל היתק ליד התו.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
      </div>
      <div className="wb-prompt-score wb-source-melody">
        <Score
          notes={sourceNotes}
          clef={spec.clef}
          keySig={sourceKey.vex}
          ariaLabel="המנגינה המקורית"
        />
      </div>
      <StaffInput
        clef={spec.clef}
        slots={n}
        value={notes}
        given={given}
        onChange={(next) => {
          setNotes(next);
          setStatus(null);
          setState(null);
        }}
        status={status}
        highlight={player.index}
        ariaLabel="חמשה לכתיבת המנגינה בסולם החדש"
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={!allFilled}>
          בדיקה
        </button>
        <PlayButton
          ghost
          label="השמעת המקור"
          player={player}
          events={spec.melody.map((p, i) => ({ midi: midiOf(p), time: i * 0.5, dur: 0.55 }))}
          bpm={120}
        />
        {failures >= 2 && !reveal && (
          <button className="play-btn ghost" onClick={() => setReveal(true)}>
            הצגת הפתרון
          </button>
        )}
      </div>
      <Feedback state={state} />
      {reveal && (
        <div className="wb-solution">
          <div className="wb-solution-label">הפתרון:</div>
          <Score notes={solutionNotes} clef={spec.clef} ariaLabel="המנגינה בסולם החדש" />
        </div>
      )}
    </div>
  );
}

/* ---------- shared shell for a unit's workbook page ---------- */

export function WorkbookHero({
  unitNum,
  unitId,
  title,
  lede,
}: {
  unitNum: number;
  unitId: string;
  title: string;
  lede: ReactNode;
}) {
  return (
    <div className="lesson-hero">
      <div className="unit-label">ספר עבודה · יחידה {unitNum}</div>
      <h1>{title}</h1>
      <p className="lede">{lede}</p>
      <a className="wb-back" href={`#/unit/${unitId}`}>
        → חזרה ליחידה {unitNum}
      </a>
    </div>
  );
}
