import { ReactNode, useMemo, useState } from "react";
import { Score, ScoreNote } from "../components/Score";
import { Deg, PlayButton, usePlayer } from "../components/ui";
import { Chips, Feedback } from "./exercise";
import {
  DEGREE_NAMES_ALL,
  MinorForm,
  Mode,
  SpelledPitch,
  degreeNameHe,
  degreePitch,
  findKey,
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
