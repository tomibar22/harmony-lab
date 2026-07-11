import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Keyboard } from "../../components/Keyboard";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { SeqEvent } from "../../engine/audio";
import {
  CONSONANCE_HE,
  INTERVALS,
  Interval,
  LETTERS_HE,
  NUMBER_NAMES_HE,
  QUALITY_HE,
  classify,
  findInterval,
  invert,
  nameHe,
} from "./intervals";

/* ---------------- musical data (public-domain works, re-engraved) ---------------- */

/** Mozart, Eine kleine Nachtmusik K. 525, i — bars 1–2 (first violin). */
const NACHT_MELODY: ScoreNote[] = [
  { keys: ["g/4"], duration: "q", midi: [67] },
  { keys: ["b/4"], duration: "8r", midi: [] },
  { keys: ["d/4"], duration: "8", midi: [62] },
  { keys: ["g/4"], duration: "q", midi: [67] },
  { keys: ["b/4"], duration: "8r", midi: [] },
  { keys: ["d/4"], duration: "8", midi: [62] },
  { keys: ["g/4"], duration: "8", midi: [67], beam: "b1" },
  { keys: ["d/4"], duration: "8", midi: [62], beam: "b1" },
  { keys: ["g/4"], duration: "8", midi: [67], beam: "b2" },
  { keys: ["b/4"], duration: "8", midi: [71], beam: "b2" },
  { keys: ["d/5"], duration: "q", midi: [74] },
  { keys: ["b/4"], duration: "qr", midi: [] },
];
const NACHT_SEQ: SeqEvent[] = [
  { midi: 67, time: 0, dur: 1, idx: 0 },
  { midi: 62, time: 1.5, dur: 0.5, idx: 2 },
  { midi: 67, time: 2, dur: 1, idx: 3 },
  { midi: 62, time: 3.5, dur: 0.5, idx: 5 },
  { midi: 67, time: 4, dur: 0.5, idx: 6 },
  { midi: 62, time: 4.5, dur: 0.5, idx: 7 },
  { midi: 67, time: 5, dur: 0.5, idx: 8 },
  { midi: 71, time: 5.5, dur: 0.5, idx: 9 },
  { midi: 74, time: 6, dur: 1, idx: 10 },
];

/* melodic vs harmonic: the same fifth, one note after the other vs together */
const MEL_HARM_NOTES: ScoreNote[] = [
  { keys: ["g/4"], midi: [67], sub: "מלודי" },
  { keys: ["d/5"], midi: [74], sub: "בזה אחר זה" },
  { keys: ["g/4", "d/5"], midi: [67, 74], sub: "הרמוני — יחד" },
];

/* the numeric ladder: every diatonic interval above C4 */
const SIZE_LADDER: ScoreNote[] = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
  const iv = findInterval(n, n === 1 || n === 4 || n === 5 || n === 8 ? "perfect" : "major");
  return {
    keys: n === 1 ? ["c/4"] : ["c/4", iv.upperKey],
    midi: n === 1 ? [60] : [60, 60 + iv.semitones],
    mark: String(n),
    sub: NUMBER_NAMES_HE[n - 1],
  };
});

/* major vs minor pairs for the quality section */
const QUALITY_PAIRS = [2, 3, 6, 7].map((n) => ({
  n,
  he: NUMBER_NAMES_HE[n - 1],
  major: findInterval(n, "major"),
  minor: findInterval(n, "minor"),
}));

/* the perfect family */
const PERFECT_NOTES: ScoreNote[] = [1, 4, 5, 8].map((n) => {
  const iv = findInterval(n, "perfect");
  return {
    keys: n === 1 ? ["c/4"] : ["c/4", iv.upperKey],
    midi: n === 1 ? [60] : [60, 60 + iv.semitones],
    sub: `${NUMBER_NAMES_HE[n - 1]} זכה`,
  };
});

/* inversion pairs: original above C4, inversion = lower note moved up an octave */
const INV_CHOICES = [
  findInterval(2, "major"),
  findInterval(3, "minor"),
  findInterval(3, "major"),
  findInterval(4, "perfect"),
  findInterval(5, "perfect"),
  findInterval(6, "major"),
];

/* overtone series on C (partials 1–8; partial 7 is notated as the nearest B♭) */
const OVERTONE_MIDI = [36, 48, 55, 60, 64, 67, 70, 72];
const OVERTONE_NOTES: ScoreNote[] = [
  { keys: ["c/2"], midi: [36], sub: "1 — היסוד" },
  { keys: ["c/3"], midi: [48], sub: "2" },
  { keys: ["g/3"], midi: [55], sub: "3" },
  { keys: ["c/4"], midi: [60], sub: "4" },
  { keys: ["e/4"], midi: [64], sub: "5" },
  { keys: ["g/4"], midi: [67], sub: "6" },
  { keys: ["bb/4"], midi: [70], sub: "7 — נמוך במקצת" },
  { keys: ["c/5"], midi: [72], sub: "8" },
];

