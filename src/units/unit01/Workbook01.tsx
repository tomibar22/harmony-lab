import { useState } from "react";
import { ExerciseCard, useWbProgress } from "../../workbook/exercise";
import {
  PitchWriteItem,
  PitchWriteSpec,
  ScaleWriteItem,
  ScaleWriteSpec,
  SigIdItem,
  SigIdSpec,
  SigWriteItem,
  SigWriteSpec,
  WorkbookHero,
} from "../../workbook/items";

/* =========================================================================
 * Exercise data - original items in the spirit of the source workbook's
 * Unit 1 (scales, degrees, signatures, in major and in the minor forms).
 * ========================================================================= */

const SCALES_MAJOR: ScaleWriteSpec[] = [
  { clef: "treble", tonicHe: "רה", mode: "major", givenDegree: 5, tonicOctave: 4 },
  { clef: "bass", tonicHe: "סי♭", mode: "major", givenDegree: 3, tonicOctave: 2 },
  { clef: "treble", tonicHe: "לה", mode: "major", givenDegree: 7, tonicOctave: 4 },
  { clef: "bass", tonicHe: "מי♭", mode: "major", givenDegree: 6, tonicOctave: 2 },
  { clef: "treble", tonicHe: "מי", mode: "major", givenDegree: 2, tonicOctave: 4 },
  { clef: "bass", tonicHe: "פה", mode: "major", givenDegree: 4, tonicOctave: 2 },
  { clef: "treble", tonicHe: "רה♭", mode: "major", givenDegree: 1, tonicOctave: 4 },
  { clef: "bass", tonicHe: "סול", mode: "major", givenDegree: 6, tonicOctave: 2 },
];

const PITCHES_MAJOR: PitchWriteSpec[] = [
  { clef: "treble", tonicHe: "מי", mode: "major", degree: 3 },
  { clef: "bass", tonicHe: "פה", mode: "major", degree: 7 },
  { clef: "treble", tonicHe: "לה♭", mode: "major", degree: 4 },
  { clef: "bass", tonicHe: "רה", mode: "major", degree: 7 },
  { clef: "treble", tonicHe: "סול♭", mode: "major", degree: 5 },
  { clef: "bass", tonicHe: "סי", mode: "major", degree: 4 },
  { clef: "treble", tonicHe: "סי♭", mode: "major", degree: 2 },
  { clef: "bass", tonicHe: "דו♯", mode: "major", degree: 6 },
  { clef: "treble", tonicHe: "מי♭", mode: "major", degree: 3 },
  { clef: "bass", tonicHe: "לה", mode: "major", degree: 2 },
];

const SIG_ID_MAJOR: SigIdSpec[] = [
  { clef: "treble", sharps: 1, mode: "major", degree: 3 },
  { clef: "bass", sharps: -3, mode: "major", degree: 6 },
  { clef: "treble", sharps: 4, mode: "major", degree: 7 },
  { clef: "bass", sharps: -1, mode: "major", degree: 2 },
  { clef: "treble", sharps: 2, mode: "major", degree: 5 },
  { clef: "bass", sharps: -5, mode: "major", degree: 4 },
  { clef: "treble", sharps: 6, mode: "major", degree: 1 },
  { clef: "bass", sharps: -2, mode: "major", degree: 6 },
];

const SIG_WRITE_MAJOR: SigWriteSpec[] = [
  { clef: "treble", sharps: 3, mode: "major", degree: 1 },
  { clef: "bass", sharps: -2, mode: "major", degree: 5 },
  { clef: "treble", sharps: 5, mode: "major", degree: 7 },
  { clef: "bass", sharps: -4, mode: "major", degree: 3 },
  { clef: "treble", sharps: 2, mode: "major", degree: 2 },
  { clef: "bass", sharps: -6, mode: "major", degree: 4 },
  { clef: "treble", sharps: 4, mode: "major", degree: 6 },
  { clef: "bass", sharps: -1, mode: "major", degree: 7 },
];

