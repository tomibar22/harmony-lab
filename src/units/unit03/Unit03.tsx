import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { SeqEvent } from "../../engine/audio";

/* ---------------- rhythm helpers ---------------- */

/** Click-track events: one click per beat, velocity per the accent pattern
 *  (1 = strong, 0.6 = secondary, 0 = weak). Strong clicks get a higher pitch. */
function clicks(accents: readonly number[], bars: number, startAt = 0): SeqEvent[] {
  const out: SeqEvent[] = [];
  for (let b = 0; b < bars; b++) {
    accents.forEach((a, i) => {
      out.push({
        midi: a >= 1 ? 88 : a > 0 ? 84 : 79,
        time: startAt + b * accents.length + i,
        dur: 0.15,
        vel: a >= 1 ? 0.95 : a > 0 ? 0.6 : 0.35,
      });
    });
  }
  return out;
}

/* ---------------- tempo terms ---------------- */

const TEMPO_TERMS = [
  { he: "לרגו", en: "Largo", desc: "רחב ואיטי מאוד", bpm: 50 },
  { he: "אדג'ו", en: "Adagio", desc: "איטי, בנחת", bpm: 70 },
  { he: "אנדנטה", en: "Andante", desc: "בקצב הליכה", bpm: 92 },
  { he: "מודרטו", en: "Moderato", desc: "מתון", bpm: 112 },
  { he: "אלגרו", en: "Allegro", desc: "מהיר, עליז", bpm: 132 },
  { he: "פרסטו", en: "Presto", desc: "מהיר מאוד", bpm: 184 },
] as const;

/* ---------------- note values ---------------- */

const NOTE_VALUES: ScoreNote[] = [
  { keys: ["g/4"], duration: "w", midi: [67], sub: "שלם — 4 פעמות" },
  { keys: ["g/4"], duration: "h", midi: [67], sub: "חצי — 2" },
  { keys: ["g/4"], duration: "q", midi: [67], sub: "רבע — 1" },
  { keys: ["g/4"], duration: "8", midi: [67], sub: "שמינית — ½" },
  { keys: ["g/4"], duration: "16", midi: [67], sub: "שש־עשרית — ¼" },
];

const VALUE_LADDER_SEQ: SeqEvent[] = [
  ...clicks([1, 0, 0, 0], 5),
  { midi: 67, time: 0, dur: 4, idx: 0 },
  ...[4, 6].map((t) => ({ midi: 67, time: t, dur: 2, idx: 1 })),
  ...[8, 9, 10, 11].map((t) => ({ midi: 67, time: t, dur: 1, idx: 2 })),
  ...Array.from({ length: 8 }, (_, i) => ({ midi: 67, time: 12 + i * 0.5, dur: 0.5, idx: 3 })),
  ...Array.from({ length: 16 }, (_, i) => ({ midi: 67, time: 16 + i * 0.25, dur: 0.25, idx: 4 })),
];

const DOTTED_NOTES: ScoreNote[] = [
  { keys: ["g/4"], duration: "q", dots: 1, midi: [67], sub: "רבע מנוקד" },
  { keys: ["g/4"], duration: "8", midi: [67], sub: "+ שמינית" },
  { keys: ["g/4"], duration: "h", dots: 1, midi: [67], sub: "חצי מנוקד" },
  { keys: ["g/4"], duration: "q", midi: [67], sub: "+ רבע" },
];

/* ---------------- meters ---------------- */

const METERS = [
  { he: "זוגי", sig: "2/4", accents: [1, 0] },
  { he: "משולש", sig: "3/4", accents: [1, 0, 0] },
  { he: "מרובע", sig: "4/4", accents: [1, 0, 0.6, 0] },
] as const;