/* tritone resolutions: aug 4 opens outward, dim 5 closes inward */
const TRITONE_NOTES: ScoreNote[] = [
  { keys: ["f/4", "b/4"], midi: [65, 71], kind: "active", mark: "מוגדלת" },
  { keys: ["e/4", "c/5"], midi: [64, 72], kind: "stable", sub: "נפתחת החוצה לסקסטה" },
  { keys: ["b/3", "f/4"], midi: [59, 65], kind: "active", mark: "מוקטנת" },
  { keys: ["c/4", "e/4"], midi: [60, 64], kind: "stable", sub: "נסגרת פנימה לטרצה" },
];
const TRITONE_SEQ: SeqEvent[] = [
  { midi: [65, 71], time: 0, dur: 1.2, idx: 0 },
  { midi: [64, 72], time: 1.2, dur: 2, idx: 1 },
  { midi: [59, 65], time: 4, dur: 1.2, idx: 2 },
  { midi: [60, 64], time: 5.2, dur: 2, idx: 3 },
];

/* enharmonic pair: augmented second vs minor third — same sound, different meaning */
const ENHARMONIC_NOTES: ScoreNote[] = [
  { keys: ["c/4", "d#/4"], midi: [60, 63], sub: "סקונדה מוגדלת" },
  { keys: ["c/4", "eb/4"], midi: [60, 63], sub: "טרצה קטנה" },
];

/* compound intervals */
const COMPOUND_NOTES: ScoreNote[] = [
  { keys: ["c/4", "d/5"], midi: [60, 74], mark: "9", sub: "נונה = אוקטבה + סקונדה" },
  { keys: ["c/4", "e/5"], midi: [60, 76], mark: "10", sub: "דצימה = אוקטבה + טרצה" },
];

/* ---------------- drills ---------------- */

function numericSizeQuestion(): Question {
  const from = Math.floor(Math.random() * 7);
  const size = 2 + Math.floor(Math.random() * 7); // 2–8
  const to = (from + size - 1) % 7;
  const label = (n: number) => `${NUMBER_NAMES_HE[n - 1]} (${n})`;
  const wrong = shuffle([2, 3, 4, 5, 6, 7, 8].filter((n) => n !== size))
    .slice(0, 3)
    .map(label);
  return {
    prompt: (
      <>
        מ<b>{LETTERS_HE[from]}</b> אל <b>{LETTERS_HE[to]}</b> שמעליו — מהו הגודל המספרי של המרווח?
      </>
    ),
    options: shuffle([label(size), ...wrong]),
    answer: label(size),
    explain: <>סופרים שמות צלילים כולל שני הקצוות: {LETTERS_HE[from]} הוא 1, וממשיכים עד {LETTERS_HE[to]}.</>,
  };
}

function semitonesQuestion(): Question {
  const iv = pick(INTERVALS.filter((i) => i.number > 1));
  const label = (n: number) => (n === 1 ? "חצי טון אחד" : `${n} חצאי טונים`);
  const wrong = shuffle(
    Array.from(new Set(INTERVALS.map((i) => i.semitones))).filter((s) => s !== iv.semitones && s > 0)
  )
    .slice(0, 3)
    .map(label);
  return {
    prompt: <>כמה חצאי טונים יש ב<b>{nameHe(iv)}</b>?</>,
    options: shuffle([label(iv.semitones), ...wrong]),
    answer: label(iv.semitones),
    explain: <>דרך מהירה לבדוק: בונים את המרווח מעל דו וסופרים קלידים על המקלדת.</>,
  };
}

function inversionQuestion(): Question {
  const iv = pick(INTERVALS.filter((i) => i.number > 1 && i.number < 8));
  const answer = nameHe(invert(iv));
  const wrong = shuffle(INTERVALS.map(nameHe).filter((n) => n !== answer && n !== nameHe(iv))).slice(0, 3);
  return {
    prompt: <>מהו היפוכה של <b>{nameHe(iv)}</b>?</>,
    options: shuffle([answer, ...wrong]),
    answer,
    explain: (
      <>
        המספרים משלימים ל־9 ({iv.number} + {9 - iv.number} = 9), והאיכות מתהפכת — רק "זכה" נשארת זכה.
      </>
    ),
  };
}