const SCALES_MINOR: ScaleWriteSpec[] = [
  { clef: "treble", tonicHe: "לה", mode: "minor", form: "natural", givenDegree: 3, tonicOctave: 4 },
  { clef: "bass", tonicHe: "מי", mode: "minor", form: "harmonic", givenDegree: 5, tonicOctave: 2 },
  { clef: "treble", tonicHe: "רה", mode: "minor", form: "melodic", givenDegree: 6, tonicOctave: 4 },
  { clef: "bass", tonicHe: "סול", mode: "minor", form: "natural", givenDegree: 7, tonicOctave: 2 },
  { clef: "treble", tonicHe: "דו♯", mode: "minor", form: "harmonic", givenDegree: 1, tonicOctave: 4 },
  { clef: "bass", tonicHe: "פה", mode: "minor", form: "melodic", givenDegree: 2, tonicOctave: 2 },
  { clef: "treble", tonicHe: "סי", mode: "minor", form: "natural", givenDegree: 4, tonicOctave: 3 },
  { clef: "bass", tonicHe: "דו", mode: "minor", form: "harmonic", givenDegree: 3, tonicOctave: 3 },
];

const PITCHES_MINOR: PitchWriteSpec[] = [
  { clef: "treble", tonicHe: "סול♯", mode: "minor", degree: 5 },
  { clef: "bass", tonicHe: "דו♯", mode: "minor", degree: 7, form: "natural" },
  { clef: "treble", tonicHe: "פה♯", mode: "minor", degree: 2 },
  { clef: "bass", tonicHe: "סי♭", mode: "minor", degree: 4 },
  { clef: "treble", tonicHe: "פה", mode: "minor", degree: 5 },
  { clef: "bass", tonicHe: "לה♭", mode: "minor", degree: 2 },
  { clef: "treble", tonicHe: "דו", mode: "minor", degree: 6, form: "melodic" },
  { clef: "bass", tonicHe: "מי", mode: "minor", degree: 7, form: "harmonic" },
  { clef: "treble", tonicHe: "סול", mode: "minor", degree: 3 },
  { clef: "bass", tonicHe: "רה♯", mode: "minor", degree: 6, form: "natural" },
];

const SIG_ID_MINOR: SigIdSpec[] = [
  { clef: "treble", sharps: 0, mode: "minor", degree: 7 },
  { clef: "bass", sharps: 2, mode: "minor", degree: 3 },
  { clef: "treble", sharps: -4, mode: "minor", degree: 4 },
  { clef: "bass", sharps: 3, mode: "minor", degree: 5 },
  { clef: "treble", sharps: -1, mode: "minor", degree: 6 },
  { clef: "bass", sharps: 5, mode: "minor", degree: 2 },
  { clef: "treble", sharps: -6, mode: "minor", degree: 3 },
  { clef: "bass", sharps: 1, mode: "minor", degree: 7 },
];