/** God Save the King (traditional) — first phrase, 3/4. */
const ANTHEM_NOTES: ScoreNote[] = [
  { keys: ["g/4"], duration: "q", midi: [67], mark: ">" },
  { keys: ["g/4"], duration: "q", midi: [67] },
  { keys: ["a/4"], duration: "q", midi: [69] },
  { keys: [], midi: [], bar: true },
  { keys: ["f#/4"], duration: "q", dots: 1, midi: [66], mark: ">" },
  { keys: ["g/4"], duration: "8", midi: [67] },
  { keys: ["a/4"], duration: "q", midi: [69] },
  { keys: [], midi: [], bar: true },
  { keys: ["b/4"], duration: "q", midi: [71], mark: ">" },
  { keys: ["b/4"], duration: "q", midi: [71] },
  { keys: ["c/5"], duration: "q", midi: [72] },
  { keys: [], midi: [], bar: true },
  { keys: ["b/4"], duration: "q", dots: 1, midi: [71], mark: ">" },
  { keys: ["a/4"], duration: "8", midi: [69] },
  { keys: ["g/4"], duration: "q", midi: [67] },
  { keys: [], midi: [], bar: true },
  { keys: ["a/4"], duration: "q", midi: [69], mark: ">" },
  { keys: ["g/4"], duration: "q", midi: [67] },
  { keys: ["f#/4"], duration: "q", midi: [66] },
  { keys: [], midi: [], bar: true },
  { keys: ["g/4"], duration: "h", dots: 1, midi: [67], mark: ">" },
];
const ANTHEM_SEQ: SeqEvent[] = [
  { midi: 67, time: 0, dur: 1, idx: 0, vel: 0.95 },
  { midi: 67, time: 1, dur: 1, idx: 1, vel: 0.55 },
  { midi: 69, time: 2, dur: 1, idx: 2, vel: 0.55 },
  { midi: 66, time: 3, dur: 1.5, idx: 4, vel: 0.95 },
  { midi: 67, time: 4.5, dur: 0.5, idx: 5, vel: 0.55 },
  { midi: 69, time: 5, dur: 1, idx: 6, vel: 0.55 },
  { midi: 71, time: 6, dur: 1, idx: 8, vel: 0.95 },
  { midi: 71, time: 7, dur: 1, idx: 9, vel: 0.55 },
  { midi: 72, time: 8, dur: 1, idx: 10, vel: 0.55 },
  { midi: 71, time: 9, dur: 1.5, idx: 12, vel: 0.95 },
  { midi: 69, time: 10.5, dur: 0.5, idx: 13, vel: 0.55 },
  { midi: 67, time: 11, dur: 1, idx: 14, vel: 0.55 },
  { midi: 69, time: 12, dur: 1, idx: 16, vel: 0.95 },
  { midi: 67, time: 13, dur: 1, idx: 17, vel: 0.55 },
  { midi: 66, time: 14, dur: 1, idx: 18, vel: 0.55 },
  { midi: 67, time: 15, dur: 3, idx: 20, vel: 0.95 },
];

/* six identical eighths — grouped 3+3 (6/8) or 2+2+2 (3/4) */
const eighthsWith = (beams: string[], accented: number[]): ScoreNote[] =>
  beams.map((b, i) => ({
    keys: ["g/4"],
    duration: "8",
    midi: [67],
    beam: b,
    mark: accented.includes(i) ? ">" : undefined,
  }));
const GROUP_68 = eighthsWith(["a", "a", "a", "b", "b", "b"], [0, 3]);
const GROUP_34 = eighthsWith(["a", "a", "b", "b", "c", "c"], [0, 2, 4]);
const groupSeq = (accented: number[]): SeqEvent[] =>
  Array.from({ length: 12 }, (_, i) => ({
    midi: 67,
    time: i,
    dur: 0.9,
    idx: i % 6,
    vel: accented.includes(i % 6) ? 0.95 : 0.45,
  }));

