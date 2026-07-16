import { useMemo, useState } from "react";
import { Score, ScoreNote } from "../components/Score";
import { PlayButton, usePlayer } from "../components/ui";
import { SeqEvent } from "../engine/audio";
import { Chips, Feedback } from "./exercise";

/* Rhythm exercises. All positions/durations are integer ticks, PPQ = 960. */

export const PPQ = 960;

export type Meter = [number, number]; // e.g. [3, 4], [6, 8]

export const barTicks = ([num, den]: Meter) => num * ((PPQ * 4) / den);
export const meterLabel = ([num, den]: Meter) => `${num}/${den}`;

/** Note-value catalogue: ticks ↔ VexFlow duration + display glyph. */
export type DurSpec = { ticks: number; vex: string; dots: number; glyph: string };
export const DURS: DurSpec[] = [
  { ticks: 3840, vex: "w", dots: 0, glyph: "𝅝" },
  { ticks: 2880, vex: "h", dots: 1, glyph: "𝅗𝅥." },
  { ticks: 1920, vex: "h", dots: 0, glyph: "𝅗𝅥" },
  { ticks: 1440, vex: "q", dots: 1, glyph: "♩." },
  { ticks: 960, vex: "q", dots: 0, glyph: "♩" },
  { ticks: 720, vex: "8", dots: 1, glyph: "♪." },
  { ticks: 480, vex: "8", dots: 0, glyph: "♪" },
  { ticks: 240, vex: "16", dots: 0, glyph: "𝅘𝅥𝅯" },
];
export const durOf = (ticks: number): DurSpec => {
  const d = DURS.find((x) => x.ticks === ticks);
  if (!d) throw new Error(`no duration for ${ticks} ticks`);
  return d;
};

/** A rhythm engraved on the middle line (like percussion notation). */
const RHYTHM_KEY = "b/4";
const RHYTHM_MIDI = 71;

export function rhythmScoreNotes(
  ticksList: number[],
  opts?: { barEvery?: number; ties?: Set<number> }
): ScoreNote[] {
  const out: ScoreNote[] = [];
  let pos = 0;
  ticksList.forEach((t, i) => {
    if (opts?.barEvery && pos > 0 && pos % opts.barEvery === 0) out.push({ bar: true, keys: [], midi: [] });
    const d = durOf(t);
    out.push({
      keys: [RHYTHM_KEY],
      midi: [RHYTHM_MIDI],
      duration: d.vex,
      dots: d.dots,
      tie: opts?.ties?.has(i) || undefined,
    });
    pos += t;
  });
  return out;
}

/** Sequence: the rhythm itself, plus a metronome layer marking the meter. */
export function rhythmSeq(
  ticksList: number[],
  meter: Meter,
  opts?: { ties?: Set<number>; clicks?: boolean }
): SeqEvent[] {
  const events: SeqEvent[] = [];
  let pos = 0;
  ticksList.forEach((t, i) => {
    // a tied note extends the previous attack - no new event
    const tiedFromPrev = opts?.ties?.has(i - 1);
    if (!tiedFromPrev) {
      let dur = t;
      let j = i;
      while (opts?.ties?.has(j)) {
        dur += ticksList[j + 1];
        j++;
      }
      events.push({ midi: RHYTHM_MIDI, time: pos / PPQ, dur: dur / PPQ, idx: i, vel: 0.85 });
    }
    pos += t;
  });
  if (opts?.clicks !== false) {
    const total = pos;
    const beat = meter[1] === 8 ? PPQ * 1.5 : PPQ; // compound meters click the dotted quarter
    const bar = barTicks(meter);
    for (let p = 0; p < total; p += beat) {
      events.push({ midi: 0, time: p / PPQ, dur: 0.05, perc: true, vel: p % bar === 0 ? 0.95 : 0.35 });
    }
  }
  return events;
}

/* =========================================================================
 * 1. Meter identification: hear the accents, read the values, pick the meter.
 * ========================================================================= */

export type MeterIdSpec = { meter: Meter; durations: number[] };