const SIG_WRITE_MINOR: SigWriteSpec[] = [
  { clef: "treble", sharps: 2, mode: "minor", degree: 1 },
  { clef: "bass", sharps: -1, mode: "minor", degree: 5 },
  { clef: "treble", sharps: 4, mode: "minor", degree: 4 },
  { clef: "bass", sharps: -3, mode: "minor", degree: 3 },
  { clef: "treble", sharps: 1, mode: "minor", degree: 6 },
  { clef: "bass", sharps: -5, mode: "minor", degree: 7 },
  { clef: "treble", sharps: 3, mode: "minor", degree: 2 },
  { clef: "bass", sharps: -2, mode: "minor", degree: 4 },
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
    id: "maj-scale",
    title: "א · כתיבת סולם מז'ורי",
    instructions:
      "נתון צליל אחד ודרגתו בסולם מז'ורי. מצאו את הטוניקה וכתבו את הסולם המלא על החמשה — כולל כל סימני ההיתק הדרושים. אין סימן היתק בתחילת החמשה, אז כל היתק נכתב ליד התו עצמו.",
    count: SCALES_MAJOR.length,
    render: (i, solved, mark) => <ScaleWriteItem spec={SCALES_MAJOR[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "maj-pitch",
    title: "ב · צליל מתוך סולם ודרגה — מז'ור",
    instructions: "נתונים סולם מז'ורי ומספר דרגה. כתבו על החמשה את הצליל הנכון, באוקטבה כלשהי.",
    count: PITCHES_MAJOR.length,
    render: (i, solved, mark) => <PitchWriteItem spec={PITCHES_MAJOR[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "maj-sig-id",
    title: "ג · זיהוי: סימן היתק וצליל — מז'ור",
    instructions:
      "נתונים סימן היתק מז'ורי וצליל מתוך הסולם. קבעו איזה סולם זה, ומה שם הדרגה של הצליל הנתון.",
    count: SIG_ID_MAJOR.length,
    render: (i, solved, mark) => <SigIdItem spec={SIG_ID_MAJOR[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "maj-sig-write",
    title: "ד · כתיבת סימן היתק — מז'ור",
    instructions:
      "נתונים צליל ושם הדרגה שלו בסולם מז'ורי. מצאו את הסולם ובחרו את סימן ההיתק המתאים — התצוגה המקדימה מראה את הבחירה על חמשה.",
    count: SIG_WRITE_MAJOR.length,
    render: (i, solved, mark) => <SigWriteItem spec={SIG_WRITE_MAJOR[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "min-scale",
    title: "ה · כתיבת סולם מינורי",
    instructions:
      "נתון צליל אחד, דרגתו, וצורת המינור המבוקשת: טבעי, הרמוני או מלודי בעלייה. כתבו את הסולם המלא עם כל סימני ההיתק.",
    count: SCALES_MINOR.length,
    render: (i, solved, mark) => <ScaleWriteItem spec={SCALES_MINOR[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "min-pitch",
    title: "ו · צליל מתוך סולם ודרגה — מינור",
    instructions:
      "נתונים סולם מינורי ומספר דרגה (ולעיתים צורת מינור). כתבו את הצליל הנכון. כשלא מצוינת צורה — הכוונה למינור הטבעי.",
    count: PITCHES_MINOR.length,
    render: (i, solved, mark) => <PitchWriteItem spec={PITCHES_MINOR[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "min-sig-id",
    title: "ז · זיהוי: סימן היתק וצליל — מינור",
    instructions:
      "כמו תרגיל ג, אבל הסולם מינורי. שימו לב: הדרגה השביעית הדיאטונית (ללא הגבהה) נקראת סוּבּטוניקה, לא צליל מוביל.",
    count: SIG_ID_MINOR.length,
    render: (i, solved, mark) => <SigIdItem spec={SIG_ID_MINOR[i]} solved={solved} markSolved={mark} />,
  },
  {
    id: "min-sig-write",
    title: "ח · כתיבת סימן היתק — מינור",
    instructions: "נתונים צליל ושם דרגתו בסולם מינורי. מצאו את הסולם ובחרו את סימן ההיתק שלו.",
    count: SIG_WRITE_MINOR.length,
    render: (i, solved, mark) => <SigWriteItem spec={SIG_WRITE_MINOR[i]} solved={solved} markSolved={mark} />,
  },
];

export function Workbook01() {
  const { progress, mark } = useWbProgress("01");
  const [openId, setOpenId] = useState<string | null>(EXERCISES[0].id);

  const total = EXERCISES.reduce((n, e) => n + e.count, 0);
  const solved = EXERCISES.reduce((n, e) => n + (progress[e.id] ?? []).filter(Boolean).length, 0);

  return (
    <div className="workbook">
      <WorkbookHero
        unitNum={1}
        unitId="01"
        title="סולמות, דרגות ומודוסים — תרגול"
        lede={
          <>
            שמונה תרגילים בכתיב סולמות, זיהוי דרגות וסימני היתק — במז'ור ובשלוש צורות המינור. כל
            תשובה נבדקת מיד, וכל מה שנכתב גם נשמע. עד כה נפתרו {solved} מתוך {total} פריטים.
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