/** Mozart, Piano Sonata K. 331, i — bars 1–2 (melody), 6/8. */
const MOZART_331: ScoreNote[] = [
  { keys: ["c#/5"], duration: "8", dots: 1, midi: [73], beam: "m1" },
  { keys: ["d/5"], duration: "16", midi: [74], beam: "m1" },
  { keys: ["c#/5"], duration: "8", midi: [73], beam: "m1" },
  { keys: ["e/5"], duration: "q", midi: [76] },
  { keys: ["e/5"], duration: "8", midi: [76] },
  { keys: [], midi: [], bar: true },
  { keys: ["b/4"], duration: "8", dots: 1, midi: [71], beam: "m2" },
  { keys: ["c#/5"], duration: "16", midi: [73], beam: "m2" },
  { keys: ["b/4"], duration: "8", midi: [71], beam: "m2" },
  { keys: ["d/5"], duration: "q", midi: [74] },
  { keys: ["d/5"], duration: "8", midi: [74] },
];
const MOZART_331_SEQ: SeqEvent[] = [
  { midi: 73, time: 0, dur: 1.5, idx: 0, vel: 0.9 },
  { midi: 74, time: 1.5, dur: 0.5, idx: 1, vel: 0.5 },
  { midi: 73, time: 2, dur: 1, idx: 2, vel: 0.55 },
  { midi: 76, time: 3, dur: 2, idx: 3, vel: 0.8 },
  { midi: 76, time: 5, dur: 1, idx: 4, vel: 0.5 },
  { midi: 71, time: 6, dur: 1.5, idx: 6, vel: 0.9 },
  { midi: 73, time: 7.5, dur: 0.5, idx: 7, vel: 0.5 },
  { midi: 71, time: 8, dur: 1, idx: 8, vel: 0.55 },
  { midi: 74, time: 9, dur: 2, idx: 9, vel: 0.8 },
  { midi: 74, time: 11, dur: 1, idx: 10, vel: 0.5 },
];

/* ---------------- syncopation (original examples) ---------------- */

const STRAIGHT_NOTES: ScoreNote[] = [
  { keys: ["c/5"], duration: "q", midi: [72] },
  { keys: ["d/5"], duration: "q", midi: [74] },
  { keys: ["e/5"], duration: "q", midi: [76] },
  { keys: ["d/5"], duration: "q", midi: [74] },
];
const SYNC_NOTES: ScoreNote[] = [
  { keys: ["c/5"], duration: "8", midi: [72] },
  { keys: ["d/5"], duration: "q", midi: [74], mark: ">", kind: "active" },
  { keys: ["e/5"], duration: "q", midi: [76], mark: ">", kind: "active" },
  { keys: ["d/5"], duration: "q", midi: [74], mark: ">", kind: "active" },
  { keys: ["c/5"], duration: "8", midi: [72] },
];
const STRAIGHT_SEQ: SeqEvent[] = [
  ...clicks([1, 0, 0.6, 0], 2),
  ...[72, 74, 76, 74].map((m, i) => ({ midi: m, time: i, dur: 1, idx: i })),
  ...[72, 74, 76, 74].map((m, i) => ({ midi: m, time: 4 + i, dur: 1, idx: i })),
];
const SYNC_SEQ: SeqEvent[] = [
  ...clicks([1, 0, 0.6, 0], 2),
  ...[0, 4].flatMap((bar) => [
    { midi: 72, time: bar + 0, dur: 0.5, idx: 0 },
    { midi: 74, time: bar + 0.5, dur: 1, idx: 1 },
    { midi: 76, time: bar + 1.5, dur: 1, idx: 2 },
    { midi: 74, time: bar + 2.5, dur: 1, idx: 3 },
    { midi: 72, time: bar + 3.5, dur: 0.5, idx: 4 },
  ]),
];

/* ---------------- anacrusis (original example) ---------------- */

const ANACRUSIS_NOTES: ScoreNote[] = [
  { keys: ["g/4"], duration: "q", midi: [67], sub: "אנאקרוזה" },
  { keys: [], midi: [], bar: true },
  { keys: ["c/5"], duration: "h", midi: [72], mark: ">" },
  { keys: ["e/5"], duration: "q", midi: [76] },
  { keys: ["d/5"], duration: "q", midi: [74] },
  { keys: [], midi: [], bar: true },
  { keys: ["c/5"], duration: "w", midi: [72], mark: ">" },
];
const ANACRUSIS_SEQ: SeqEvent[] = [
  { midi: 67, time: 0, dur: 1, idx: 0, vel: 0.5 },
  { midi: 72, time: 1, dur: 2, idx: 2, vel: 0.95 },
  { midi: 76, time: 3, dur: 1, idx: 3, vel: 0.55 },
  { midi: 74, time: 4, dur: 1, idx: 4, vel: 0.55 },
  { midi: 72, time: 5, dur: 4, idx: 6, vel: 0.95 },
];

/* ---------------- drills ---------------- */

