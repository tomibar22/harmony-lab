import { ReactNode, useMemo, useState } from "react";
import { Satb, SatbScores, chordSeq } from "../components/Satb";
import { Fig, PlayButton, usePlayer } from "../components/ui";
import {
  ExpectedChord,
  SatbChord,
  VOICE_HE,
  VoiceName,
  Violation,
  checkChordContent,
  checkRanges,
  checkSpacingOrder,
} from "../engine/voiceLeading";
import { ErrorHuntOption, collectViolations, deriveAnswer } from "./errorHunt";
import { Chips, Feedback } from "./exercise";
import { SatbInput, SatbValue } from "./SatbInput";
import {
  SpelledPitch,
  midiOf,
  nameHeOf,
  vexKeyOf,
} from "./pitch";

/* ---------- helpers ---------- */

export const toSatbDisplay = (c: SatbChord): Satb => ({
  s: [vexKeyOf(c.s), midiOf(c.s)],
  a: [vexKeyOf(c.a), midiOf(c.a)],
  t: [vexKeyOf(c.t), midiOf(c.t)],
  b: [vexKeyOf(c.b), midiOf(c.b)],
});

/** Build an SATB voicing from chord tones: each voice = (member index, octave). */
export function voicing(
  tones: SpelledPitch[],
  plan: Record<VoiceName, [member: number, octave: number]>
): SatbChord {
  const mk = ([member, octave]: [number, number]): SpelledPitch => ({
    ...tones[member],
    octave,
  });
  return { s: mk(plan.s), a: mk(plan.a), t: mk(plan.t), b: mk(plan.b) };
}

const chromaOf = (p: SpelledPitch) => ((midiOf(p) % 12) + 12) % 12;

/* =========================================================================
 * 1. Identify a four-voice chord: root, quality, figure.
 * ========================================================================= */

export function SatbIdItem({
  chord,
  rootName,
  qualityOptions,
  qualityAnswer,
  figureOptions,
  figureAnswer,
  keySig,
  extraPrompt,
  solved,
  markSolved,
}: {
  chord: SatbChord;
  rootName: string;
  qualityOptions: { value: string; label: string }[];
  qualityAnswer: string;
  figureOptions: string[];
  figureAnswer: string;
  keySig?: string;
  extraPrompt?: ReactNode;
  solved: boolean;
  markSolved: () => void;
}) {
  const tones = useMemo(() => {
    const seen = new Set<number>();
    const out: SpelledPitch[] = [];
    (["b", "t", "a", "s"] as VoiceName[]).forEach((v) => {
      const c = chromaOf(chord[v]);
      if (!seen.has(c)) {
        seen.add(c);
        out.push(chord[v]);
      }
    });
    return out;
  }, [chord]);

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
          {extraPrompt ?? (
            <>האקורד כתוב בארבעה קולות על חמשה כפולה. זהו יסוד, איכות ומצב. לחיצה על האקורד משמיעה אותו.</>
          )}
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
        <div className="wb-prompt-score">
          <SatbScores chords={[toSatbDisplay(chord)]} highlight={null} label="האקורד לזיהוי" width={190} keySig={keySig} />
        </div>
      </div>
      <Chips
        label="היסוד:"
        options={tones.map((p) => ({ value: nameHeOf(p), label: nameHeOf(p) }))}
        value={root}
        onChange={(v) => {
          setRoot(v);
          setState(null);
        }}
      />
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
 * 2. Roman numeral + figure from a key signature.
 * ========================================================================= */

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

export function SatbRnItem({
  chord,
  keySig,
  keyNameHe,
  numeralAnswer,
  figureAnswer,
  figureOptions,
  solved,
  markSolved,
}: {
  chord: SatbChord;
  keySig: string;
  keyNameHe: string;
  numeralAnswer: string;
  figureAnswer: string;
  figureOptions: string[];
  solved: boolean;
  markSolved: () => void;
}) {
  const [numeral, setNumeral] = useState<string | null>(null);
  const [figure, setFigure] = useState<string | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);

  const check = () => {
    const ok = numeral === numeralAnswer && figure === figureAnswer;
    setState(ok ? "ok" : "bad");
    if (ok) markSolved();
    else setFailures((f) => f + 1);
  };

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          הסולם: <b>{keyNameHe}</b> (לפי סימן ההיתק). קבעו את הספרה הרומית של האקורד ואת הספרור שלו.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
        <div className="wb-prompt-score">
          <SatbScores chords={[toSatbDisplay(chord)]} highlight={null} label="האקורד" width={210} keySig={keySig} />
        </div>
      </div>
      <Chips
        label="הדרגה:"
        options={NUMERALS.map((n) => ({ value: n, label: <span dir="ltr">{n}</span> }))}
        value={numeral}
        onChange={(v) => {
          setNumeral(v);
          setState(null);
        }}
      />
      <Chips
        label="הספרור:"
        options={figureOptions.map((f) => ({ value: f, label: <Fig n={f} /> }))}
        value={figure}
        onChange={(v) => {
          setFigure(v);
          setState(null);
        }}
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={!numeral || !figure}>
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
              התשובה: <b><span dir="ltr">{numeralAnswer}</span></b> במצב <b><Fig n={figureAnswer} /></b>.
            </>
          ) : undefined
        }
      />
    </div>
  );
}

/* =========================================================================
 * 3. Build a four-voice chord to spec: any correct voicing is accepted.
 * ========================================================================= */

export type SatbBuildSpec = {
  expected: ExpectedChord;
  spacing?: "close" | "open"; // close: S–T within an octave; open: wider
  prompt: ReactNode;
  solutionChord: SatbChord;   // one model answer (of many)
  solutionLabel: string;
};

