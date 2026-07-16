import { useState } from "react";
import { ExerciseCard, useWbProgress } from "../../workbook/exercise";
import {
  IntervalIdItem,
  IntervalIdSpec,
  IntervalWriteItem,
  IntervalWriteSpec,
  InversionItem,
  InversionSpec,
  TransposeItem,
  TransposeSpec,
  WorkbookHero,
} from "../../workbook/items";
import { SpelledPitch } from "../../workbook/pitch";

/** letter: 0=C 1=D 2=E 3=F 4=G 5=A 6=B */
const P = (letter: number, alter: number, octave: number): SpelledPitch => ({ letter, alter, octave });

/* =========================================================================
 * Exercise data - original items in the spirit of the source workbook's
 * Unit 2 (interval construction, identification, inversion, transposition).
 * ========================================================================= */

const IV_ID: IntervalIdSpec[] = [
  { clef: "treble", low: P(0, 0, 4), high: P(2, 0, 4) },   // C–E: טרצה גדולה
  { clef: "treble", low: P(1, 0, 4), high: P(0, 0, 5) },   // D–C: ספטימה קטנה
  { clef: "treble", low: P(2, 0, 4), high: P(6, -1, 4) },  // E–B♭: קווינטה מוקטנת
  { clef: "bass", low: P(3, 0, 3), high: P(6, 0, 3) },     // F–B: קוורטה מוגדלת
  { clef: "treble", low: P(0, 0, 4), high: P(1, 1, 4) },   // C–D♯: סקונדה מוגדלת
  { clef: "bass", low: P(6, -1, 2), high: P(4, -1, 3) },   // B♭–G♭: סקסטה קטנה
  { clef: "bass", low: P(4, 0, 2), high: P(2, 0, 3) },     // G–E: סקסטה גדולה
  { clef: "treble", low: P(0, 1, 4), high: P(6, -1, 4) },  // C♯–B♭: ספטימה מוקטנת
  { clef: "bass", low: P(5, -1, 2), high: P(4, 0, 3) },    // A♭–G: ספטימה גדולה
  { clef: "treble", low: P(4, 0, 4), high: P(0, 0, 5) },   // G–C: קוורטה זכה
  { clef: "treble", low: P(2, 0, 4), high: P(4, 0, 5) },   // E–G′: דצימה קטנה
  { clef: "bass", low: P(0, 0, 3), high: P(5, 1, 3) },     // C–A♯: סקסטה מוגדלת
];

const IV_UP: IntervalWriteSpec[] = [
  { clef: "treble", base: P(2, 0, 4), size: 3, quality: "minor", direction: 1 },   // מעל מי: סול
  { clef: "bass", base: P(6, -1, 2), size: 6, quality: "major", direction: 1 },    // מעל סי♭: סול
  { clef: "treble", base: P(3, 1, 4), size: 4, quality: "perfect", direction: 1 }, // מעל פה♯: סי
  { clef: "treble", base: P(1, 0, 4), size: 7, quality: "dim", direction: 1 },     // מעל רה: דו♭
  { clef: "bass", base: P(5, 0, 2), size: 2, quality: "aug", direction: 1 },       // מעל לה: סי♯
  { clef: "treble", base: P(2, -1, 4), size: 5, quality: "perfect", direction: 1 },// מעל מי♭: סי♭
  { clef: "bass", base: P(4, 0, 3), size: 3, quality: "major", direction: 1 },     // מעל סול: סי
  { clef: "treble", base: P(0, 1, 4), size: 6, quality: "minor", direction: 1 },   // מעל דו♯: לה
  { clef: "treble", base: P(3, 0, 4), size: 4, quality: "aug", direction: 1 },     // מעל פה: סי
  { clef: "bass", base: P(6, 0, 2), size: 7, quality: "minor", direction: 1 },     // מעל סי: לה
];

const IV_DOWN: IntervalWriteSpec[] = [
  { clef: "treble", base: P(0, 0, 5), size: 5, quality: "perfect", direction: -1 }, // מתחת לדו: פה
  { clef: "treble", base: P(4, 0, 4), size: 6, quality: "minor", direction: -1 },   // מתחת לסול: סי
  { clef: "treble", base: P(2, 0, 4), size: 3, quality: "major", direction: -1 },   // מתחת למי: דו
  { clef: "bass", base: P(6, -1, 3), size: 4, quality: "perfect", direction: -1 },  // מתחת לסי♭: פה
  { clef: "treble", base: P(3, 1, 4), size: 7, quality: "minor", direction: -1 },   // מתחת לפה♯: סול♯
  { clef: "bass", base: P(5, 0, 3), size: 2, quality: "major", direction: -1 },     // מתחת ללה: סול
  { clef: "treble", base: P(1, 0, 4), size: 5, quality: "dim", direction: -1 },     // מתחת לרה: סול♯
  { clef: "bass", base: P(0, 0, 4), size: 3, quality: "minor", direction: -1 },     // מתחת לדו: לה
];

