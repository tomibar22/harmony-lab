import { useState } from "react";
import { ScoreNote } from "../../components/Score";
import { SeqEvent } from "../../engine/audio";
import { ExerciseCard, useWbProgress } from "../../workbook/exercise";
import { WorkbookHero } from "../../workbook/items";
import {
  BarlineItem,
  BarlineSpec,
  ConflictItem,
  ConflictSpec,
  FillBarItem,
  FillBarSpec,
  MeterIdItem,
  MeterIdSpec,
  PhraseItem,
  PhraseSpec,
} from "../../workbook/rhythm";

/* tick shorthands (PPQ 960) */
const W = 3840, HD = 2880, H = 1920, QD = 1440, Q = 960, E = 480;

/* =========================================================================
 * Exercise data - original rhythms in the spirit of the source workbook's
 * Unit 3 (meter, barlines, rhythmic-metric conflicts, phrase groups).
 * ========================================================================= */

const METER_ID: MeterIdSpec[] = [
  { meter: [3, 4], durations: [Q, Q, Q, QD, E, Q] },
  { meter: [4, 4], durations: [Q, E, E, Q, Q, H, Q, Q] },
  { meter: [6, 8], durations: [QD, QD, E, E, E, QD] },
  { meter: [2, 4], durations: [E, E, Q, Q, Q] },
  { meter: [3, 4], durations: [H, Q, Q, H] },
  { meter: [4, 4], durations: [Q, QD, E, Q, H, H] },
  { meter: [6, 8], durations: [QD, E, E, E, QD, QD] },
  { meter: [2, 4], durations: [Q, Q, E, E, Q] },
];

const STD_OPTIONS = [H, QD, Q, E, 240];

const FILL_BAR: FillBarSpec[] = [
  { meter: [4, 4], given: [Q, Q, Q], options: STD_OPTIONS },
  { meter: [3, 4], given: [Q, E, E], options: STD_OPTIONS },
  { meter: [4, 4], given: [H, QD], options: STD_OPTIONS },
  { meter: [6, 8], given: [QD, E, E], options: STD_OPTIONS },
  { meter: [2, 4], given: [E, E, E], options: STD_OPTIONS },
  { meter: [3, 4], given: [H], options: STD_OPTIONS },
  { meter: [4, 4], given: [Q, E, E, E], options: STD_OPTIONS },
  { meter: [6, 8], given: [E, E, E, Q], options: STD_OPTIONS },
  { meter: [3, 4], given: [QD, E], options: STD_OPTIONS },
  { meter: [4, 4], given: [HD], options: STD_OPTIONS },
];

const BARLINES: BarlineSpec[] = [
  { meter: [2, 4], durations: [Q, Q, E, E, Q, H] },
  { meter: [3, 4], durations: [Q, Q, Q, H, Q, QD, E, Q] },
  { meter: [4, 4], durations: [H, Q, Q, W, Q, Q, H] },
  { meter: [6, 8], durations: [QD, QD, E, E, E, QD, Q, E, QD] },
  { meter: [3, 4], durations: [HD, Q, H, H, Q] },
  { meter: [4, 4], durations: [Q, QD, E, Q, H, H, Q, Q, Q, Q] },
];

