import { useState } from "react";
import { Fig } from "../../components/ui";
import { ChordBuildItem, ChordIdItem, KeyFromChordItem } from "../../workbook/chords";
import { ExerciseCard, useWbProgress } from "../../workbook/exercise";
import { Clef, WorkbookHero } from "../../workbook/items";
import {
  SEVENTH_QUALITY_HE,
  SeventhQuality,
  SpelledPitch,
  TRIAD_QUALITY_HE,
  TriadQuality,
  applyInterval,
  diatonicTriad,
  figureOf,
  findKey,
  invertChord,
  nameHeOf,
  numeralOf,
  seventhPitches,
  triadPitches,
} from "../../workbook/pitch";

/** letter: 0=C 1=D 2=E 3=F 4=G 5=A 6=B */
const P = (letter: number, alter: number, octave: number): SpelledPitch => ({ letter, alter, octave });

const TRIAD_Q_OPTIONS = (Object.keys(TRIAD_QUALITY_HE) as TriadQuality[]).map((q) => ({
  value: q as string,
  label: TRIAD_QUALITY_HE[q],
}));
const SEVENTH_Q_OPTIONS = (Object.keys(SEVENTH_QUALITY_HE) as SeventhQuality[]).map((q) => ({
  value: q as string,
  label: SEVENTH_QUALITY_HE[q],
}));

const MEMBER_HE = ["היסוד", "הטרצה", "הקווינטה", "הספטימה"] as const;

/* =========================================================================
 * Exercise data - original items in the spirit of the source workbook's
 * Unit 4 (triads and seventh chords: building, inversions, identification).
 * ========================================================================= */

/* א · root-position triads from a given member */
type TriadBuild = { clef: Clef; root: SpelledPitch; quality: TriadQuality; givenIndex: number };
const BUILD_TRIADS: TriadBuild[] = [
  { clef: "treble", root: P(0, 0, 4), quality: "M", givenIndex: 0 },
  { clef: "bass", root: P(5, 0, 2), quality: "m", givenIndex: 0 },
  { clef: "treble", root: P(3, 1, 4), quality: "d", givenIndex: 0 },
  { clef: "treble", root: P(2, -1, 4), quality: "A", givenIndex: 0 },
  { clef: "treble", root: P(4, 0, 4), quality: "M", givenIndex: 2 },
  { clef: "bass", root: P(3, 0, 3), quality: "m", givenIndex: 2 },
  { clef: "treble", root: P(0, 1, 4), quality: "m", givenIndex: 1 },
  { clef: "treble", root: P(1, -1, 4), quality: "m", givenIndex: 0 },
  { clef: "bass", root: P(0, 1, 3), quality: "d", givenIndex: 2 },
  { clef: "treble", root: P(1, -1, 4), quality: "A", givenIndex: 1 },
];

/* ב · identify triads: root, quality, inversion */
type TriadId = { clef: Clef; root: SpelledPitch; quality: TriadQuality; inv: number; bassOct: number };
const ID_TRIADS: TriadId[] = [
  { clef: "treble", root: P(0, 0, 4), quality: "M", inv: 1, bassOct: 4 },
  { clef: "bass", root: P(3, 1, 3), quality: "d", inv: 0, bassOct: 3 },
  { clef: "treble", root: P(6, -1, 4), quality: "M", inv: 2, bassOct: 4 },
  { clef: "treble", root: P(5, 0, 4), quality: "m", inv: 1, bassOct: 4 },
  { clef: "bass", root: P(2, -1, 3), quality: "A", inv: 0, bassOct: 3 },
  { clef: "treble", root: P(1, 0, 5), quality: "m", inv: 2, bassOct: 4 },
  { clef: "bass", root: P(4, 0, 3), quality: "M", inv: 1, bassOct: 2 },
  { clef: "treble", root: P(0, 1, 5), quality: "d", inv: 2, bassOct: 4 },
];

/* ג · build triads in inversion from a given bass */
type InvBuild = { clef: Clef; root: SpelledPitch; quality: TriadQuality; inv: number; bassOct: number };
const BUILD_INV: InvBuild[] = [
  { clef: "treble", root: P(0, 0, 5), quality: "M", inv: 2, bassOct: 4 },
  { clef: "bass", root: P(0, 0, 4), quality: "m", inv: 1, bassOct: 3 },
  { clef: "treble", root: P(6, 0, 4), quality: "d", inv: 1, bassOct: 4 },
  { clef: "bass", root: P(5, 0, 3), quality: "M", inv: 1, bassOct: 3 },
  { clef: "treble", root: P(3, 0, 4), quality: "m", inv: 2, bassOct: 4 },
  { clef: "bass", root: P(3, 0, 2), quality: "A", inv: 0, bassOct: 2 },
  { clef: "treble", root: P(2, 0, 4), quality: "M", inv: 0, bassOct: 4 },
  { clef: "bass", root: P(4, 1, 3), quality: "d", inv: 2, bassOct: 3 },
];