/** durations in sixteenths */
const VALUE_UNITS = [
  { he: "חצאים", six: 8 },
  { he: "רבעים", six: 4 },
  { he: "שמיניות", six: 2 },
  { he: "שש־עשריות", six: 1 },
] as const;
const VALUE_CONTAINERS = [
  { he: "תו שלם", six: 16 },
  { he: "חצי", six: 8 },
  { he: "חצי מנוקד", six: 12 },
  { he: "רבע", six: 4 },
  { he: "רבע מנוקד", six: 6 },
  { he: "שמינית מנוקדת", six: 3 },
] as const;

function valueMathQuestion(): Question {
  const combos = VALUE_CONTAINERS.flatMap((c) =>
    VALUE_UNITS.filter((u) => c.six > u.six && c.six % u.six === 0).map((u) => ({ c, u }))
  );
  const { c, u } = pick(combos);
  const answer = String(c.six / u.six);
  const wrong = shuffle(["2", "3", "4", "6", "8", "12", "16"].filter((n) => n !== answer)).slice(0, 3);
  return {
    prompt: <>כמה <b>{u.he}</b> יש ב<b>{c.he}</b>?</>,
    options: shuffle([answer, ...wrong]),
    answer,
    explain: <>נקודה מוסיפה תמיד חצי מערך התו: רבע מנוקד = רבע + שמינית.</>,
  };
}

const SIG_POOL = [
  { desc: "שתי פעמות של רבע בכל תיבה", sig: "2/4" },
  { desc: "שלוש פעמות של רבע בכל תיבה", sig: "3/4" },
  { desc: "ארבע פעמות של רבע בכל תיבה", sig: "4/4" },
  { desc: "שתי פעמות של רבע מנוקד בכל תיבה", sig: "6/8" },
  { desc: "שלוש פעמות של רבע מנוקד בכל תיבה", sig: "9/8" },
  { desc: "ארבע פעמות של רבע מנוקד בכל תיבה", sig: "12/8" },
] as const;

function timeSigQuestion(): Question {
  const q = pick(SIG_POOL);
  const wrong = shuffle(SIG_POOL.filter((s) => s.sig !== q.sig))
    .slice(0, 3)
    .map((s) => s.sig);
  return {
    prompt: <>{q.desc} — מהו סימן המשקל?</>,
    options: shuffle([q.sig, ...wrong]),
    answer: q.sig,
    explain: (
      <>
        במשקל פשוט המספר העליון סופר את הפעמות עצמן; במשקל מורכב (6, 9, 12 למעלה) הוא סופר את השמיניות,
        ומחלקים בשלוש כדי לקבל את מספר הפעמות המנוקדות.
      </>
    ),
  };
}

const CLASSIFY_POOL = [
  { sig: "2/4", cls: "פשוט זוגי" },
  { sig: "2/2", cls: "פשוט זוגי" },
  { sig: "3/4", cls: "פשוט משולש" },
  { sig: "3/8", cls: "פשוט משולש" },
  { sig: "4/4", cls: "פשוט מרובע" },
  { sig: "6/8", cls: "מורכב זוגי" },
  { sig: "9/8", cls: "מורכב משולש" },
  { sig: "12/8", cls: "מורכב מרובע" },
] as const;

function classifyMeterQuestion(): Question {
  const q = pick(CLASSIFY_POOL);
  const wrong = shuffle(
    Array.from(new Set(CLASSIFY_POOL.map((s) => s.cls))).filter((c) => c !== q.cls)
  ).slice(0, 3);
  return {
    prompt: (
      <>
        כיצד מסוּוג המשקל <b dir="ltr">{q.sig}</b>?
      </>
    ),
    options: shuffle([q.cls, ...wrong]),
    answer: q.cls,
    explain: <>פשוט — הפעמה מתחלקת לשניים; מורכב — לשלושה. זוגי/משולש/מרובע לפי מספר הפעמות בתיבה.</>,
  };
}

function tempoQuestion(): Question {
  const terms = shuffle([...TEMPO_TERMS]).slice(0, 4);
  const fastest = terms.reduce((a, b) => (b.bpm > a.bpm ? b : a));
  return {
    prompt: <>איזה מהמונחים הבאים מציין את הטמפו ה<b>מהיר</b> ביותר?</>,
    options: shuffle(terms.map((t) => t.he)),
    answer: fastest.he,
    explain: <>מהאיטי למהיר: לרגו ← אדג'ו ← אנדנטה ← מודרטו ← אלגרו ← פרסטו.</>,
  };
}

