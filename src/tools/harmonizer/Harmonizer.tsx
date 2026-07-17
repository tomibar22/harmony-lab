import { useMemo, useState } from "react";
import { chordSeq, Satb, SatbScores } from "../../components/Satb";
import { FigText, PlayButton, usePlayer } from "../../components/ui";
import { StaffInput } from "../../workbook/StaffInput";
import {
  Key,
  MAJOR_KEYS_WB,
  MINOR_KEYS_WB,
  Mode,
  SpelledPitch,
  degreePitch,
  keyOf,
  midiOf,
  sigLabel,
  spellScale,
  vexKeyOf,
} from "../../workbook/pitch";
import { harmonize, HarmonizeResult, Level, Solution } from "./engine";

const MAX_SLOTS = 8;

const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 1, label: "משולשים דיאטוניים", hint: "רק אקורדי הסולם, במצב יסודי ובהיפוך ראשון" },
  { id: 2, label: "+ ספטאקורדים", hint: "מוסיף את V7 על היפוכיו ואת ספטאקורד הסופרטוניקה" },
  { id: 3, label: "+ דומיננטות משניות", hint: "מוסיף V ו־V7 של דרגות הסולם - כרומטיקה ראשונה" },
];

/** Example lines by length, as scale degrees (no 7̂ - key-form agnostic). */
const EXAMPLES: Record<number, number[]> = {
  2: [2, 1],
  3: [3, 2, 1],
  4: [3, 4, 2, 1],
  5: [5, 4, 3, 2, 1],
  6: [3, 4, 5, 4, 2, 1],
  7: [5, 6, 5, 4, 3, 2, 1],
  8: [1, 2, 3, 4, 5, 4, 2, 1],
};

function toSatb(sol: Solution): Satb[] {
  return sol.chords.map((c) => ({
    s: [vexKeyOf(c.s), midiOf(c.s)],
    a: [vexKeyOf(c.a), midiOf(c.a)],
    t: [vexKeyOf(c.t), midiOf(c.t)],
    b: [vexKeyOf(c.b), midiOf(c.b)],
  }));
}

function exampleLine(key: Key, len: number): (SpelledPitch | null)[] {
  const degs = EXAMPLES[len] ?? EXAMPLES[5];
  let line = degs.map((d) => degreePitch(key, d, 4, "natural"));
  // keep the whole line inside the soprano compass (C4–G5)
  const hi = Math.max(...line.map(midiOf));
  const lo = Math.min(...line.map(midiOf));
  if (hi > 79 && lo - 12 >= 60) line = line.map((p) => ({ ...p, octave: p.octave - 1 }));
  else if (lo < 60 && hi + 12 <= 79) line = line.map((p) => ({ ...p, octave: p.octave + 1 }));
  return line;
}