const INVERSIONS: InversionSpec[] = [
  { size: 3, quality: "minor" },
  { size: 5, quality: "perfect" },
  { size: 2, quality: "major" },
  { size: 4, quality: "aug" },
  { size: 7, quality: "dim" },
  { size: 6, quality: "minor" },
  { size: 8, quality: "perfect" },
  { size: 2, quality: "minor" },
  { size: 5, quality: "dim" },
  { size: 3, quality: "major" },
];

const TRANSPOSE: TransposeSpec[] = [
  {
    clef: "treble",
    sourceKeyHe: "רה",
    targetKeyHe: "פה",
    melody: [P(1, 0, 4), P(3, 1, 4), P(5, 0, 4), P(4, 0, 4), P(2, 0, 4), P(3, 1, 4), P(1, 0, 4)],
    size: 3,
    quality: "minor",
    direction: 1,
  },
  {
    clef: "treble",
    sourceKeyHe: "סול",
    targetKeyHe: "מי",
    melody: [P(4, 0, 4), P(6, 0, 4), P(5, 0, 4), P(1, 0, 5), P(0, 0, 5), P(5, 0, 4), P(4, 0, 4)],
    size: 3,
    quality: "minor",
    direction: -1,
  },
  {
    clef: "bass",
    sourceKeyHe: "פה",
    targetKeyHe: "סול",
    melody: [P(3, 0, 3), P(5, 0, 3), P(6, -1, 3), P(0, 0, 4), P(5, 0, 3), P(4, 0, 3), P(3, 0, 3)],
    size: 2,
    quality: "major",
    direction: 1,
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
    id: "iv-id",
    title: "א · זיהוי מרווחים",
    instructions:
      "לכל מרווח קבעו גודל (פרימה עד דצימה) ואיכות (זכה, גדולה, קטנה, מוגדלת, מוקטנת). האיות קובע: דו–רה♯ ודו–מי♭ נשמעים זהה אבל הם מרווחים שונים.",
    count: IV_ID.length,
    render: (i, solved, mark) => <IntervalIdItem spec={IV_ID[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "iv-up",
    title: "ב · כתיבת מרווח מעל צליל נתון",
    instructions:
      "כתבו את המרווח המבוקש מעל הצליל הנתון (האפור). ספרו קודם את שמות הצלילים — הגודל — ורק אחר כך כווננו את האיכות עם סימן היתק.",
    count: IV_UP.length,
    render: (i, solved, mark) => <IntervalWriteItem spec={IV_UP[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "iv-down",
    title: "ג · כתיבת מרווח מתחת לצליל נתון",
    instructions:
      "עכשיו כלפי מטה: הצליל הנתון הוא העליון, וכותבים את התחתון. זה הכיוון שמתבלבלים בו — קחו את הזמן.",
    count: IV_DOWN.length,
    render: (i, solved, mark) => <IntervalWriteItem spec={IV_DOWN[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "iv-inv",
    title: "ד · היפוכי מרווחים",
    instructions:
      "חוק ה־9: מספרי מרווח והיפוכו משלימים ל־9, והאיכות מתהפכת — גדולה ↔ קטנה, מוגדלת ↔ מוקטנת, וזכה נשארת זכה.",
    count: INVERSIONS.length,
    render: (i, solved, mark) => <InversionItem spec={INVERSIONS[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "transpose",
    title: "ה · טרנספוזיציה",
    instructions:
      "העבירו את המנגינה לסולם החדש. אפשר לחשוב בשתי דרכים — לפי דרגות (הצליל החמישי בסולם נשאר הצליל החמישי) או לפי מרווח קבוע מכל צליל — וכדאי לפתור באחת ולבדוק בשנייה.",
    count: TRANSPOSE.length,
    render: (i, solved, mark) => <TransposeItem spec={TRANSPOSE[i]} solved={solved} markSolved={mark} />,
  },
];

export function Workbook02() {
  const { progress, mark } = useWbProgress("02");
  const [openId, setOpenId] = useState<string | null>(EXERCISES[0].id);

  const total = EXERCISES.reduce((n, e) => n + e.count, 0);
  const solved = EXERCISES.reduce((n, e) => n + (progress[e.id] ?? []).filter(Boolean).length, 0);

  return (
    <div className="workbook">
      <WorkbookHero
        unitNum={2}
        unitId="02"
        title="מרווחים — תרגול"
        lede={
          <>
            חמישה תרגילים במרווחים: זיהוי, בנייה מעל ומתחת לצליל נתון, היפוכים לפי חוק ה־9,
            וטרנספוזיציה של מנגינה שלמה. עד כה נפתרו {solved} מתוך {total} פריטים.
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