const METER_OPTIONS = (["2/4", "3/4", "4/4", "6/8"] as const).map((m) => ({ value: m, label: m }));

export function MeterIdItem({
  spec,
  solved,
  markSolved,
}: {
  spec: MeterIdSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);
  const player = usePlayer();

  const answer = meterLabel(spec.meter);
  const notes = useMemo(() => rhythmScoreNotes(spec.durations), [spec]);
  const seq = useMemo(() => rhythmSeq(spec.durations, spec.meter), [spec]);

  const check = () => {
    const ok = picked === answer;
    setState(ok ? "ok" : "bad");
    if (ok) markSolved();
    else setFailures((f) => f + 1);
  };

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          המקצב כתוב בלי משקל ובלי קווי תיבה. האזינו — המטרונום מסמן את הפעמות והפעמה החזקה מודגשת —
          וקבעו את המשקל.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
      </div>
      <div className="wb-prompt-score">
        <Score notes={notes} clickable={false} ariaLabel="המקצב לזיהוי" />
      </div>
      <div className="wb-actions">
        <PlayButton label="השמעה" player={player} events={seq} bpm={92} />
      </div>
      <Chips label="המשקל:" options={[...METER_OPTIONS]} value={picked} onChange={(v) => { setPicked(v); setState(null); }} />
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
      <Feedback state={state} correct={reveal ? <>התשובה: <b>{answer}</b>.</> : undefined} />
    </div>
  );
}

/* =========================================================================
 * 2. Complete the bar: pick the value that fills what's missing.
 * ========================================================================= */

export type FillBarSpec = { meter: Meter; given: number[]; options: number[] };