function consonanceQuestion(): Question {
  const iv = pick(INTERVALS.filter((i) => i.number > 1));
  const answer = CONSONANCE_HE[classify(iv)];
  return {
    prompt: <>כיצד מסוּוגת <b>{nameHe(iv)}</b> (כמרווח הרמוני)?</>,
    options: [CONSONANCE_HE.perfect, CONSONANCE_HE.imperfect, CONSONANCE_HE.dissonant, CONSONANCE_HE.contextual],
    answer,
    explain: (
      <>
        מושלמים: פרימה, קווינטה ואוקטבה זכות. לא־מושלמים: טרצות וסקסטות. דיסוננסים: סקונדות, ספטימות וכל מוגדל
        או מוקטן. הקוורטה הזכה — תלויה בהקשר.
      </>
    ),
  };
}

/* helper: play an interval melodically then harmonically */
function melodicThenHarmonic(lower: number, upper: number): SeqEvent[] {
  return [
    { midi: lower, time: 0, dur: 0.9 },
    { midi: upper, time: 0.9, dur: 0.9 },
    { midi: [lower, upper], time: 2, dur: 2 },
  ];
}

/* ---------------- the lesson ---------------- */

export function Unit02() {
  const nachtPlayer = usePlayer();
  const melHarmPlayer = usePlayer();
  const ladderPlayer = usePlayer();
  const qualityPlayer = usePlayer();
  const perfectPlayer = usePlayer();
  const enharmonicPlayer = usePlayer();
  const invPlayer = usePlayer();
  const compoundPlayer = usePlayer();
  const overtonePlayer = usePlayer();
  const consPlayer = usePlayer();
  const tritonePlayer = usePlayer();
  const [qualTab, setQualTab] = useState(1); // default: the third
  const [invTab, setInvTab] = useState(2); // default: major third

  const qp = QUALITY_PAIRS[qualTab];
  const qualityNotes: ScoreNote[] = [
    {
      keys: ["c/4", qp.major.upperKey],
      midi: [60, 60 + qp.major.semitones],
      sub: `גדולה — ${qp.major.semitones} חצ׳`,
    },
    {
      keys: ["c/4", qp.minor.upperKey],
      midi: [60, 60 + qp.minor.semitones],
      sub: `קטנה — ${qp.minor.semitones} חצ׳`,
    },
  ];

  const inv = INV_CHOICES[invTab];
  const invTo = invert(inv);
  const invNotes: ScoreNote[] = [
    { keys: ["c/4", inv.upperKey], midi: [60, 60 + inv.semitones], sub: nameHe(inv) },
    { keys: [inv.upperKey, "c/5"], midi: [60 + inv.semitones, 72], sub: nameHe(invTo) },
  ];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 2</div>
        <h1>מרווחים</h1>
        <p className="lede">
          ביחידה 1 מדדנו הכול בטונים ובחצאי טונים. עכשיו נבנה את סרגל המדידה המלא של המוזיקה הטונאלית —
          המרווח — ונגלה שהוא לא רק מרחק אלא גם אופי: יש מרווחים שנחים ויש מרווחים שדוחפים קדימה.
        </p>
      </header>

      <Section id="what" num="2.1" title="שני פנים למרווח: מלודי והרמוני">
        <p>
          <Term he="מרווח" en="Interval" def="היחס בין גובהיהם של שני צלילים. הוא נמדד בשני ממדים: גודל מספרי (כמה שמות צלילים) ואיכות (כמה חצאי טונים בדיוק)." />{" "}
          הוא היחס בין שני גבהים, והוא מופיע בשתי תצורות:{" "}
          <Term he="מרווח מלודי" en="Melodic interval" def="שני צלילים הנשמעים בזה אחר זה — המרחק שהמלודיה 'קופצת' או 'צועדת'." /> —
          צליל אחרי צליל, ו<Term he="מרווח הרמוני" en="Harmonic interval" def="שני צלילים הנשמעים בו־זמנית — אבן הבניין של ההרמוניה ושל הקונטרפונקט." /> —
          שני צלילים יחד. פתיחת "מוזיקת לילה זעירה" של מוצרט בנויה כמעט כולה ממרווחים מלודיים בולטים: קוורטות
          בין סול לרה, טרצה מסול לסי, ובסופה זינוק שמסכם קווינטה שלמה מעל סול:
        </p>
        <Widget
          title="מוצרט, מוזיקת לילה זעירה ק. 525, פרק א׳ — תיבות 1–2 (לחיצה על תו משמיעה אותו)"
          foot={<PlayButton label="נגנו את הפתיחה" events={NACHT_SEQ} bpm={120} player={nachtPlayer} />}
        >
          <Score
            notes={NACHT_MELODY}
            keySig="G"
            highlightIndex={nachtPlayer.index}
            ariaLabel="שתי התיבות הראשונות של מוזיקת לילה זעירה"
          />
        </Widget>
        <p>
          אותו זוג צלילים בדיוק יכול להופיע בשתי התצורות — ההבדל הוא רק בזמן. השוו באוזניים:
        </p>
        <Widget
          title="אותה קווינטה — קודם מלודית, אחר כך הרמונית"
          foot={<PlayButton label="השמיעו את שתי התצורות" events={melodicThenHarmonic(67, 74)} bpm={84} player={melHarmPlayer} />}
        >
          <Score notes={MEL_HARM_NOTES} highlightIndex={melHarmPlayer.index} ariaLabel="סול ורה: מלודי מול הרמוני" />
        </Widget>
      </Section>

      <Section id="size" num="2.2" title="הגודל המספרי: סופרים שמות, לא צלילים">
        <p>
          השם הראשון של כל מרווח הוא מספר, ואת המספר קובעים בספירה פשוטה של <em className="hl">שמות הצלילים</em>,
          כולל שני הקצוות: מדו אל סול — דו, רה, מי, פה, סול — חמישה שמות, ולכן{" "}
          <Term he="קווינטה" en="Fifth" def="מרווח שגודלו המספרי 5: חמישה שמות צלילים משני הקצוות ועד בכלל." />. מרווח בין
          צלילים שכנים הוא סקונדה, צליל אל עצמו — פרימה, ואל הצליל בעל אותו שם שמעליו — אוקטבה:
        </p>
        <Widget
          title="סולם המרווחים מעל דו — לחצו על כל מרווח לשמיעה"
          foot={
            <PlayButton
              label="נגנו את כולם בסדר עולה"
              events={SIZE_LADDER.map((n, i) => ({ midi: n.midi, time: i * 0.75, dur: 0.8, idx: i }))}
              bpm={100}
              player={ladderPlayer}
            />
          }
        >
          <Score notes={SIZE_LADDER} highlightIndex={ladderPlayer.index} ariaLabel="שמונת המרווחים הדיאטוניים מעל דו" />
        </Widget>
        <Callout label="שימו לב">
          הספירה מתעלמת מסימני היתק: דו–מי, דו–מי♭ וגם דו♯–מי הם כולם <b>טרצות</b>, כי בכולם שלושה שמות —
          דו, רה, מי. את ההבדל ביניהם מודד הממד השני של המרווח: האיכות.
        </Callout>
      </Section>

      <Section id="quality" num="2.3" title="האיכות: שתי משפחות של מרווחים">
        <p>
          שני מרווחים בעלי אותו מספר יכולים להכיל מספר שונה של חצאי טונים — ולצליל שלהם אופי שונה לגמרי.
          לכן לכל מספר מצטרפת <Term he="איכות" en="Quality" def="הדיוק של המרווח: זך, גדול, קטן, מוגדל או מוקטן — נקבע לפי מספר חצאי הטונים." />,
          והמרווחים מתחלקים לשתי משפחות. סקונדות, טרצות, סקסטות וספטימות באות בזוגות —{" "}
          <b>גדולה</b> ו<b>קטנה</b>, בהפרש של חצי טון בדיוק:
        </p>
        <Widget
          title="גדולה מול קטנה — בחרו מרווח והשוו באוזניים"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {QUALITY_PAIRS.map((p, i) => (
                  <button key={p.n} role="tab" aria-selected={qualTab === i} onClick={() => setQualTab(i)}>
                    {p.he}
                  </button>
                ))}
              </div>
              <PlayButton
                label="נגנו גדולה ואז קטנה"
                events={[
                  { midi: [60, 60 + qp.major.semitones], time: 0, dur: 1.6, idx: 0 },
                  { midi: [60, 60 + qp.minor.semitones], time: 2, dur: 1.6, idx: 1 },
                ]}
                bpm={84}
                player={qualityPlayer}
              />
            </>
          }
        >
          <Score
            key={qp.n}
            notes={qualityNotes}
            highlightIndex={qualityPlayer.index}
            ariaLabel={`${qp.he} גדולה מול ${qp.he} קטנה מעל דו`}
          />
        </Widget>
        <p>
          פרימה, קוורטה, קווינטה ואוקטבה שייכות למשפחה השנייה: להן צורה בסיסית אחת בלבד, שנקראת{" "}
          <Term he="זכה" en="Perfect" def="איכותם הבסיסית של הפרימה, הקוורטה, הקווינטה והאוקטבה. מרווח זך אין לו גרסה 'גדולה' או 'קטנה' — רק מוגדלת או מוקטנת." /> —
          ולא במקרה: אלה בדיוק המרווחים הצלולים ביותר, כפי שנראה בסדרת העליונים.
        </p>
        <Widget
          title="משפחת המרווחים הזכים מעל דו"
          foot={
            <PlayButton
              label="נגנו את הארבעה"
              events={PERFECT_NOTES.map((n, i) => ({ midi: n.midi, time: i * 1.1, dur: 1.1, idx: i }))}
              bpm={90}
              player={perfectPlayer}
            />
          }
        >
          <Score notes={PERFECT_NOTES} highlightIndex={perfectPlayer.index} ariaLabel="פרימה, קוורטה, קווינטה ואוקטבה זכות" />
        </Widget>
        <Callout label="כלל הזזה" insight>
          הרחבה של מרווח בחצי טון כרומטי (בלי לשנות את שמות הצלילים) הופכת גדול או זך ל<b>מוגדל</b>; כיווץ כזה
          הופך קטן או זך ל<b>מוקטן</b>. הסולם המלא: מוקטן ← קטן ← גדול ← מוגדל, וכשמדובר במשפחה הזכה —
          מוקטן ← זך ← מוגדל.
        </Callout>
      </Section>

      <Section id="semitones" num="2.4" title="לספור חצאי טונים — ולזהות מהר">
        <p>
          המידה המדויקת של כל איכות היא מספר חצאי הטונים. טרצה גדולה מכילה ארבעה, טרצה קטנה — שלושה. אפשר
          לראות את זה ישירות על המקלדת: דו–מי ורה–פה הם שניהם טרצות (שלושה שמות), אבל המרחק ביניהם שונה:
        </p>
        <Widget title="אותו גודל מספרי, איכות שונה — ספרו את הקלידים שבדרך">
          <Keyboard
            fromMidi={60}
            toMidi={72}
            labels={{ 60: "דו", 62: "רה", 64: "מי", 65: "פה" }}
            highlight={{ 60: "stable", 64: "stable", 62: "active", 65: "active" }}
            brackets={[
              { fromMidi: 60, toMidi: 64, label: "טרצה גדולה — 4 חצ׳" },
              { fromMidi: 62, toMidi: 65, label: "טרצה קטנה — 3 חצ׳" },
            ]}
            ariaLabel="מקלדת המשווה טרצה גדולה דו–מי לטרצה קטנה רה–פה"
          />
        </Widget>
        <Callout label="שיטת העבודה המהירה">
          במקום לספור חצאי טונים כל פעם, חשבו על <b>הסולם המז'ורי של הצליל התחתון</b>: כל צליל עליון שנמצא
          בסולם יוצר מרווח גדול או זך. חצי טון מתחתיו — קטן (או מוקטן, אם המרווח זך); חצי טון מעליו — מוגדל.
          כך סימני ההיתק שלמדתם ביחידה 1 הופכים למכונת זיהוי מרווחים.
        </Callout>
      </Section>

      <Section id="enharmonic" num="2.5" title="מוגדל, מוקטן — ואנהרמוניה של מרווחים">
        <p>
          המרווחים המוגדלים והמוקטנים אינם קוריוז תאורטי — כבר פגשנו אחד מהם: במינור ההרמוני, בין <Deg n="6" /> ל־
          <Deg n="7" /> המוגבהת, נפערת <b>סקונדה מוגדלת</b>. על המקלדת היא זהה לטרצה קטנה — שלושה חצאי טונים —
          אבל שמות הצלילים מספרים סיפור אחר. צמד כזה נקרא{" "}
          <Term he="מרווחים אנהרמוניים" en="Enharmonic intervals" def="שני מרווחים הזהים בצליל (אותו מספר חצאי טונים) אך שונים בשם ולכן במשמעות ובנטיית הפתרון." />
          , ובמוזיקה טונאלית ההבחנה ביניהם חשובה: הכתיב מגלה לאן המרווח נוטה ללכת.
        </p>
        <Widget
          title="נשמעים זהה — נכתבים ומתפקדים אחרת"
          foot={
            <PlayButton
              label="נגנו את שניהם"
              events={[
                { midi: [60, 63], time: 0, dur: 1.6, idx: 0 },
                { midi: [60, 63], time: 2, dur: 1.6, idx: 1 },
              ]}
              bpm={84}
              player={enharmonicPlayer}
            />
          }
        >
          <Score
            notes={ENHARMONIC_NOTES}
            highlightIndex={enharmonicPlayer.index}
            ariaLabel="סקונדה מוגדלת דו–רה דיאז מול טרצה קטנה דו–מי במול"
          />
        </Widget>
      </Section>

      <Section id="inversion" num="2.6" title="היפוך מרווחים: חוק ה־9">
        <p>
          מה קורה כשמעבירים את הצליל התחתון של מרווח אוקטבה למעלה?{" "}
          <Term he="היפוך" en="Inversion" def="החלפת מקומות בין שני צלילי המרווח על ידי העברת אחד מהם אוקטבה. מספרי מרווח והיפוכו משלימים תמיד ל־9." />{" "}
          — טרצה הופכת לסקסטה, קוורטה לקווינטה. שני חוקים פשוטים: המספרים משלימים תמיד ל<b>־9</b>, והאיכות
          מתהפכת — גדול ↔ קטן, מוגדל ↔ מוקטן, ורק זך נשאר זך. לכן שני המרווחים חולקים אופי משפחתי, והידיעה
          הזאת חוסכת חצי מהעבודה: מי שמזהה סקסטה קטנה בקלות דרך היפוכה — טרצה גדולה — לא צריך לספור שמונה
          חצאי טונים.
        </p>
        <Widget
          title="בחרו מרווח וראו את היפוכו — הדו התחתון עולה אוקטבה"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {INV_CHOICES.map((iv, i) => (
                  <button key={nameHe(iv)} role="tab" aria-selected={invTab === i} onClick={() => setInvTab(i)}>
                    {nameHe(iv)}
                  </button>
                ))}
              </div>
              <PlayButton
                label="נגנו מרווח והיפוך"
                events={[
                  { midi: invNotes[0].midi, time: 0, dur: 1.6, idx: 0 },
                  { midi: invNotes[1].midi, time: 2, dur: 1.6, idx: 1 },
                ]}
                bpm={84}
                player={invPlayer}
              />
            </>
          }
        >
          <Score
            key={invTab}
            notes={invNotes}
            highlightIndex={invPlayer.index}
            ariaLabel={`${nameHe(inv)} והיפוכה ${nameHe(invTo)}`}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.75rem 0 0" }}>
            {inv.number} + {invTo.number} = 9 · {invSentence(inv, invTo)}
          </p>
        </Widget>
      </Section>

      <Section id="compound" num="2.7" title="מרווחים מורכבים: מעבר לאוקטבה">
        <p>
          מרווח רחב מאוקטבה נקרא <Term he="מרווח מורכב" en="Compound interval" def="מרווח הגדול מאוקטבה: אוקטבה ועוד מרווח פשוט. נונה = 9, דצימה = 10, וכן הלאה." /> —
          אוקטבה ועוד מרווח פשוט. בזכות שקילות האוקטבות הוא מתנהג כמעט תמיד כמו המרווח הפשוט שבתוכו: דצימה
          היא "טרצה גבוהה". כדי לצמצם — מחסירים 7 מהמספר (10 − 7 = 3). ובכל זאת נכיר את השמות נונה ודצימה,
          כי בהמשך הספר (בבס ממוספר ובקישוטים) יהיה חשוב לפעמים לציין את המרחק האמיתי.
        </p>
        <Widget
          title="נונה ודצימה מעל דו"
          foot={
            <PlayButton
              label="נגנו אותן"
              events={COMPOUND_NOTES.map((n, i) => ({ midi: n.midi, time: i * 2, dur: 1.7, idx: i }))}
              bpm={84}
              player={compoundPlayer}
            />
          }
        >
          <Score notes={COMPOUND_NOTES} highlightIndex={compoundPlayer.index} ariaLabel="נונה ודצימה מעל דו" />
        </Widget>
      </Section>

      <Section id="overtones" num="2.8" title="סדרת העליונים: המרווחים שהטבע מנגן">
        <p>
          מדוע דווקא הקווינטה "זכה" והסקונדה "מתחככת"? רמז גדול מסתתר בפיזיקה של הצליל. כל צליל של כלי אמיתי
          הוא בעצם אגד: מעל הגובה היסודי מהדהדים בשקט{" "}
          <Term he="צלילים עיליים" en="Overtones" def="הצלילים החלשים המהדהדים מעל כל צליל יסוד, בסדר קבוע הנקרא סדרת העליונים (ההרמוניות). האוזן ממזגת אותם לגון הצליל." />{" "}
          בסדר קבוע. שימו לב לסדר המרווחים: אוקטבה, קווינטה, קוורטה, טרצה גדולה, טרצה קטנה — המרווחים הולכים
          ונעשים צפופים, והצלולים שבהם מופיעים ראשונים, הכי קרוב ליסוד:
        </p>
        <Widget
          title="סדרת העליונים על דו — שמונת הצלילים הראשונים"
          foot={
            <PlayButton
              label="נגנו את הסדרה, ואז יחד"
              events={[
                ...OVERTONE_MIDI.map((m, i) => ({ midi: m, time: i * 0.55, dur: 0.7, idx: i })),
                { midi: [36], time: 4.8, dur: 3, vel: 0.8 },
                ...OVERTONE_MIDI.slice(1).map((m) => ({ midi: m, time: 4.8, dur: 3, vel: 0.25 })),
              ]}
              bpm={100}
              player={overtonePlayer}
            />
          }
        >
          <Score
            notes={OVERTONE_NOTES}
            clef="bass"
            highlightIndex={overtonePlayer.index}
            ariaLabel="שמונת הצלילים הראשונים בסדרת העליונים על דו"
          />
        </Widget>
        <p>
          המרווחים שבראש הסדרה נוצרים מיחסי תדרים פשוטים — אוקטבה 2:1, קווינטה 3:2, קוורטה 4:3 — ולכן גלי
          הקול שלהם משתלבים בקלות והאוזן שומעת מיזוג. ככל שהיחס מסובך יותר, הצלילים "מסרבים להתמזג" ונשמע
          חיכוך. זה הבסיס הפיזיקלי להבחנה המרכזית של הסעיף הבא — אבל חשוב לומר: הפיזיקה רק פותחת את הסיפור.
          ההחלטה מה נחשב צורם ומה נעים היא גם עניין של סגנון, תקופה ותרבות.
        </p>
      </Section>

      <Section id="consonance" num="2.9" title="קונסוננס ודיסוננס: מנוחה ותנועה">
        <p>
          <Term he="קונסוננס" en="Consonance" def="מרווח יציב הנשמע נינוח ויכול לשמש נקודת מנוחה. מלטינית: 'נשמעים יחד'." /> הוא
          מרווח שיכול לנוח; <Term he="דיסוננס" en="Dissonance" def="מרווח מתוח הדורש המשך — פתרון אל קונסוננס. הדיסוננס אינו 'רע': הוא מקור התנועה והכיוון במוזיקה." /> הוא
          מרווח שחייב להמשיך. הסיווג המלא, שילווה אותנו לאורך כל הספר:
        </p>
        <div className="review-grid">
          <div className="review-chip"><b>קונסוננסים מושלמים</b>פרימה, קווינטה ואוקטבה זכות — צלולים, יציבים, וקצת חלולים.</div>
          <div className="review-chip"><b>קונסוננסים לא־מושלמים</b>טרצות וסקסטות, גדולות וקטנות — מלאים וחמים; עמוד השדרה של המרקם הטונאלי.</div>
          <div className="review-chip"><b>דיסוננסים</b>סקונדות, ספטימות, וכל מרווח מוגדל או מוקטן — מתוחים ודורשים פתרון.</div>
          <div className="review-chip"><b>הקוורטה הזכה</b>מקרה מיוחד: מול הבס היא נחשבת דיסוננס; בין הקולות העליונים — קונסוננס.</div>
        </div>
        <Widget
          title="סיירו בין הסוגים — כל כפתור משמיע מרווח הרמוני ממושך"
          foot={
            <>
              <PlayButton label="קווינטה זכה" events={[{ midi: [60, 67], time: 0, dur: 2.4 }]} bpm={80} player={consPlayer} />
              <PlayButton label="טרצה גדולה" ghost events={[{ midi: [60, 64], time: 0, dur: 2.4 }]} bpm={80} player={consPlayer} />
              <PlayButton label="סקסטה קטנה" ghost events={[{ midi: [60, 68], time: 0, dur: 2.4 }]} bpm={80} player={consPlayer} />
              <PlayButton label="סקונדה קטנה" ghost events={[{ midi: [60, 61], time: 0, dur: 2.4 }]} bpm={80} player={consPlayer} />
              <PlayButton label="ספטימה גדולה" ghost events={[{ midi: [60, 71], time: 0, dur: 2.4 }]} bpm={80} player={consPlayer} />
              <PlayButton label="קוורטה מוגדלת" ghost events={[{ midi: [60, 66], time: 0, dur: 2.4 }]} bpm={80} player={consPlayer} />
            </>
          }
        >
          <p style={{ direction: "rtl", margin: 0, color: "var(--ink-soft)" }}>
            הקשיבו למדרג: מהצלול והחלול (קווינטה) דרך המלא והחם (טרצה, סקסטה) ועד המתוח והדוחף (סקונדה,
            ספטימה, טריטון).
          </p>
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          דיסוננס אינו פגם אלא <b>דלק</b>. מוזיקה שכולה קונסוננסים עומדת במקום; הדיסוננס יוצר את הציפייה,
          והפתרון — את הסיפוק. לימוד ההרמוניה הוא במידה רבה לימוד הטיפול המבוקר בדיסוננס.
        </Callout>
      </Section>

      <Section id="tritone" num="2.10" title="הטריטון — הדיסוננס שיודע לאן">
        <p>
          למרווח של שלושה טונים שלמים — <Term he="טריטון" en="Tritone" def="מרווח של שלושה טונים שלמים (שישה חצאי טונים), החוצה את האוקטבה בדיוק באמצע: קוורטה מוגדלת או קווינטה מוקטנת." /> —
          מעמד מיוחד: הוא הדיסוננס בעל כיוון הפתרון הברור ביותר, ובמז'ור הוא נוצר בדיוק בין שני הצלילים
          הפעילים החזקים — <Deg n="4" kind="active" /> ו־<Deg n="7" kind="active" />. הכתיב קובע את הכיוון:
          כקוורטה מוגדלת (פה–סי) שני הצלילים נפתחים החוצה אל <Deg n="3" kind="stable" /> ו־<Deg n="8" kind="stable" />;
          כקווינטה מוקטנת (סי–פה) הם נסגרים פנימה. זהו המנוע שיניע בהמשך את אקורד הדומיננטה:
        </p>
        <Widget
          title="שני כתיבים, שני פתרונות — הקשיבו למתח ולשחרור"
          legend={
            <>
              <span><span className="dot active" />דיסוננס</span>
              <span><span className="dot stable" />פתרון</span>
            </>
          }
          foot={<PlayButton label="נגנו את שני הפתרונות" events={TRITONE_SEQ} bpm={72} player={tritonePlayer} />}
        >
          <Score notes={TRITONE_NOTES} highlightIndex={tritonePlayer.index} ariaLabel="קוורטה מוגדלת נפתחת החוצה וקווינטה מוקטנת נסגרת פנימה" />
        </Widget>
        <p>
          שימו לב שהטריטון חוצה את האוקטבה בדיוק באמצע — ולכן היפוכו הוא שוב טריטון. הוא גם המרווח היחיד
          במז'ור שמופיע פעם אחת בלבד בסולם, מה שהופך אותו לטביעת אצבע: מי ששומע את הטריטון יודע בדיוק היכן
          הוא נמצא במפתח.
        </p>
      </Section>

      <Section id="review" num="2.11" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>מרווח</b>יחס בין שני גבהים: מלודי (בזה אחר זה) או הרמוני (יחד).</div>
          <div className="review-chip"><b>גודל מספרי</b>סופרים שמות צלילים כולל הקצוות; סימני היתק לא משנים אותו.</div>
          <div className="review-chip"><b>איכות</b>2, 3, 6, 7 — גדולה/קטנה; 1, 4, 5, 8 — זכה. הרחבה: מוגדלת; כיווץ: מוקטנת.</div>
          <div className="review-chip"><b>זיהוי מהיר</b>חשבו על הסולם המז'ורי של הצליל התחתון.</div>
          <div className="review-chip"><b>היפוך</b>המספרים משלימים ל־9; גדול ↔ קטן, זך נשאר זך.</div>
          <div className="review-chip"><b>מרווח מורכב</b>רחב מאוקטבה; מצמצמים בהחסרת 7.</div>
          <div className="review-chip"><b>קונסוננס / דיסוננס</b>מושלמים: 1, 5, 8; לא־מושלמים: 3, 6; דיסוננס: 2, 7 וכל מוגדל/מוקטן.</div>
          <div className="review-chip"><b>טריטון</b>בין 4 ל־7 במז'ור; מוגדלת נפתחת החוצה, מוקטנת נסגרת פנימה.</div>
        </div>
      </Section>

      <Section id="drills" num="2.12" title="תרגול — עד שזה אוטומטי">
        <Drill title="גודל מספרי" generate={numericSizeQuestion} />
        <Drill title="חצאי טונים בכל מרווח" generate={semitonesQuestion} />
        <Drill title="היפוך מרווחים" generate={inversionQuestion} />
        <Drill title="קונסוננס או דיסוננס?" generate={consonanceQuestion} />
      </Section>

      <div className="next-unit">
        <b>הבא בתור — יחידה 3: מקצב ומשקל.</b> הגובה הוא רק חצי מהסיפור: איך פעמות, משקלים והטעמות מארגנים
        את הזמן — ולמה מיקומו של דיסוננס בתיבה חשוב לא פחות מהצלילים שבו.
      </div>
    </div>
  );
}

/* helper: readable sentence about how the quality flips under inversion */
function invSentence(a: Interval, b: Interval): string {
  if (a.quality === "perfect") return "האיכות הזכה נשארת זכה";
  return `האיכות מתהפכת: ${QUALITY_HE[a.quality]} ← ${QUALITY_HE[b.quality]}`;
}
