import { ReactNode, useMemo, useState } from "react";
import { playNote } from "../engine/audio";
import { Score } from "../components/Score";
import { Fig } from "../components/ui";
import { Chips, Feedback } from "./exercise";
import { Clef } from "./items";
import {
  SpelledPitch,
  keyOf,
  midiOf,
  nameHeOf,
  sameSpelling,
  vexKeyOf,
} from "./pitch";
import { SlotStatus, StaffInput } from "./StaffInput";

/* =========================================================================
 * 1. Chord building: fill the empty slots so the stack matches the spec.
 *    Notes are entered left-to-right, lowest first (an "arpeggiated" chord);
 *    a correct answer plays back as a block chord.
 * ========================================================================= */

export function ChordBuildItem({
  clef,
  expected,
  givenIndex,
  prompt,
  solutionLabel,
  solved,
  markSolved,
}: {
  clef: Clef;
  expected: SpelledPitch[];
  givenIndex: number | null; // which chord member is given/locked (null = none)
  prompt: ReactNode;
  solutionLabel: string;
  solved: boolean;
  markSolved: () => void;
}) {
  const n = expected.length;
  const given = useMemo(
    () => expected.map((p, i) => (i === givenIndex ? p : null)),
    [expected, givenIndex]
  );
  const [notes, setNotes] = useState<(SpelledPitch | null)[]>(Array(n).fill(null));
  const [status, setStatus] = useState<SlotStatus[] | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);

  const merged = notes.map((p, i) => given[i] ?? p);
  const allFilled = merged.every(Boolean);

  const check = () => {
    const st: SlotStatus[] = merged.map((p, i) =>
      given[i]
        ? null
        : p && sameSpelling(p, expected[i]) && p.octave === expected[i].octave
          ? "ok"
          : "bad"
    );
    setStatus(st);
    const ok = st.every((s) => s !== "bad");
    setState(ok ? "ok" : "bad");
    if (ok) {
      markSolved();
      void playNote(expected.map(midiOf), 1.6);
    } else setFailures((f) => f + 1);
  };

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          {prompt}
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
      </div>
      <StaffInput
        clef={clef}
        slots={n}
        value={notes}
        given={given}
        onChange={(next) => {
          setNotes(next);
          setStatus(null);
          setState(null);
        }}
        status={status}
        ariaLabel="חמשה לבניית האקורד"
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={!allFilled}>
          בדיקה
        </button>
        {failures >= 2 && !reveal && (
          <button className="play-btn ghost" onClick={() => setReveal(true)}>
            הצגת הפתרון
          </button>
        )}
      </div>
      <Feedback state={state} />
      {reveal && (
        <div className="wb-solution">
          <div className="wb-solution-label">הפתרון — {solutionLabel}:</div>
          <Score
            notes={[{ keys: expected.map(vexKeyOf), midi: expected.map(midiOf) }]}
            clef={clef}
            width={130}
            ariaLabel="האקורד הפתור"
          />
        </div>
      )}
    </div>
  );
}

/* =========================================================================
 * 2. Chord identification: root, quality, and inversion figure.
 * ========================================================================= */

export function ChordIdItem({
  clef,
  pitches,
  rootName,
  qualityOptions,
  qualityAnswer,
  figureOptions,
  figureAnswer,
  solved,
  markSolved,
}: {
  clef: Clef;
  pitches: SpelledPitch[]; // as stacked, bass first
  rootName: string;        // Hebrew name of the root
  qualityOptions: { value: string; label: string }[];
  qualityAnswer: string;
  figureOptions: string[]; // "5/3" | "6" | "6/4" | "7" | "6/5" | "4/3" | "4/2"
  figureAnswer: string;
  solved: boolean;
  markSolved: () => void;
}) {
  const rootOptions = useMemo(
    () => pitches.map((p) => ({ value: nameHeOf(p), label: nameHeOf(p) })),
    [pitches]
  );
  const [root, setRoot] = useState<string | null>(null);
  const [quality, setQuality] = useState<string | null>(null);
  const [figure, setFigure] = useState<string | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);

  const check = () => {
    const ok = root === rootName && quality === qualityAnswer && figure === figureAnswer;
    setState(ok ? "ok" : "bad");
    if (ok) markSolved();
    else setFailures((f) => f + 1);
  };

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          זהו את האקורד: מי היסוד, מה האיכות, ובאיזה מצב (היפוך) הוא כתוב. לחיצה על האקורד משמיעה
          אותו.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
        <div className="wb-prompt-score">
          <Score
            notes={[{ keys: pitches.map(vexKeyOf), midi: pitches.map(midiOf) }]}
            clef={clef}
            width={130}
            ariaLabel="האקורד לזיהוי"
          />
        </div>
      </div>
      <Chips label="היסוד:" options={rootOptions} value={root} onChange={(v) => { setRoot(v); setState(null); }} />
      <Chips label="האיכות:" options={qualityOptions} value={quality} onChange={(v) => { setQuality(v); setState(null); }} />
      <Chips
        label="המצב:"
        options={figureOptions.map((f) => ({ value: f, label: <Fig n={f} /> }))}
        value={figure}
        onChange={(v) => {
          setFigure(v);
          setState(null);
        }}
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={!root || !quality || !figure}>
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
              התשובה: יסוד <b>{rootName}</b>,{" "}
              <b>{qualityOptions.find((q) => q.value === qualityAnswer)?.label}</b>, מצב{" "}
              <b><Fig n={figureAnswer} /></b>.
            </>
          ) : undefined
        }
      />
    </div>
  );
}

/* =========================================================================
 * 3. The key behind the chord: V7 → its major key; vii°7 → its minor key.
 * ========================================================================= */

export function KeyFromChordItem({
  clef,
  pitches,
  mode,
  answerSharps,
  prompt,
  solved,
  markSolved,
}: {
  clef: Clef;
  pitches: SpelledPitch[];
  mode: "major" | "minor";
  answerSharps: number;
  prompt: ReactNode;
  solved: boolean;
  markSolved: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);

  const keyOptions = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => i - 7).map((s) => ({
        value: s,
        label: nameHeOf(keyOf(s, mode).tonic),
      })),
    [mode]
  );

  const check = () => {
    const ok = picked === answerSharps;
    setState(ok ? "ok" : "bad");
    if (ok) markSolved();
    else setFailures((f) => f + 1);
  };

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          {prompt}
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
        <div className="wb-prompt-score">
          <Score
            notes={[{ keys: pitches.map(vexKeyOf), midi: pitches.map(midiOf) }]}
            clef={clef}
            width={130}
            ariaLabel="האקורד"
          />
        </div>
      </div>
      <Chips
        label="הסולם:"
        options={keyOptions}
        value={picked}
        onChange={(v) => {
          setPicked(v);
          setState(null);
        }}
        compact
      />
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
        correct={reveal ? <>התשובה: <b>{keyOf(answerSharps, mode).nameHe}</b>.</> : undefined}
      />
    </div>
  );
}
