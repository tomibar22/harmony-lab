import { useState } from "react";
import { Fig } from "../../components/ui";
import { SatbChord } from "../../engine/voiceLeading";
import { ExerciseCard, useWbProgress } from "../../workbook/exercise";
import { WorkbookHero } from "../../workbook/items";
import {
  ErrorHuntItem,
  SatbBuildItem,
  SatbIdItem,
  SatbRnItem,
  voicing,
} from "../../workbook/satbItems";
import { CONSTRUCTION_OPTIONS, ERR_ITEMS, VL_ITEMS, VL_OPTIONS } from "./wb06data";
import {
  SEVENTH_QUALITY_HE,
  SeventhQuality,
  SpelledPitch,
  TRIAD_QUALITY_HE,
  TriadQuality,
  diatonicTriad,
  figureOf,
  findKey,
  midiOf,
  nameHeOf,
  seventhPitches,
  triadPitches,
} from "../../workbook/pitch";

/** letter: 0=C 1=D 2=E 3=F 4=G 5=A 6=B */
const P = (letter: number, alter: number, octave: number): SpelledPitch => ({ letter, alter, octave });
const pc = (p: SpelledPitch) => ((midiOf(p) % 12) + 12) % 12;

const TRIAD_Q_OPTIONS = (Object.keys(TRIAD_QUALITY_HE) as TriadQuality[]).map((q) => ({
  value: q as string,
  label: TRIAD_QUALITY_HE[q],
}));
const SEVENTH_Q_OPTIONS = (Object.keys(SEVENTH_QUALITY_HE) as SeventhQuality[]).map((q) => ({
  value: q as string,
  label: SEVENTH_QUALITY_HE[q],
}));

/* =========================================================================
 * א · identify four-voice chords (triads + two sevenths)
 * ========================================================================= */

type IdSpec = {
  root: SpelledPitch;
  kind: "triad" | "seventh";
  quality: string;
  inv: number;
  chord: SatbChord;
};

const mkTriadId = (
  root: SpelledPitch,
  quality: TriadQuality,
  inv: number,
  plan: Parameters<typeof voicing>[1]
): IdSpec => ({
  root,
  kind: "triad",
  quality,
  inv,
  chord: voicing(triadPitches(root, quality), plan),
});
const mkSeventhId = (
  root: SpelledPitch,
  quality: SeventhQuality,
  inv: number,
  plan: Parameters<typeof voicing>[1]
): IdSpec => ({
  root,
  kind: "seventh",
  quality,
  inv,
  chord: voicing(seventhPitches(root, quality), plan),
});

const ID_ITEMS: IdSpec[] = [
  mkTriadId(P(0, 0, 4), "M", 0, { b: [0, 3], t: [2, 3], a: [1, 4], s: [0, 5] }),
  mkTriadId(P(4, 0, 4), "M", 1, { b: [1, 2], t: [0, 3], a: [2, 4], s: [0, 4] }),
  mkTriadId(P(3, 0, 4), "m", 0, { b: [0, 2], t: [0, 3], a: [2, 3], s: [1, 4] }),
  mkTriadId(P(1, 0, 4), "m", 2, { b: [2, 2], t: [2, 3], a: [0, 4], s: [1, 4] }),
  mkTriadId(P(6, 0, 3), "d", 1, { b: [1, 3], t: [0, 3], a: [1, 4], s: [2, 4] }),
  mkTriadId(P(5, 0, 3), "M", 0, { b: [0, 2], t: [2, 3], a: [1, 4], s: [0, 4] }),
  mkSeventhId(P(4, 0, 3), "X7", 0, { b: [0, 2], t: [3, 3], a: [1, 3], s: [2, 4] }),
  mkSeventhId(P(1, 0, 4), "m7", 2, { b: [2, 2], t: [0, 3], a: [3, 4], s: [1, 4] }),
];

/* =========================================================================
 * ב · roman numeral + figure from a key signature
 * ========================================================================= */

type RnSpec = {
  keyHe: string;
  degree: number;
  numeral: string;
  inv: number;
  chord: SatbChord;
};

const mkRn = (
  keyHe: string,
  degree: number,
  numeral: string,
  inv: number,
  plan: Parameters<typeof voicing>[1]
): RnSpec => ({
  keyHe,
  degree,
  numeral,
  inv,
  chord: voicing(diatonicTriad(findKey(keyHe, "major"), degree, 3), plan),
});