export function FillBarItem({
  spec,
  solved,
  markSolved,
}: {
  spec: FillBarSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const answer = barTicks(spec.meter) - spec.given.reduce((a, b) => a + b, 0);
  const [picked, setPicked] = useState<number | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);
  const player = usePlayer();

  const displayed = state === "ok" || picked !== null ? [...spec.given, picked ?? answer] : spec.given;
  const notes = useMemo(() => rhythmScoreNotes(displayed), [displayed.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const check = () => {
    const ok = picked === answer;
    setState(ok ? "ok" : "bad");
    if (ok) {
      markSolved();
      void player.play(rhythmSeq([...spec.given, answer], spec.meter), 92);
    } else setFailures((f) => f + 1);
  };

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          תיבה אחת במשקל <b dir="ltr">{meterLabel(spec.meter)}</b>, והערך האחרון חסר. בחרו את ערך
          המשך שמשלים אותה בדיוק.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
      </div>
      <div className="wb-prompt-score">
        <Score
          notes={notes}
          timeSig={meterLabel(spec.meter)}
          highlightIndex={player.index}
          clickable={false}
          ariaLabel="התיבה להשלמה"
        />
      </div>
      <Chips
        label="הערך החסר:"
        options={spec.options.map((t) => ({ value: t, label: <span dir="ltr">{durOf(t).glyph}</span> }))}
        value={picked}
        onChange={(v) => {
          setPicked(v);
          setState(null);
        }}
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
        correct={reveal ? <>התשובה: <b dir="ltr">{durOf(answer).glyph}</b>.</> : undefined}
      />
    </div>
  );
}

/* =========================================================================
 * 3. Place the barlines in a continuous stream of values.
 * ========================================================================= */

export type BarlineSpec = { meter: Meter; durations: number[] };

export function BarlineItem({
  spec,
  solved,
  markSolved,
}: {
  spec: BarlineSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const n = spec.durations.length;
  const [chosen, setChosen] = useState<Set<number>>(new Set()); // gap i = after note i
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);
  const player = usePlayer();

  const bar = barTicks(spec.meter);
  const correct = useMemo(() => {
    const s = new Set<number>();
    let pos = 0;
    spec.durations.forEach((t, i) => {
      pos += t;
      if (i < n - 1 && pos % bar === 0) s.add(i);
    });
    return s;
  }, [spec, bar, n]);

  const notes = useMemo(() => {
    const out: ScoreNote[] = [];
    spec.durations.forEach((t, i) => {
      const d = durOf(t);
      out.push({ keys: [RHYTHM_KEY], midi: [RHYTHM_MIDI], duration: d.vex, dots: d.dots });
      if (chosen.has(i) && i < n - 1) out.push({ bar: true, keys: [], midi: [] });
    });
    return out;
  }, [spec, chosen, n]);

  const toggle = (i: number) => {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
    setState(null);
  };

  const check = () => {
    const ok = chosen.size === correct.size && [...correct].every((i) => chosen.has(i));
    setState(ok ? "ok" : "bad");
    if (ok) {
      markSolved();
      void player.play(rhythmSeq(spec.durations, spec.meter), 92);
    } else setFailures((f) => f + 1);
  };

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          רצף ערכי משך במשקל <b dir="ltr">{meterLabel(spec.meter)}</b>, בלי קווי תיבה. סמנו אחרי אילו
          צלילים עובר קו תיבה (הרצף מתחיל על פעמה ראשונה). הקווים מצטיירים בתווים תוך כדי סימון.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
      </div>
      <div className="wb-prompt-score">
        <Score
          notes={notes}
          timeSig={meterLabel(spec.meter)}
          clickable={false}
          ariaLabel="הרצף להצבת קווי תיבה"
        />
      </div>
      <div className="wb-gaps" dir="ltr" role="group" aria-label="מיקומי קו תיבה">
        {spec.durations.map((t, i) =>
          i < n - 1 ? (
            <button
              key={i}
              className={"wb-gap" + (chosen.has(i) ? " on" : "")}
              onClick={() => toggle(i)}
              title={`קו תיבה אחרי צליל ${i + 1}`}
            >
              <span className="wb-gap-note">{durOf(t).glyph}</span>
              <span className="wb-gap-bar">{chosen.has(i) ? "𝄀" : "·"}</span>
            </button>
          ) : (
            <span key={i} className="wb-gap last">
              <span className="wb-gap-note">{durOf(t).glyph}</span>
            </span>
          )
        )}
      </div>
      <div className="wb-actions">
        <button className="play-btn" onClick={check}>
          בדיקה
        </button>
        <PlayButton ghost label="השמעה" player={player} events={rhythmSeq(spec.durations, spec.meter)} bpm={92} />
        {failures >= 2 && !reveal && (
          <button
            className="play-btn ghost"
            onClick={() => {
              setReveal(true);
              setChosen(new Set(correct));
              setState(null);
            }}
          >
            הצגת הפתרון
          </button>
        )}
      </div>
      <Feedback state={state} />
    </div>
  );
}

/* =========================================================================
 * 4. Rhythmic-metric conflicts: syncopation / hemiola / none.
 * ========================================================================= */

export type ConflictKind = "sync" | "hemiola" | "none";

export const CONFLICT_OPTIONS: { value: ConflictKind; label: string }[] = [
  { value: "sync", label: "סינקופה" },
  { value: "hemiola", label: "המיולה" },
  { value: "none", label: "אין קונפליקט" },
];

export type ConflictSpec = {
  meter: Meter;
  durations: number[];
  ties?: number[]; // indices tied to the following note
  answer: ConflictKind;
  explain: string;
};