export function Harmonizer() {
  const [mode, setMode] = useState<Mode>("major");
  const [sharps, setSharps] = useState(0);
  const key = keyOf(sharps, mode);
  const [len, setLen] = useState(5);
  const [level, setLevel] = useState<Level>(1);
  const [melody, setMelody] = useState<(SpelledPitch | null)[]>(Array(MAX_SLOTS).fill(null));
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<HarmonizeResult | null>(null);
  const [open, setOpen] = useState(0);
  const [activeSol, setActiveSol] = useState<number | null>(null);
  const player = usePlayer();

  /** key-signature spelling for freshly placed notes */
  const snapAlter = useMemo(() => {
    const scale = spellScale({ ...key.tonic, octave: 4 }, key.mode, "natural");
    const byLetter = new Map(scale.slice(0, 7).map((p) => [p.letter, p.alter]));
    return (dia: number) => byLetter.get(((dia % 7) + 7) % 7) ?? 0;
  }, [key]);

  const setKey = (nextSharps: number, nextMode: Mode) => {
    setSharps(nextSharps);
    setMode(nextMode);
    // respell the existing letters in the new key's signature
    const nk = keyOf(nextSharps, nextMode);
    const scale = spellScale({ ...nk.tonic, octave: 4 }, nk.mode, "natural");
    const byLetter = new Map(scale.slice(0, 7).map((p) => [p.letter, p.alter]));
    setMelody((m) => m.map((p) => (p ? { ...p, alter: byLetter.get(p.letter) ?? 0 } : p)));
    setRes(null);
  };

  const onMelody = (next: (SpelledPitch | null)[]) => {
    setMelody((m) => m.map((p, i) => (i < len ? (next[i] ?? null) : p)));
    setRes(null);
  };

  const line = melody.slice(0, len);
  const filled = line.every(Boolean);

  const run = () => {
    if (!filled) return;
    player.stop();
    setBusy(true);
    setActiveSol(null);
    // let the button repaint before the search runs
    setTimeout(() => {
      setRes(harmonize({ key, soprano: line as SpelledPitch[], level }));
      setOpen(0);
      setBusy(false);
    }, 30);
  };

  const playSolution = (i: number, sol: Solution) => {
    if (player.playing && activeSol === i) {
      player.stop();
      return;
    }
    setActiveSol(i);
    void player.play(chordSeq(toSatb(sol), 1.6), 76);
  };

  const keys = (mode === "major" ? MAJOR_KEYS_WB : MINOR_KEYS_WB).filter(
    (k) => Math.abs(k.sharps) <= 6
  );

  return (
    <div className="tool-wrap">
      <div className="workbook">
        <a className="wb-back" href="#/">
          ← חזרה למפת הלמידה
        </a>
      </div>
      <div className="kicker">כלי · הרמוניזציה בארבעה קולות</div>
      <h1>סדנת ההרמוניזציה</h1>
      <p className="lede">
        מזינים קו סופרן, בוחרים סולם ורמת מורכבות - והכלי מעלה את כל ההרמוניזציות בארבעה קולות
        שעומדות בכללי הכתיבה של הספר: טווחים ומרווחי פריסה, הכפלות, איסור מקבילות, פתרון צליל
        מוביל וספטימה. התוצאות מדורגות לפי חלקוּת הובלת הקולות - מהצמודה ביותר והלאה.
      </p>

      <section className="hz-panel">
        <div className="hz-row">
          <span className="wb-chips-label">מודוס</span>
          <div className="wb-chips">
            {(["major", "minor"] as Mode[]).map((m) => (
              <button
                key={m}
                className={"wb-chip" + (mode === m ? " sel" : "")}
                onClick={() => setKey(sharps, m)}
              >
                {m === "major" ? "מז'ור" : "מינור"}
              </button>
            ))}
          </div>
          <span className="wb-chips-label">סולם</span>
          <select
            className="hz-select"
            value={sharps}
            onChange={(e) => setKey(Number(e.target.value), mode)}
            aria-label="בחירת סולם"
          >
            {keys.map((k) => (
              <option key={k.sharps} value={k.sharps}>
                {k.nameHe} ({sigLabel(k.sharps)})
              </option>
            ))}
          </select>
        </div>

        <div className="hz-row">
          <span className="wb-chips-label">אוצר האקורדים</span>
          <div className="wb-chips">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                className={"wb-chip" + (level === l.id ? " sel" : "")}
                title={l.hint}
                onClick={() => {
                  setLevel(l.id);
                  setRes(null);
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hz-row">
          <span className="wb-chips-label">אורך הקו</span>
          <div className="wb-chips compact">
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <button
                key={n}
                className={"wb-chip" + (len === n ? " sel" : "")}
                onClick={() => {
                  setLen(n);
                  setRes(null);
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="hz-note">צלילי הקו הם רק גבהים - אקורד לכל צליל, בלי משקל ומקצב</span>
        </div>

        <StaffInput
          clef="treble"
          slots={len}
          value={line}
          onChange={onMelody}
          snapAlter={snapAlter}
          ariaLabel="קו הסופרן להרמון"
        />

        <div className="wb-actions">
          <button className="hz-go" onClick={run} disabled={!filled || busy}>
            {busy ? "מחשב…" : "מצאו הרמוניזציות"}
          </button>
          <button
            className="wb-chip"
            onClick={() => {
              const ex = exampleLine(key, len);
              setMelody((m) => m.map((p, i) => (i < len ? ex[i] : p)));
              setRes(null);
            }}
          >
            דוגמה
          </button>
          <button
            className="wb-chip"
            onClick={() => {
              setMelody(Array(MAX_SLOTS).fill(null));
              setRes(null);
            }}
          >
            ניקוי
          </button>
          {!filled && <span className="hz-note">יש להניח צליל בכל אחת מ־{len} העמדות</span>}
        </div>
      </section>

      {res && res.problems.length > 0 && (
        <ul className="wb-violations" role="alert">
          {res.problems.map((p, i) => (
            <li key={i} className="err">
              {p}
            </li>
          ))}
        </ul>
      )}

      {res && res.solutions.length > 0 && (
        <section className="hz-results">
          <h2>
            {res.solutions.length === 1
              ? "נמצאה הרמוניזציה אחת"
              : `נמצאו ${res.solutions.length} הרמוניזציות`}
            <span className="hz-sub"> · מדורגות מהחלקה ביותר</span>
          </h2>
          {res.solutions.map((sol, i) => {
            const isOpen = open === i;
            return (
              <article key={i} className={"card wb-card hz-card" + (isOpen ? " open" : "")}>
                <button
                  className="wb-cardhead"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                >
                  <span className="hz-rank">{i + 1}</span>
                  <span className="hz-chain" dir="ltr">
                    <FigText text={sol.numerals.join("–")} />
                  </span>
                  <span className="hz-badges">
                    {sol.cadence && <span className="hz-badge cadence">{sol.cadence}</span>}
                    {sol.warnings.length > 0 && (
                      <span className="hz-badge warn">
                        {sol.warnings.length === 1 ? "הערה אחת" : `${sol.warnings.length} הערות`}
                      </span>
                    )}
                  </span>
                </button>
                {isOpen && (
                  <div className="wb-cardbody">
                    <div className="wb-prompt-score">
                      <SatbScores
                        chords={toSatb(sol)}
                        marks={sol.numerals}
                        highlight={activeSol === i ? player.index : null}
                        label={`הרמוניזציה ${i + 1}`}
                        keySig={key.vex}
                      />
                    </div>
                    <div className="wb-actions">
                      <PlayButton
                        label="נגנו"
                        events={chordSeq(toSatb(sol), 1.6)}
                        bpm={76}
                        player={{
                          ...player,
                          playing: player.playing && activeSol === i,
                          play: async () => playSolution(i, sol),
                        }}
                      />
                    </div>
                    {sol.warnings.length > 0 && (
                      <ul className="wb-violations">
                        {sol.warnings.map((w, wi) => (
                          <li key={wi} className="warn">
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {res && res.solutions.length === 0 && res.problems.length === 0 && (
        <p className="hz-note">לא נמצאו הרמוניזציות - נסו לשנות את הקו או את רמת המורכבות.</p>
      )}

      <details className="hz-details">
        <summary>מה הכלי אוכף?</summary>
        <ul>
          <li>טווחי הקולות של הספר (סופרן דו⁴–סול⁵, אלט סול³–רה⁵, טנור דו³–סול⁴, בס מי²–דו⁴)</li>
          <li>עד אוקטבה בין סופרן–אלט ואלט–טנור; ללא הצלבת קולות</li>
          <li>אקורדים שלמים; הכפלה לפי הכללים - ולעולם לא של הצליל המוביל או הספטימה</li>
          <li>איסור קווינטות ואוקטבות מקבילות; קווינטות/אוקטבות סמויות וחפיפות - מסומנות כהערה</li>
          <li>פתרון צליל מוביל לטוניקה (בקול פנימי מותרת נפילת טרצה לקווינטה), פתרון ספטימה במדרגה יורדת</li>
          <li>איסור מרווחים מלודיים מוגדלים (ובמינור - הסקונדה המוגדלת) ואיסור יחס צולב</li>
          <li>תחביר פונקציונלי: מהלכי הדרגות שהספר מלמד, ודומיננטה משנית שחייבת להתפתר ליעדה</li>
          <li>מצבים: מצב יסודי והיפוך ראשון (משולש מוקטן - בהיפוך ראשון בלבד); אקורדי 6/4 - בהמשך הדרך</li>
        </ul>
      </details>
    </div>
  );
}