const EMPTY_SATB: SatbValue = { s: null, a: null, t: null, b: null };

export function SatbBuildItem({
  spec,
  solved,
  markSolved,
}: {
  spec: SatbBuildSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const [chord, setChord] = useState<SatbValue>(EMPTY_SATB);
  const [violations, setViolations] = useState<Violation[] | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);
  const player = usePlayer();

  const allFilled = (["s", "a", "t", "b"] as VoiceName[]).every((v) => chord[v]);

  const check = () => {
    const c = chord as SatbChord;
    const found: Violation[] = [
      ...checkRanges(c),
      ...checkSpacingOrder(c),
      ...checkChordContent(c, spec.expected),
    ];
    if (spec.spacing) {
      const span = midiOf(c.s) - midiOf(c.t);
      if (spec.spacing === "close" && span > 12)
        found.push({
          rule: "spacing",
          severity: "error",
          chordIndex: 0,
          voices: ["s", "t"],
          message: "נדרשה פריסה צפופה: שלושת הקולות העליונים בתוך אוקטבה",
        });
      if (spec.spacing === "open" && span <= 12)
        found.push({
          rule: "spacing",
          severity: "error",
          chordIndex: 0,
          voices: ["s", "t"],
          message: "נדרשה פריסה פתוחה: יותר מאוקטבה בין הסופרן לטנור",
        });
    }
    setViolations(found);
    const ok = found.length === 0;
    setState(ok ? "ok" : "bad");
    if (ok) {
      markSolved();
      void player.play(chordSeq([toSatbDisplay(c)], 2), 60);
    } else setFailures((f) => f + 1);
  };

  const badVoices = new Set(violations?.flatMap((v) => v.voices) ?? []);
  const status = violations
    ? Object.fromEntries(
        (["s", "a", "t", "b"] as VoiceName[]).map((v) => [v, badVoices.has(v) ? "bad" : "ok"])
      )
    : null;

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          {spec.prompt}
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
      </div>
      <SatbInput
        value={chord}
        onChange={(next) => {
          setChord(next);
          setViolations(null);
          setState(null);
        }}
        status={status as never}
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={!allFilled}>
          בדיקה
        </button>
        {failures >= 2 && !reveal && (
          <button className="play-btn ghost" onClick={() => setReveal(true)}>
            הצגת פתרון לדוגמה
          </button>
        )}
      </div>
      {state === "ok" ? (
        <Feedback state="ok" />
      ) : violations && violations.length > 0 ? (
        <ul className="wb-violations" aria-live="polite">
          {violations.map((v, i) => (
            <li key={i} className={v.severity === "error" ? "err" : "warn"}>
              {v.message}
              {v.voices.length > 0 && v.voices.length < 4 && (
                <span className="wb-violation-voices"> ({v.voices.map((x) => VOICE_HE[x]).join(", ")})</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Feedback state={null} />
      )}
      {reveal && (
        <div className="wb-solution">
          <div className="wb-solution-label">פתרון לדוגמה — {spec.solutionLabel} (יש עוד פתרונות כשרים):</div>
          <SatbScores chords={[toSatbDisplay(spec.solutionChord)]} highlight={null} label="פתרון לדוגמה" width={190} />
        </div>
      )}
    </div>
  );
}

/* =========================================================================
 * 4. Error hunt in a single chord (construction) or a pair (voice leading).
 *    The correct answer is derived from the rule engine itself.
 * ========================================================================= */

export type { ErrorHuntOption };

export function ErrorHuntItem({
  chords,
  expected,
  options,
  noneValue,
  prompt,
  playPair,
  solved,
  markSolved,
}: {
  chords: SatbChord[];               // one chord (construction) or two (voice leading)
  expected?: ExpectedChord | null;   // content spec for construction items
  options: ErrorHuntOption[];        // incl. the "no error" option (rules: [])
  noneValue: string;
  prompt: ReactNode;
  playPair?: boolean;
  solved: boolean;
  markSolved: () => void;
}) {
  const found = useMemo(() => collectViolations(chords, expected), [chords, expected]);
  const answer = useMemo(() => deriveAnswer(found, options, noneValue), [found, options, noneValue]);

  const [picked, setPicked] = useState<string | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);
  const player = usePlayer();

  const check = () => {
    const ok = picked === answer;
    setState(ok ? "ok" : "bad");
    if (ok) markSolved();
    else setFailures((f) => f + 1);
  };

  const explain = found.length
    ? found.map((v) => v.message).join("; ")
    : "האקורדים תקינים לחלוטין.";

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          {prompt}
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
        <div className="wb-prompt-score">
          <SatbScores
            chords={chords.map(toSatbDisplay)}
            highlight={player.index}
            label="הדוגמה לבחינה"
            width={chords.length === 1 ? 190 : 250}
          />
        </div>
      </div>
      {playPair && (
        <div className="wb-actions">
          <PlayButton ghost label="השמעה" player={player} events={chordSeq(chords.map(toSatbDisplay), 1.6)} bpm={80} />
        </div>
      )}
      <Chips
        label="האבחנה:"
        options={options.map((o) => ({ value: o.value, label: o.label }))}
        value={picked}
        onChange={(v) => {
          setPicked(v);
          setState(null);
        }}
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={!picked}>
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
              התשובה: <b>{options.find((o) => o.value === answer)?.label}</b>.
            </>
          ) : undefined
        }
      />
      {state === "ok" && (
        <div className="wb-solution">
          <div className="wb-solution-label">{explain}</div>
        </div>
      )}
    </div>
  );
}