export function ConflictItem({
  spec,
  solved,
  markSolved,
}: {
  spec: ConflictSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const ties = useMemo(() => new Set(spec.ties ?? []), [spec]);
  const [picked, setPicked] = useState<ConflictKind | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);
  const player = usePlayer();

  const notes = useMemo(
    () => rhythmScoreNotes(spec.durations, { barEvery: barTicks(spec.meter), ties }),
    [spec, ties]
  );
  const seq = useMemo(() => rhythmSeq(spec.durations, spec.meter, { ties }), [spec, ties]);

  const check = () => {
    const ok = picked === spec.answer;
    setState(ok ? "ok" : "bad");
    if (ok) markSolved();
    else setFailures((f) => f + 1);
  };

  const answerLabel = CONFLICT_OPTIONS.find((o) => o.value === spec.answer)!.label;

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          האזינו למקצב מול המטרונום (הפעמה החזקה מודגשת) וקבעו: האם יש כאן סינקופה, המיולה — או שהמקצב
          יושב על המשקל בשלום?
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
      </div>
      <div className="wb-prompt-score">
        <Score
          notes={notes}
          timeSig={meterLabel(spec.meter)}
          highlightIndex={player.index}
          clickable={false}
          ariaLabel="המקצב לבחינה"
        />
      </div>
      <div className="wb-actions">
        <PlayButton label="השמעה" player={player} events={seq} bpm={88} />
      </div>
      <Chips label="ההכרעה:" options={CONFLICT_OPTIONS} value={picked} onChange={(v) => { setPicked(v); setState(null); }} />
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
      <Feedback state={state} correct={reveal ? <>התשובה: <b>{answerLabel}</b>.</> : undefined} />
      {state === "ok" && (
        <div className="wb-solution">
          <div className="wb-solution-label">{spec.explain}</div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
 * 5. Phrase groups: how long is the first phrase, and does the second echo it?
 * ========================================================================= */

export type PhraseSpec = {
  title: string;          // e.g. 'בטהובן - "הימנון השמחה"'
  keySig?: string;
  meter: Meter;
  lines: ScoreNote[][];   // engraved lines (with bar entries)
  seq: SeqEvent[];
  phrase1Len: number;     // in bars
  lenOptions: number[];
  startsSame: boolean;    // does phrase 2 open like phrase 1?
};

export function PhraseItem({
  spec,
  solved,
  markSolved,
}: {
  spec: PhraseSpec;
  solved: boolean;
  markSolved: () => void;
}) {
  const [len, setLen] = useState<number | null>(null);
  const [same, setSame] = useState<string | null>(null);
  const [state, setState] = useState<"ok" | "bad" | null>(null);
  const [failures, setFailures] = useState(0);
  const [reveal, setReveal] = useState(false);
  const player = usePlayer();

  const check = () => {
    const ok = len === spec.phrase1Len && same === (spec.startsSame ? "yes" : "no");
    setState(ok ? "ok" : "bad");
    if (ok) markSolved();
    else setFailures((f) => f + 1);
  };

  return (
    <div>
      <div className="wb-prompt">
        <div className="wb-prompt-text">
          <b>{spec.title}</b>. האזינו וקראו: היכן נגמרת הפראזה הראשונה? חפשו נקודת מנוחה — צליל ארוך,
          קדנצה — ותבניות שחוזרות. שימו לב: פראזות אינן תמיד בנות 4 או 8 תיבות.
          {solved && <span className="wb-solvedmark"> ✓ נפתר</span>}
        </div>
      </div>
      <div className="wb-phrase-lines">
        {spec.lines.map((line, i) => (
          <Score
            key={i}
            notes={line}
            keySig={spec.keySig}
            timeSig={i === 0 ? meterLabel(spec.meter) : undefined}
            clickable={false}
            ariaLabel={`שורה ${i + 1}`}
          />
        ))}
      </div>
      <div className="wb-actions">
        <PlayButton label="השמעה" player={player} events={spec.seq} bpm={100} />
      </div>
      <Chips
        label="אורך הפראזה הראשונה (בתיבות):"
        options={spec.lenOptions.map((v) => ({ value: v, label: String(v) }))}
        value={len}
        onChange={(v) => {
          setLen(v);
          setState(null);
        }}
      />
      <Chips
        label="האם הפראזה השנייה נפתחת כמו הראשונה?"
        options={[
          { value: "yes", label: "כן" },
          { value: "no", label: "לא" },
        ]}
        value={same}
        onChange={(v) => {
          setSame(v);
          setState(null);
        }}
      />
      <div className="wb-actions">
        <button className="play-btn" onClick={check} disabled={len === null || same === null}>
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
              התשובה: <b>{spec.phrase1Len} תיבות</b>, והפראזה השנייה{" "}
              <b>{spec.startsSame ? "אכן נפתחת כמו הראשונה" : "נפתחת אחרת"}</b>.
            </>
          ) : undefined
        }
      />
    </div>
  );
}