/* ---------------- the lesson ---------------- */

export function Unit03() {
  const tempoPlayer = usePlayer();
  const valuePlayer = usePlayer();
  const dotPlayer = usePlayer();
  const meterPlayer = usePlayer();
  const anthemPlayer = usePlayer();
  const groupPlayer = usePlayer();
  const mozartPlayer = usePlayer();
  const syncPlayer = usePlayer();
  const anaPlayer = usePlayer();
  const [meterTab, setMeterTab] = useState(1); // default: triple
  const [tempoTab, setTempoTab] = useState(4); // default: allegro

  const meter = METERS[meterTab];
  const tempo = TEMPO_TERMS[tempoTab];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 3</div>
        <h1>מקצב ומשקל</h1>
        <p className="lede">
          עד עכשיו עסקנו בגובה — אילו צלילים. היחידה הזאת עוסקת בזמן: איך משכים, פעמות והטעמות מארגנים את
          הזרימה — ולמה השאלה "מתי" חשובה להרמוניה לא פחות מהשאלה "מה".
        </p>
      </header>

      <Section id="beat" num="3.1" title="פעמה וטמפו">
        <p>
          מתחת לכל מוזיקה כמעט פועם דופק סמוי וסדיר — ה<Term he="פעמה" en="Beat" def="יחידת הזמן הבסיסית: הדופק הסדיר שעליו נמדדים כל המשכים. זה מה שהרגל מקישה כשמקשיבים." />.
          זו היחידה שבה אנחנו מודדים כל משך, ומה שהרגל מקישה מעצמה בהאזנה. מהירות הפעמה נקראת{" "}
          <Term he="טמפו" en="Tempo" def="מהירות הפעמה, הנמדדת בפעימות לדקה (BPM) או מצוינת במונחים איטלקיים מסורתיים." /> —
          נהוג למדוד אותה בפעימות לדקה (<span dir="ltr">BPM</span>) או לציין אותה במונחים האיטלקיים
          המסורתיים:
        </p>
        <Widget
          title="בחרו מונח טמפו והקשיבו לדופק"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {TEMPO_TERMS.map((t, i) => (
                  <button key={t.en} role="tab" aria-selected={tempoTab === i} onClick={() => setTempoTab(i)}>
                    {t.he}
                  </button>
                ))}
              </div>
              <PlayButton
                label={`נגנו ${tempo.he}`}
                events={clicks([1, 0, 0, 0], 2)}
                bpm={tempo.bpm}
                player={tempoPlayer}
              />
            </>
          }
        >
          <p style={{ direction: "rtl", margin: 0 }}>
            <b>{tempo.he}</b> <span style={{ color: "var(--ink-soft)" }} dir="ltr">({tempo.en})</span> —{" "}
            {tempo.desc}, בסביבות <span dir="ltr">{tempo.bpm} BPM</span>.
          </p>
        </Widget>
      </Section>

      <Section id="values" num="3.2" title="ערכי המשך: הכול יחסי">
        <p>
          התווים אינם מציינים משך מוחלט בשניות אלא <em className="hl">יחס</em>: כל ערך שווה לשני הערכים
          מהדרגה שמתחתיו. תו שלם = שני חצאים = ארבעה רבעים = שמונה שמיניות — והטמפו הוא שקובע כמה זמן
          זה בפועל:
        </p>
        <Widget
          title="סולם הערכים — כל תו מתחלק לשניים (מעל דופק קבוע)"
          foot={<PlayButton label="נגנו את הסולם, מהשלם לשש־עשרית" events={VALUE_LADDER_SEQ} bpm={112} player={valuePlayer} />}
        >
          <Score notes={NOTE_VALUES} even width={620} highlightIndex={valuePlayer.index} ariaLabel="תו שלם, חצי, רבע, שמינית ושש־עשרית" />
        </Widget>
        <p>
          שני כלים מרחיבים את המערכת: <b>נקודה</b> אחרי תו מוסיפה לו חצי מערכו (רבע מנוקד = רבע + שמינית),
          ו<b>קשת הַחְזָקָה</b> מחברת שני תווים לצליל אחד רציף — כך רושמים משכים שחוצים קו תיבה.
        </p>
        <Widget
          title="התו המנוקד ומשלימו"
          foot={<PlayButton label="נגנו את הצמדים" events={[
            { midi: 67, time: 0, dur: 1.5, idx: 0 },
            { midi: 67, time: 1.5, dur: 0.5, idx: 1 },
            { midi: 67, time: 3, dur: 3, idx: 2 },
            { midi: 67, time: 6, dur: 1, idx: 3 },
          ]} bpm={100} player={dotPlayer} />}
        >
          <Score notes={DOTTED_NOTES} even width={480} highlightIndex={dotPlayer.index} ariaLabel="רבע מנוקד עם שמינית וחצי מנוקד עם רבע" />
        </Widget>
      </Section>

      <Section id="meter" num="3.3" title="משקל: הפעמות מתארגנות בקבוצות">
        <p>
          פעמות אינן נשארות שורה אחידה: האוזן מקבצת אותן לקבוצות קבועות של שתיים, שלוש או ארבע, שבראש כל
          אחת פעמה <b>חזקה</b>. הארגון הזה הוא ה<Term he="משקל" en="Meter" def="ארגון הפעמות בקבוצות קבועות של חזקות וחלשות. הפעמה הראשונה בכל קבוצה — הדאונביט — היא החזקה." />,
          כל קבוצה נרשמת כ<Term he="תיבה" en="Measure / Bar" def="קבוצת פעמות אחת של המשקל, התחומה בקווי תיבה אנכיים על החמשה." /> בין
          שני קווים אנכיים, וה<Term he="סימן המשקל" en="Time signature" def="שני המספרים שבתחילת היצירה: העליון — כמה יחידות בתיבה; התחתון — מהי היחידה (4 = רבע, 8 = שמינית)." /> שבתחילת
          היצירה מכריז על הארגון: המספר העליון — כמה, התחתון — ממה (4 = רבעים, 8 = שמיניות).
        </p>
        <Widget
          title="שלושת המשקלים הפשוטים — הקשיבו להטעמה"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {METERS.map((m, i) => (
                  <button key={m.sig} role="tab" aria-selected={meterTab === i} onClick={() => setMeterTab(i)}>
                    {m.he} <span dir="ltr">{m.sig}</span>
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו שתי תיבות" events={clicks(meter.accents, 2)} bpm={100} player={meterPlayer} />
            </>
          }
        >
          <div dir="ltr" style={{ display: "flex", gap: "1.1rem", alignItems: "center", justifyContent: "center", padding: "0.6rem 0" }}>
            {[0, 1].map((bar) =>
              meter.accents.map((a, i) => (
                <span
                  key={`${bar}-${i}`}
                  aria-hidden
                  style={{
                    width: a >= 1 ? 26 : a > 0 ? 20 : 14,
                    height: a >= 1 ? 26 : a > 0 ? 20 : 14,
                    borderRadius: "50%",
                    background: a >= 1 ? "var(--gold)" : a > 0 ? "var(--ink-soft)" : "var(--line)",
                  }}
                />
              ))
            )}
          </div>
          <p style={{ direction: "rtl", textAlign: "center", color: "var(--ink-soft)", fontSize: "0.9rem", margin: 0 }}>
            עיגול גדול = פעמה חזקה{meter.sig === "4/4" ? "; במשקל מרובע יש גם הטעמת משנה על הפעמה השלישית" : ""}.
          </p>
        </Widget>
        <Callout label="למה זה חשוב להרמוניה?" insight>
          המשקל הוא לא עניין "טכני": הוא קובע היכן האוזן מצפה ליציבות. ביחידות הבאות נראה שאותו דיסוננס
          בדיוק נשמע אחרת כשהוא נופל על פעמה חזקה — והטיפול בו תלוי בדיוק במיקומו בתיבה.
        </Callout>
      </Section>

      <Section id="triple" num="3.4" title="משקל משולש בפעולה">
        <p>
          הלחן המסורתי הזה — מוכר כהמנון "אלוהים נצור את המלך" — הוא שיעור מושלם במשקל משולש: כל תיבה
          נשענת על הפעמה הראשונה שלה, והתבנית "רבע מנוקד–שמינית–רבע" בתיבות 2 ו־4 מדגישה את הדאונביט
          עוד יותר. עקבו אחרי סימני ה־<span dir="ltr">&gt;</span>:
        </p>
        <Widget
          title="לחן מסורתי — משקל 3/4, הפעמות החזקות מסומנות"
          foot={<PlayButton label="נגנו את הפסוק" events={ANTHEM_SEQ} bpm={92} player={anthemPlayer} />}
        >
          <Score
            notes={ANTHEM_NOTES}
            keySig="G"
            timeSig="3/4"
            width={760}
            highlightIndex={anthemPlayer.index}
            ariaLabel="הפסוק הראשון של ההמנון במשקל שלושה רבעים"
          />
        </Widget>
      </Section>

      <Section id="compound" num="3.5" title="פשוט ומורכב: איך מתחלקת הפעמה?">
        <p>
          עד כאן חילקנו כל פעמה לשניים — זה <Term he="משקל פשוט" en="Simple meter" def="משקל שבו הפעמה מתחלקת באופן טבעי לשתי יחידות (רבע לשתי שמיניות)." />. אבל
          פעמה יכולה להתחלק גם לשלושה: אז הפעמה היא תו מנוקד, והמשקל{" "}
          <Term he="משקל מורכב" en="Compound meter" def="משקל שבו הפעמה היא תו מנוקד המתחלק לשלוש יחידות. סימנו העליון 6, 9 או 12 — סופרים את יחידות המשנה." />.
          ההבדל אינו במספר השמיניות אלא ב<em className="hl">קיבוץ</em> שלהן — הקשיבו לאותן שש שמיניות
          בדיוק, פעם כ־3+3 ופעם כ־2+2+2:
        </p>
        <Widget
          title="שש שמיניות, שני משקלים — הקורות חושפות את הקיבוץ"
          foot={
            <>
              <PlayButton label="‏6/8 — שתי פעמות מנוקדות" events={groupSeq([0, 3])} bpm={176} player={groupPlayer} />
              <PlayButton label="‏3/4 — שלוש פעמות פשוטות" ghost events={groupSeq([0, 2, 4])} bpm={176} player={groupPlayer} />
            </>
          }
        >
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <Score notes={GROUP_68} timeSig="6/8" width={340} clickable={false} ariaLabel="שש שמיניות מקובצות שלוש ושלוש" />
            <Score notes={GROUP_34} timeSig="3/4" width={340} clickable={false} ariaLabel="שש שמיניות מקובצות שתיים שתיים" />
          </div>
        </Widget>
        <p>
          המשקל המורכב הנפוץ ביותר הוא <span dir="ltr">6/8</span>, וכך הוא נשמע אצל מוצרט — פתיחת הסונטה
          ק. 331, שבה כל תיבה מתנדנדת על שתי פעמות מנוקדות:
        </p>
        <Widget
          title="מוצרט, סונטה לפסנתר ק. 331, פרק א׳ — תיבות 1–2"
          foot={<PlayButton label="נגנו את הפתיחה" events={MOZART_331_SEQ} bpm={126} player={mozartPlayer} />}
        >
          <Score
            notes={MOZART_331}
            keySig="A"
            timeSig="6/8"
            highlightIndex={mozartPlayer.index}
            ariaLabel="שתי התיבות הראשונות של סונטה ק. 331 במשקל שש שמיניות"
          />
        </Widget>
      </Section>

      <Section id="syncopation" num="3.6" title="סינקופה: הטעמה נגד המשקל">
        <p>
          המשקל יוצר רשת של ציפיות — ובדיוק בגלל זה אפשר לשחק נגדה.{" "}
          <Term he="סינקופה" en="Syncopation" def="הדגשת צלילים דווקא בין הפעמות או על החלשות, בניגוד לרשת המשקל. המתח נוצר מול הציפייה — ולכן הדופק חייב להישאר יציב." /> מטעימה
          צלילים דווקא <em className="hl">בין</em> הפעמות: שמינית אחת מזיזה את כל השאר, וכל המשפט נשען
          על "אוויר". השוו — אותם צלילים, מעל אותו דופק:
        </p>
        <Widget
          title="ישר מול מסונקפ — הדופק זהה, ההטעמה זזה"
          foot={
            <>
              <PlayButton label="על הפעמות" events={STRAIGHT_SEQ} bpm={96} player={syncPlayer} />
              <PlayButton label="בסינקופה" ghost events={SYNC_SEQ} bpm={96} player={syncPlayer} />
            </>
          }
        >
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <Score notes={STRAIGHT_NOTES} timeSig="4/4" width={340} clickable={false} ariaLabel="ארבעה רבעים על הפעמות" />
            <Score notes={SYNC_NOTES} timeSig="4/4" width={340} clickable={false} ariaLabel="אותם צלילים בסינקופה" />
          </div>
        </Widget>
        <Callout label="שימו לב">
          סינקופה אינה "יציאה מהקצב" — להפך: היא עובדת רק כשהפעמה יציבה לגמרי. המתח נוצר מהפער בין
          מה שנשמע ובין הרשת שהאוזן ממשיכה לספור מתחת.
        </Callout>
      </Section>

      <Section id="anacrusis" num="3.7" title="אנאקרוזה: להתחיל לפני ההתחלה">
        <p>
          לא כל מנגינה מתחילה על פעמה חזקה. פתיחה על פעמה חלשה שמובילה אל הדאונביט הקרוב נקראת{" "}
          <Term he="אנאקרוזה" en="Anacrusis / Upbeat" def="צליל פתיחה (או כמה) על פעמה חלשה, לפני התיבה השלמה הראשונה. משלים בדרך כלל את התיבה האחרונה." /> —
          "קפיצת מדרגה" קטנה שנותנת למשפט תנופה. שימו לב איך הצליל הבודד שלפני הקו נשען קדימה, אל
          הפעמה החזקה הראשונה:
        </p>
        <Widget
          title="פתיחה באנאקרוזה — הצליל שלפני קו התיבה מוביל פנימה"
          foot={<PlayButton label="נגנו את המשפט" events={ANACRUSIS_SEQ} bpm={92} player={anaPlayer} />}
        >
          <Score notes={ANACRUSIS_NOTES} timeSig="4/4" highlightIndex={anaPlayer.index} ariaLabel="משפט הנפתח באנאקרוזה של רבע" />
        </Widget>
      </Section>

      <Section id="review" num="3.8" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>פעמה וטמפו</b>הדופק הסדיר; מהירותו נמדדת ב־BPM או במונחים איטלקיים.</div>
          <div className="review-chip"><b>ערכי משך</b>יחסיים: כל ערך = שניים מהדרגה שמתחת; נקודה מוסיפה חצי.</div>
          <div className="review-chip"><b>משקל</b>קיבוץ פעמות לחזקות וחלשות; נרשם בתיבות.</div>
          <div className="review-chip"><b>סימן המשקל</b>עליון — כמה; תחתון — ממה (4 = רבע, 8 = שמינית).</div>
          <div className="review-chip"><b>פשוט / מורכב</b>הפעמה מתחלקת לשניים / לשלושה (פעמה מנוקדת).</div>
          <div className="review-chip"><b>6/8 מול 3/4</b>אותן שש שמיניות — קיבוץ שונה: 3+3 מול 2+2+2.</div>
          <div className="review-chip"><b>סינקופה</b>הטעמה בין הפעמות או על החלשות, מעל דופק יציב.</div>
          <div className="review-chip"><b>אנאקרוזה</b>פתיחה על פעמה חלשה המובילה אל הדאונביט.</div>
        </div>
      </Section>

      <Section id="drills" num="3.9" title="תרגול — עד שזה אוטומטי">
        <Drill title="חשבון ערכי המשך" generate={valueMathQuestion} />
        <Drill title="זיהוי סימן המשקל" generate={timeSigQuestion} />
        <Drill title="פשוט או מורכב?" generate={classifyMeterQuestion} />
        <Drill title="מונחי הטמפו" generate={tempoQuestion} />
      </Section>

      <NextUnit current={3}>
        <b>הבא בתור — יחידה 4: משולשים וספטאקורדים.</b> מהמרווחים אל האקורדים: איך בונים משולש, מה מבדיל
        מז'ורי ממינורי וממוקטן, ומהם ההיפוכים — אבני הבניין של כל ההרמוניה שנלמד מכאן והלאה.
      </NextUnit>
    </div>
  );
}