/* ד · triads from key + roman numeral + figure */
type KeyRn = {
  clef: Clef;
  keyHe: string;
  mode: "major" | "minor";
  form?: "natural" | "harmonic";
  degree: number;
  inv: number;
  bassOct: number;
};
const KEY_RN: KeyRn[] = [
  { clef: "bass", keyHe: "רה♭", mode: "major", degree: 2, inv: 1, bassOct: 3 },
  { clef: "treble", keyHe: "לה", mode: "major", degree: 5, inv: 0, bassOct: 4 },
  { clef: "bass", keyHe: "מי♭", mode: "major", degree: 7, inv: 1, bassOct: 3 },
  { clef: "treble", keyHe: "מי", mode: "major", degree: 4, inv: 2, bassOct: 4 },
  { clef: "treble", keyHe: "סי", mode: "minor", form: "natural", degree: 3, inv: 0, bassOct: 4 },
  { clef: "bass", keyHe: "פה", mode: "major", degree: 6, inv: 0, bassOct: 3 },
  { clef: "bass", keyHe: "דו♯", mode: "minor", form: "harmonic", degree: 5, inv: 0, bassOct: 3 },
  { clef: "treble", keyHe: "סול", mode: "major", degree: 2, inv: 1, bassOct: 4 },
];

/* ה · seventh chords by quality, root given */
type SeventhBuild = { clef: Clef; root: SpelledPitch; quality: SeventhQuality };
const BUILD_7TH: SeventhBuild[] = [
  { clef: "bass", root: P(4, 0, 2), quality: "X7" },
  { clef: "treble", root: P(3, 0, 4), quality: "M7" },
  { clef: "treble", root: P(1, 0, 4), quality: "m7" },
  { clef: "treble", root: P(6, 0, 3), quality: "hd7" },
  { clef: "treble", root: P(0, 1, 4), quality: "d7" },
  { clef: "bass", root: P(2, -1, 3), quality: "M7" },
  { clef: "bass", root: P(5, 0, 2), quality: "m7" },
  { clef: "bass", root: P(3, 1, 2), quality: "hd7" },
];

/* ו · identify seventh chords: root, quality, figure */
type SeventhId = { clef: Clef; root: SpelledPitch; quality: SeventhQuality; inv: number; bassOct: number };
const ID_7TH: SeventhId[] = [
  { clef: "treble", root: P(4, 0, 4), quality: "X7", inv: 0, bassOct: 4 },
  { clef: "bass", root: P(1, 0, 3), quality: "m7", inv: 1, bassOct: 3 },
  { clef: "treble", root: P(6, 0, 4), quality: "hd7", inv: 2, bassOct: 4 },
  { clef: "bass", root: P(0, 1, 3), quality: "d7", inv: 3, bassOct: 2 },
  { clef: "treble", root: P(3, 0, 4), quality: "M7", inv: 0, bassOct: 4 },
  { clef: "bass", root: P(2, 0, 3), quality: "X7", inv: 1, bassOct: 2 },
  { clef: "treble", root: P(5, 0, 4), quality: "m7", inv: 2, bassOct: 4 },
  { clef: "bass", root: P(5, -1, 2), quality: "M7", inv: 3, bassOct: 2 },
];