const CONFLICTS: ConflictSpec[] = [
  {
    meter: [4, 4],
    durations: [E, Q, Q, Q, E, Q, Q, H],
    answer: "sync",
    explain: "הרבעים שבאמצע התיבה הראשונה נופלים בין הפעמות — הטעמה נגד המשקל: סינקופה.",
  },
  {
    meter: [3, 4],
    durations: [H, Q, Q, H],
    ties: [1],
    answer: "hemiola",
    explain: "שלוש חצאיות על פני שתי תיבות של 3/4 — הרגליים סופרות שלוש, המוזיקה מתקבצת בשתיים: המיולה.",
  },
  {
    meter: [6, 8],
    durations: [Q, Q, Q, QD, QD],
    answer: "hemiola",
    explain: "שלושה רבעים בתיבה של 6/8: במקום שתי קבוצות של שלוש שמיניות — שלוש קבוצות של שתיים. המיולה.",
  },
  {
    meter: [4, 4],
    durations: [Q, Q, H, H, Q, Q],
    answer: "none",
    explain: "כל הערכים נופלים על פעמות, והארוכים על החזקות — המקצב יושב על המשקל בשלום.",
  },
  {
    meter: [2, 4],
    durations: [E, Q, E, Q, Q],
    answer: "sync",
    explain: "הרבע שבין שתי השמיניות מוטעם באמצע הפעמה — סינקופה קלאסית בקטן.",
  },
  {
    meter: [3, 4],
    durations: [Q, Q, Q, HD],
    answer: "none",
    explain: "הליכה סדירה על הפעמות ומנוחה על התיבה השנייה — אין שום התנגשות עם המשקל.",
  },
  {
    meter: [4, 4],
    durations: [H, Q, Q, Q, Q, H],
    ties: [2],
    answer: "sync",
    explain: "הצליל שנקשר מעבר לקו התיבה מטשטש את הפעמה הראשונה של התיבה השנייה — סינקופה על קו התיבה.",
  },
  {
    meter: [6, 8],
    durations: [QD, E, E, E, E, E, E, QD],
    answer: "none",
    explain: "החלוקה נשארת בקבוצות של שלוש שמיניות, נאמנה לאופי המורכב של 6/8.",
  },
];

/* ---------------- phrase-group items (public-domain melodies) ---------------- */

const q = (midi: number, key: string): ScoreNote => ({ keys: [key], midi: [midi], duration: "q" });
const bar: ScoreNote = { bar: true, keys: [], midi: [] };

/* Beethoven, Symphony No. 9 - "Ode to Joy" theme (4/4, engraved in C) */
const ODE_L1: ScoreNote[] = [
  q(64, "e/4"), q(64, "e/4"), q(65, "f/4"), q(67, "g/4"), bar,
  q(67, "g/4"), q(65, "f/4"), q(64, "e/4"), q(62, "d/4"), bar,
  q(60, "c/4"), q(60, "c/4"), q(62, "d/4"), q(64, "e/4"), bar,
  { keys: ["e/4"], midi: [64], duration: "q", dots: 1 }, { keys: ["d/4"], midi: [62], duration: "8" },
  { keys: ["d/4"], midi: [62], duration: "h" },
];
const ODE_L2: ScoreNote[] = [
  q(64, "e/4"), q(64, "e/4"), q(65, "f/4"), q(67, "g/4"), bar,
  q(67, "g/4"), q(65, "f/4"), q(64, "e/4"), q(62, "d/4"), bar,
  q(60, "c/4"), q(60, "c/4"), q(62, "d/4"), q(64, "e/4"), bar,
  { keys: ["d/4"], midi: [62], duration: "q", dots: 1 }, { keys: ["c/4"], midi: [60], duration: "8" },
  { keys: ["c/4"], midi: [60], duration: "h" },
];
const odeSeq = (): SeqEvent[] => {
  const durs1 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2];
  const m1 = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];
  const m2 = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60];
  const ev: SeqEvent[] = [];
  let t = 0;
  m1.forEach((m, i) => { ev.push({ midi: m, time: t, dur: durs1[i], idx: i }); t += durs1[i]; });
  m2.forEach((m, i) => { ev.push({ midi: m, time: t, dur: durs1[i] }); t += durs1[i]; });
  return ev;
};