const RN_ITEMS: RnSpec[] = [
  mkRn("סי♭", 2, "II", 1, { b: [1, 3], t: [2, 3], a: [0, 4], s: [0, 5] }),
  mkRn("רה", 5, "V", 0, { b: [0, 2], t: [0, 3], a: [2, 4], s: [1, 5] }),
  mkRn("מי♭", 4, "IV", 1, { b: [1, 3], t: [0, 3], a: [2, 4], s: [0, 4] }),
  mkRn("לה", 1, "I", 2, { b: [2, 2], t: [2, 3], a: [0, 4], s: [1, 5] }),
  mkRn("סול", 6, "VI", 0, { b: [0, 3], t: [1, 3], a: [2, 3], s: [0, 4] }),
  mkRn("פה", 7, "VII", 1, { b: [1, 2], t: [0, 3], a: [1, 3], s: [2, 4] }),
  mkRn("מי", 3, "III", 0, { b: [0, 3], t: [1, 3], a: [2, 4], s: [0, 4] }),
  mkRn("לה♭", 5, "V", 2, { b: [2, 2], t: [0, 3], a: [2, 3], s: [1, 4] }),
];

/* =========================================================================
 * ג · build a four-voice chord to spec (any valid voicing accepted)
 * ========================================================================= */

type BuildSpec = {
  keyHe: string;
  mode: "major" | "minor";
  form?: "natural" | "harmonic";
  degree: number;
  numeral: string;
  inv: number;
  spacing: "close" | "open";
  solutionPlan: Parameters<typeof voicing>[1];
};