/* ז · which key does this chord define? */
type KeyFrom = { clef: Clef; root: SpelledPitch; quality: "X7" | "d7"; bassOct: number };
const KEY_FROM: KeyFrom[] = [
  { clef: "bass", root: P(6, -1, 2), quality: "X7", bassOct: 2 },
  { clef: "treble", root: P(5, 0, 3), quality: "X7", bassOct: 3 },
  { clef: "bass", root: P(3, 1, 2), quality: "X7", bassOct: 2 },
  { clef: "treble", root: P(2, -1, 4), quality: "X7", bassOct: 4 },
  { clef: "bass", root: P(4, 1, 2), quality: "d7", bassOct: 2 },
  { clef: "treble", root: P(0, 1, 4), quality: "d7", bassOct: 4 },
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
    id: "triad-build",
    title: "א · בניית משולשים במצב יסודי",
    instructions:
      "נתון צליל אחד — לפעמים היסוד, לפעמים הטרצה או הקווינטה — ואיכות. השלימו את המשולש במצב יסודי, צליל־צליל מהנמוך לגבוה. בפתרון נכון האקורד מתנגן במלואו.",
    count: BUILD_TRIADS.length,
    render: (i, solved, mark) => {
      const s = BUILD_TRIADS[i];
      return (
        <ChordBuildItem
          clef={s.clef}
          expected={triadPitches(s.root, s.quality)}
          givenIndex={s.givenIndex}
          prompt={
            <>
              הצליל הנתון הוא <b>{MEMBER_HE[s.givenIndex]}</b> של משולש{" "}
              <b>{TRIAD_QUALITY_HE[s.quality]}</b> במצב יסודי. השלימו את שני הצלילים החסרים.
            </>
          }
          solutionLabel={`משולש ${TRIAD_QUALITY_HE[s.quality]} על ${nameHeOf(s.root)}`}
          solved={solved}
          markSolved={mark}
        />
      );
    },
  },
  {
    id: "triad-id",
    title: "ב · זיהוי משולשים: יסוד, איכות ומצב",
    instructions:
      "האקורד כתוב בצפיפות (close position) באחד משלושת המצבים. מצאו קודם את היסוד — סדרו את הצלילים בטרצות בראש — ואז קבעו איכות ומצב.",
    count: ID_TRIADS.length,
    render: (i, solved, mark) => {
      const s = ID_TRIADS[i];
      return (
        <ChordIdItem
          clef={s.clef}
          pitches={invertChord(triadPitches(s.root, s.quality), s.inv, s.bassOct)}
          rootName={nameHeOf(s.root)}
          qualityOptions={TRIAD_Q_OPTIONS}
          qualityAnswer={s.quality}
          figureOptions={["5/3", "6", "6/4"]}
          figureAnswer={figureOf(3, s.inv)}
          solved={solved}
          markSolved={mark}
        />
      );
    },
  },
  {
    id: "inv-build",
    title: "ג · בנייה מעל בס נתון לפי ספרור",
    instructions:
      "נתון צליל הבס ונדרש מצב מסוים: 5/3 (יסודי), 6 (היפוך ראשון) או 6/4 (היפוך שני). בנו את האקורד בצפיפות מעל הבס.",
    count: BUILD_INV.length,
    render: (i, solved, mark) => {
      const s = BUILD_INV[i];
      return (
        <ChordBuildItem
          clef={s.clef}
          expected={invertChord(triadPitches(s.root, s.quality), s.inv, s.bassOct)}
          givenIndex={0}
          prompt={
            <>
              מעל הבס הנתון, בנו משולש <b>{TRIAD_QUALITY_HE[s.quality]}</b> במצב{" "}
              <b><Fig n={figureOf(3, s.inv)} /></b>.
            </>
          }
          solutionLabel={`משולש ${TRIAD_QUALITY_HE[s.quality]} על ${nameHeOf(s.root)}, מצב ${figureOf(3, s.inv)}`}
          solved={solved}
          markSolved={mark}
        />
      );
    },
  },
  {
    id: "key-rn",
    title: "ד · אקורד מתוך סולם, דרגה וספרור",
    instructions:
      "נתונים סולם, ספרה רומית וספרור. מצאו את צלילי הדרגה בסולם ובנו את האקורד במצב המבוקש, בצפיפות. במינור — שימו לב איזו צורה מתבקשת.",
    count: KEY_RN.length,
    render: (i, solved, mark) => {
      const s = KEY_RN[i];
      const key = findKey(s.keyHe, s.mode);
      const tones = diatonicTriad(key, s.degree, 3, s.form ?? "natural");
      const fig = figureOf(3, s.inv);
      const numeral = numeralOf(key, s.degree, s.form ?? "natural");
      return (
        <ChordBuildItem
          clef={s.clef}
          expected={invertChord(tones, s.inv, s.bassOct)}
          givenIndex={null}
          prompt={
            <>
              בסולם <b>{key.nameHe}</b>
              {s.mode === "minor" && s.form === "harmonic" ? " (הרמוני)" : ""}
              {s.mode === "minor" && s.form === "natural" ? " (טבעי)" : ""}: בנו את{" "}
              <b>
                <span className="rn" dir="ltr">{numeral}</span>
              </b>{" "}
              במצב <b><Fig n={fig} /></b>.
            </>
          }
          solutionLabel={`${numeral} של ${key.nameHe}, מצב ${fig}`}
          solved={solved}
          markSolved={mark}
        />
      );
    },
  },
  {
    id: "seventh-build",
    title: "ה · בניית ספטאקורדים לפי איכות",
    instructions:
      "היסוד נתון. בנו את הספטאקורד המלא במצב יסודי — ארבעה צלילים בטרצות. זכרו: האיכות נקבעת גם מהמשולש וגם מהספטימה.",
    count: BUILD_7TH.length,
    render: (i, solved, mark) => {
      const s = BUILD_7TH[i];
      return (
        <ChordBuildItem
          clef={s.clef}
          expected={seventhPitches(s.root, s.quality)}
          givenIndex={0}
          prompt={
            <>
              על היסוד הנתון, בנו ספטאקורד <b>{SEVENTH_QUALITY_HE[s.quality]}</b> במצב יסודי.
            </>
          }
          solutionLabel={`ספטאקורד ${SEVENTH_QUALITY_HE[s.quality]} על ${nameHeOf(s.root)}`}
          solved={solved}
          markSolved={mark}
        />
      );
    },
  },
  {
    id: "seventh-id",
    title: "ו · זיהוי ספטאקורדים: יסוד, איכות וספרור",
    instructions:
      "ארבעה צלילים, ארבעה מצבים אפשריים: 7, ‏6/5, ‏4/3 ו־4/2. מצאו את היסוד, קבעו את האיכות ואת הספרור.",
    count: ID_7TH.length,
    render: (i, solved, mark) => {
      const s = ID_7TH[i];
      return (
        <ChordIdItem
          clef={s.clef}
          pitches={invertChord(seventhPitches(s.root, s.quality), s.inv, s.bassOct)}
          rootName={nameHeOf(s.root)}
          qualityOptions={SEVENTH_Q_OPTIONS}
          qualityAnswer={s.quality}
          figureOptions={["7", "6/5", "4/3", "4/2"]}
          figureAnswer={figureOf(4, s.inv)}
          solved={solved}
          markSolved={mark}
        />
      );
    },
  },
  {
    id: "key-from",
    title: "ז · הסולם שמאחורי האקורד",
    instructions:
      "ספטאקורד דומיננטי שייך לסולם מז'ורי אחד בלבד, וספטאקורד מוקטן — למינור הרמוני אחד בלבד. זהו את האקורד ומצאו את הסולם שלו.",
    count: KEY_FROM.length,
    render: (i, solved, mark) => {
      const s = KEY_FROM[i];
      const mode = s.quality === "X7" ? "major" : "minor";
      const tonic =
        s.quality === "X7"
          ? applyInterval(s.root, 4, "perfect", 1)
          : applyInterval(s.root, 2, "minor", 1);
      const answerSharps = findKey(nameHeOf(tonic), mode).sharps;
      return (
        <KeyFromChordItem
          clef={s.clef}
          pitches={seventhPitches(s.root, s.quality)}
          mode={mode}
          answerSharps={answerSharps}
          prompt={
            s.quality === "X7" ? (
              <>
                לפניכם ספטאקורד <b>דומיננטי</b> במצב יסודי. לאיזה סולם <b>מז'ורי</b> הוא שייך —
                כלומר, באיזה סולם הוא ה־<span className="rn" dir="ltr">V7</span>?
              </>
            ) : (
              <>
                לפניכם ספטאקורד <b>מוקטן</b> במצב יסודי. לאיזה סולם <b>מינורי</b> (הרמוני) הוא שייך —
                כלומר, היכן הוא ה־<span className="rn" dir="ltr">vii°7</span>?
              </>
            )
          }
          solved={solved}
          markSolved={mark}
        />
      );
    },
  },
];

export function Workbook04() {
  const { progress, mark } = useWbProgress("04");
  const [openId, setOpenId] = useState<string | null>(EXERCISES[0].id);

  const total = EXERCISES.reduce((n, e) => n + e.count, 0);
  const solved = EXERCISES.reduce((n, e) => n + (progress[e.id] ?? []).filter(Boolean).length, 0);

  return (
    <div className="workbook">
      <WorkbookHero
        unitNum={4}
        unitId="04"
        title="משולשים וספטאקורדים — תרגול"
        lede={
          <>
            שבעה תרגילים באקורדים: בנייה מכל צליל נתון, זיהוי יסוד־איכות־מצב, ספרור היפוכים,
            אקורדים מתוך סולם ודרגה — ומציאת הסולם שמאחורי V7 ו־vii°7. עד כה נפתרו {solved} מתוך{" "}
            {total} פריטים.
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