/* "God Save the King" (traditional; 3/4, engraved in C): 6-bar first phrase */
const GSK_L1: ScoreNote[] = [
  q(60, "c/4"), q(60, "c/4"), q(62, "d/4"), bar,
  { keys: ["b/3"], midi: [59], duration: "q", dots: 1 }, { keys: ["c/4"], midi: [60], duration: "8" }, q(62, "d/4"), bar,
  q(64, "e/4"), q(64, "e/4"), q(65, "f/4"), bar,
  { keys: ["e/4"], midi: [64], duration: "q", dots: 1 }, { keys: ["d/4"], midi: [62], duration: "8" }, q(60, "c/4"), bar,
  q(62, "d/4"), q(60, "c/4"), q(59, "b/3"), bar,
  { keys: ["c/4"], midi: [60], duration: "h", dots: 1 },
];
const GSK_L2: ScoreNote[] = [
  q(67, "g/4"), q(67, "g/4"), q(67, "g/4"), bar,
  { keys: ["g/4"], midi: [67], duration: "q", dots: 1 }, { keys: ["f/4"], midi: [65], duration: "8" }, q(64, "e/4"), bar,
  q(65, "f/4"), q(65, "f/4"), q(65, "f/4"), bar,
  { keys: ["f/4"], midi: [65], duration: "q", dots: 1 }, { keys: ["e/4"], midi: [64], duration: "8" }, q(62, "d/4"),
];
const gskSeq = (): SeqEvent[] => {
  const rows: [number, number][] = [
    [60, 1], [60, 1], [62, 1],
    [59, 1.5], [60, 0.5], [62, 1],
    [64, 1], [64, 1], [65, 1],
    [64, 1.5], [62, 0.5], [60, 1],
    [62, 1], [60, 1], [59, 1],
    [60, 3],
    [67, 1], [67, 1], [67, 1],
    [67, 1.5], [65, 0.5], [64, 1],
    [65, 1], [65, 1], [65, 1],
    [65, 1.5], [64, 0.5], [62, 1],
  ];
  const ev: SeqEvent[] = [];
  let t = 0;
  rows.forEach(([m, d], i) => { ev.push({ midi: m, time: t, dur: d * 0.97, idx: i }); t += d; });
  return ev;
};

/* Haydn, Symphony No. 94 ("Surprise"), II - theme (2/4, engraved in C) */
const e8 = (midi: number, key: string, beam: string): ScoreNote => ({ keys: [key], midi: [midi], duration: "8", beam });
const HAYDN_LINE: ScoreNote[] = [
  e8(60, "c/4", "a1"), e8(60, "c/4", "a1"), e8(64, "e/4", "a2"), e8(64, "e/4", "a2"), bar,
  e8(67, "g/4", "a3"), e8(67, "g/4", "a3"), q(64, "e/4"), bar,
  e8(65, "f/4", "a4"), e8(65, "f/4", "a4"), e8(62, "d/4", "a5"), e8(62, "d/4", "a5"), bar,
  e8(59, "b/3", "a6"), e8(59, "b/3", "a6"), q(55, "g/3"),
];
const HAYDN_LINE2: ScoreNote[] = HAYDN_LINE.map((n) =>
  n.beam ? { ...n, beam: "b" + n.beam } : { ...n }
);
const haydnSeq = (): SeqEvent[] => {
  const rows: [number, number][] = [
    [60, 0.5], [60, 0.5], [64, 0.5], [64, 0.5],
    [67, 0.5], [67, 0.5], [64, 1],
    [65, 0.5], [65, 0.5], [62, 0.5], [62, 0.5],
    [59, 0.5], [59, 0.5], [55, 1],
  ];
  const ev: SeqEvent[] = [];
  let t = 0;
  for (let rep = 0; rep < 2; rep++) {
    rows.forEach(([m, d], i) => {
      ev.push({ midi: m, time: t, dur: d * 0.95, idx: rep === 0 ? i : undefined, vel: rep === 0 ? 0.8 : 0.5 });
      t += d;
    });
  }
  return ev;
};

const PHRASES: PhraseSpec[] = [
  {
    title: "בטהובן — נושא «הימנון השמחה» מהסימפוניה התשיעית",
    meter: [4, 4],
    lines: [ODE_L1, ODE_L2],
    seq: odeSeq(),
    phrase1Len: 4,
    lenOptions: [2, 3, 4, 6],
    startsSame: true,
  },
  {
    title: "«God Save the King» — לחן עממי",
    meter: [3, 4],
    lines: [GSK_L1, GSK_L2],
    seq: gskSeq(),
    phrase1Len: 6,
    lenOptions: [4, 5, 6, 8],
    startsSame: false,
  },
  {
    title: "היידן — נושא הפרק האיטי מסימפוניית «ההפתעה»",
    meter: [2, 4],
    lines: [HAYDN_LINE, HAYDN_LINE2],
    seq: haydnSeq(),
    phrase1Len: 4,
    lenOptions: [2, 3, 4, 6],
    startsSame: true,
  },
];