const BUILD_ITEMS: BuildSpec[] = [
  { keyHe: "דו", mode: "major", degree: 1, numeral: "I", inv: 0, spacing: "close", solutionPlan: { b: [0, 3], t: [1, 4], a: [2, 4], s: [0, 5] } },
  { keyHe: "סול", mode: "major", degree: 5, numeral: "V", inv: 0, spacing: "open", solutionPlan: { b: [0, 3], t: [2, 3], a: [1, 4], s: [0, 5] } },
  { keyHe: "פה", mode: "major", degree: 4, numeral: "IV", inv: 0, spacing: "close", solutionPlan: { b: [0, 2], t: [1, 4], a: [2, 4], s: [0, 4] } },
  { keyHe: "רה", mode: "major", degree: 2, numeral: "II", inv: 1, spacing: "open", solutionPlan: { b: [1, 2], t: [0, 3], a: [2, 4], s: [0, 5] } },
  { keyHe: "מי♭", mode: "major", degree: 1, numeral: "I", inv: 1, spacing: "close", solutionPlan: { b: [1, 3], t: [0, 4], a: [2, 4], s: [0, 5] } },
  { keyHe: "לה", mode: "major", degree: 1, numeral: "I", inv: 2, spacing: "close", solutionPlan: { b: [2, 3], t: [2, 4], a: [0, 4], s: [1, 5] } },
  { keyHe: "לה", mode: "minor", form: "harmonic", degree: 5, numeral: "V", inv: 0, spacing: "close", solutionPlan: { b: [0, 3], t: [2, 3], a: [0, 4], s: [1, 4] } },
  { keyHe: "סי♭", mode: "major", degree: 6, numeral: "VI", inv: 0, spacing: "open", solutionPlan: { b: [0, 2], t: [2, 3], a: [1, 3], s: [0, 4] } },
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
    id: "satb-id",
    title: "א · זיהוי אקורדים בארבעה קולות",
    instructions:
      "האקורדים כתובים על חמשה כפולה: סופרן ואלט למעלה, טנור ובס למטה. צמצמו בראש את ארבעת הקולות לצליליו של אקורד אחד וזהו יסוד, איכות ומצב.",
    count: ID_ITEMS.length,
    render: (i, solved, mark) => {
      const s = ID_ITEMS[i];
      return (
        <SatbIdItem
          chord={s.chord}
          rootName={nameHeOf(s.root)}
          qualityOptions={s.kind === "triad" ? TRIAD_Q_OPTIONS : SEVENTH_Q_OPTIONS}
          qualityAnswer={s.quality}
          figureOptions={s.kind === "triad" ? ["5/3", "6", "6/4"] : ["7", "6/5", "4/3", "4/2"]}
          figureAnswer={figureOf(s.kind === "triad" ? 3 : 4, s.inv)}
          solved={solved}
          markSolved={mark}
        />
      );
    },
  },
  {
    id: "satb-rn",
    title: "ב · ספרה רומית וספרור מתוך סימן היתק",
    instructions:
      "סימן ההיתק קובע סולם מז'ורי. מצאו את יסוד האקורד, קבעו על איזו דרגה הוא יושב, וסמנו ספרה רומית + ספרור.",
    count: RN_ITEMS.length,
    render: (i, solved, mark) => {
      const s = RN_ITEMS[i];
      const key = findKey(s.keyHe, "major");
      return (
        <SatbRnItem
          chord={s.chord}
          keySig={key.vex}
          keyNameHe={key.nameHe}
          numeralAnswer={s.numeral}
          figureAnswer={figureOf(3, s.inv)}
          figureOptions={["5/3", "6", "6/4"]}
          solved={solved}
          markSolved={mark}
        />
      );
    },
  },
  {
    id: "satb-build",
    title: "ג · בניית אקורד בארבעה קולות",
    instructions:
      "בנו את האקורד המבוקש: בס נכון לפי המצב, אקורד שלם, הכפלה נכונה, טווחים, בלי הצלבות — ובפריסה המבוקשת (צפופה: הקולות העליונים בתוך אוקטבה; פתוחה: יותר מזה). כל פתרון כשר יתקבל.",
    count: BUILD_ITEMS.length,
    render: (i, solved, mark) => {
      const s = BUILD_ITEMS[i];
      const key = findKey(s.keyHe, s.mode);
      const tones = diatonicTriad(key, s.degree, 3, s.form ?? "natural");
      const doublePc = s.inv === 2 ? pc(tones[2]) : pc(tones[0]);
      const fig = figureOf(3, s.inv);
      return (
        <SatbBuildItem
          spec={{
            expected: { pcs: tones.map(pc), bassPc: pc(tones[s.inv]), doublePc },
            spacing: s.spacing,
            prompt: (
              <>
                בסולם <b>{key.nameHe}</b>
                {s.form === "harmonic" ? " (הרמוני)" : ""}: בנו את{" "}
                <b><span className="rn" dir="ltr">{s.numeral}</span></b>
                {s.inv > 0 && (
                  <>
                    {" "}במצב <b><Fig n={fig} /></b>
                  </>
                )}{" "}
                בפריסה <b>{s.spacing === "close" ? "צפופה" : "פתוחה"}</b>, עם הכפלת{" "}
                <b>{s.inv === 2 ? "הבס" : "היסוד"}</b>.
              </>
            ),
            solutionChord: voicing(tones, s.solutionPlan),
            solutionLabel: `${s.numeral} של ${key.nameHe}`,
          }}
          solved={solved}
          markSolved={mark}
        />
      );
    },
  },
  {
    id: "satb-err",
    title: "ד · ציד שגיאות: מבנה האקורד",
    instructions:
      "כל האקורדים אמורים להיות I שלם של דו מז'ור עם הכפלת היסוד. חלקם תקינים, בחלקם שתולה שגיאת מבנה אחת: טווח, פריסה, הצלבה, חוסר או הכפלה. אבחנו.",
    count: ERR_ITEMS.length,
    render: (i, solved, mark) => (
      <ErrorHuntItem
        chords={[ERR_ITEMS[i].chord]}
        expected={ERR_ITEMS[i].expected}
        options={CONSTRUCTION_OPTIONS}
        noneValue="none"
        prompt={<>מה (אם בכלל) פגום באקורד הזה, ביחס לדרישה: I של דו מז'ור, שלם, בהכפלת יסוד?</>}
        solved={solved}
        markSolved={mark}
      />
    ),
  },
  {
    id: "satb-vl",
    title: "ה · ציד שגיאות: הובלת קולות",
    instructions:
      "שני אקורדים עוקבים. האזינו ועקבו אחרי כל זוג קולות: האם יש קווינטות או אוקטבות מקבילות? סמויות בקולות החיצוניים? חפיפה? או שהכול תקין?",
    count: VL_ITEMS.length,
    render: (i, solved, mark) => (
      <ErrorHuntItem
        chords={VL_ITEMS[i].pair}
        options={VL_OPTIONS}
        noneValue="none"
        prompt={<>בחנו את המעבר בין שני האקורדים וקבעו את האבחנה.</>}
        playPair
        solved={solved}
        markSolved={mark}
      />
    ),
  },
];

export function Workbook06() {
  const { progress, mark } = useWbProgress("06");
  const [openId, setOpenId] = useState<string | null>(EXERCISES[0].id);

  const total = EXERCISES.reduce((n, e) => n + e.count, 0);
  const solved = EXERCISES.reduce((n, e) => n + (progress[e.id] ?? []).filter(Boolean).length, 0);

  return (
    <div className="workbook">
      <WorkbookHero
        unitNum={6}
        unitId="06"
        title="כתיבה בארבעה קולות — תרגול"
        lede={
          <>
            חמישה תרגילים על חמשה כפולה: זיהוי אקורדים וספרות רומיות, בנייה חופשית בארבעה קולות עם
            בדיקת כללים מלאה, וציד שגיאות מבנה והובלת קולות. עד כה נפתרו {solved} מתוך {total} פריטים.
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