/* ========================================================================= */

type Ex = {
  id: string;
  title: string;
  instructions: string;
  count: number;
  render: (item: number, solved: boolean, markSolved: () => void) => React.ReactNode;
};

const EXERCISES: Ex[] = [
  {
    id: "meter-id",
    title: "א · זיהוי המשקל",
    instructions:
      "מקצב כתוב בלי משקל וקווי תיבה. האזינו למטרונום — הפעמה החזקה מודגשת — הביטו בקיבוצי הערכים, וקבעו את המשקל.",
    count: METER_ID.length,
    render: (i, solved, mark) => <MeterIdItem spec={METER_ID[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "fill-bar",
    title: "ב · השלמת התיבה",
    instructions:
      "בכל תיבה חסר הערך האחרון. חשבו כמה משך נותר עד סוף התיבה ובחרו את ערך המשך המתאים.",
    count: FILL_BAR.length,
    render: (i, solved, mark) => <FillBarItem spec={FILL_BAR[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "barlines",
    title: "ג · הצבת קווי תיבה",
    instructions:
      "רצף ערכים נתון עם משקל אך ללא קווי תיבה. סמנו היכן עוברים הקווים — לחיצה על נקודה בין שני ערכים מוסיפה או מסירה קו, והתווים מתעדכנים.",
    count: BARLINES.length,
    render: (i, solved, mark) => <BarlineItem spec={BARLINES[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "conflicts",
    title: "ד · מקצב מול משקל: סינקופה והמיולה",
    instructions:
      "כמו בקטעי הספרות של ספר העבודה: לא כל מקצב יושב בשלום על המשקל שלו. האזינו מול המטרונום והכריעו — סינקופה, המיולה, או לא זה ולא זה.",
    count: CONFLICTS.length,
    render: (i, solved, mark) => <ConflictItem spec={CONFLICTS[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "phrases",
    title: "ה · קיבוץ פראזות",
    instructions:
      "נושאים מן הרפרטואר. האזינו וקראו, מצאו את נקודת המנוחה שסוגרת את הפראזה הראשונה, וספרו תיבות. זכרו את אזהרת הספר: פראזה אינה חייבת להיות בת 4 או 8 תיבות.",
    count: PHRASES.length,
    render: (i, solved, mark) => <PhraseItem spec={PHRASES[i]} solved={solved} markSolved={mark} />,
  },
];

export function Workbook03() {
  const { progress, mark } = useWbProgress("03");
  const [openId, setOpenId] = useState<string | null>(EXERCISES[0].id);

  const total = EXERCISES.reduce((n, e) => n + e.count, 0);
  const solved = EXERCISES.reduce((n, e) => n + (progress[e.id] ?? []).filter(Boolean).length, 0);

  return (
    <div className="workbook">
      <WorkbookHero
        unitNum={3}
        unitId="03"
        title="מקצב ומשקל — תרגול"
        lede={
          <>
            חמישה תרגילים בזמן: זיהוי משקל בהאזנה, השלמת תיבות, הצבת קווי תיבה, סינקופה והמיולה מול
            מטרונום — וקיבוץ פראזות בנושאים מן הרפרטואר. עד כה נפתרו {solved} מתוך {total} פריטים.
          </>
        }
      />
      {EXERCISES.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exId={ex.id}
          title={ex.title}
          instructions={ex.instructions}
          count={ex.count}
          done={progress[ex.id] ?? Array.from({ length: ex.count }, () => false)}
          open={openId === ex.id}
          onToggle={() => setOpenId((cur) => (cur === ex.id ? null : ex.id))}
          markSolved={(i) => mark(ex.id, i, ex.count)}
        >
          {ex.render}
        </ExerciseCard>
      ))}
    </div>
  );
}
