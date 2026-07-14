import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, Fig, FigText, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";

/* ---------------- root position vs first inversion, side by side ---------------- */

const SIX_CHORDS: ScoreNote[] = [
  { keys: ["c/4", "e/4", "g/4"], midi: [60, 64, 67], mark: "I", fig: "5/3", sub: "בס: דו" },
  { keys: ["e/4", "g/4", "c/5"], midi: [64, 67, 72], mark: "I6", fig: "6", sub: "בס: מי" },
  { keys: ["g/3", "b/3", "d/4"], midi: [55, 59, 62], mark: "V", fig: "5/3", sub: "בס: סול" },
  { keys: ["b/3", "d/4", "g/4"], midi: [59, 62, 67], mark: "V6", fig: "6", sub: "בס: סי" },
  { keys: ["d/4", "f/4", "b/4"], midi: [62, 65, 71], mark: "VII6", fig: "6", sub: "בס: רה" },
];

/* ---------------- the reusable four-voice chords (C major) ----------------
   every adjacent pair below was checked by hand for parallels and ranges */

const I_ROOT: Satb = { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] };
const I_SIX: Satb = { s: ["c/5", 72], a: ["c/4", 60], t: ["g/3", 55], b: ["e/3", 52] };
const V_ROOT: Satb = { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/2", 43] };
const V_SIX: Satb = { s: ["d/5", 74], a: ["d/4", 62], t: ["g/3", 55], b: ["b/2", 47] };
const VII_SIX: Satb = { s: ["b/4", 71], a: ["d/4", 62], t: ["f/3", 53], b: ["d/3", 50] };

/* ---------------- I6: freeing the tonic ---------------- */

const I6_MOVE: Satb[] = [I_ROOT, I_SIX, V_ROOT, I_ROOT];

/* ---------------- V6: the lower neighbor ---------------- */

const V6_MOVE: Satb[] = [I_ROOT, V_SIX, I_ROOT];

/* ---------------- VII6: the passing chord ---------------- */

const VII6_FORMS = [
  {
    he: "עולה: 1–2–3",
    chords: [I_ROOT, VII_SIX, I_SIX] as Satb[],
    marks: ["I", "VII6", "I6"],
    note: "הבס מטפס דו–רה–מי, והסופרן מצייר שכן תחתון: 8–7–8. ‏VII6 ממלא את הצעד שבין שני מצבי הטוניקה.",
  },
  {
    he: "יורדת: 3–2–1",
    chords: [I_SIX, VII_SIX, I_ROOT] as Satb[],
    marks: ["I6", "VII6", "I"],
    note: "אותו גשר, בכיוון ההפוך: מי–רה–דו בבס. תבנית המעבר עובדת לשני הכיוונים - לכן היא שימושית כל כך.",
  },
] as const;

/* ---------------- a melodic bass line ---------------- */

const BASS_LINE: Satb[] = [I_ROOT, V_SIX, I_ROOT, VII_SIX, I_SIX, V_ROOT, I_ROOT];
const BASS_MARKS = ["I", "V6", "I", "VII6", "I6", "V", "I"];

/* ---------------- in minor: i–VII6–i6 with the raised 7 ---------------- */

const MINOR_PASSING: Satb[] = [
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
  { s: ["g#/4", 68], a: ["b/3", 59], t: ["d/3", 50], b: ["b/2", 47] },
  { s: ["a/4", 69], a: ["a/3", 57], t: ["e/3", 52], b: ["c/3", 48] },
];

/* ---------------- drills ---------------- */

const BASS_POOL = [
  { chord: "I6", deg: "3", why: "בהיפוך ראשון הטרצה בבס - ב־I6 זו המדיאנטה." },
  { chord: "V6", deg: "7", why: "הטרצה של V היא הצליל המוביל - והוא יושב בבס של V6." },
  { chord: "VII6", deg: "2", why: "הטרצה של VII היא הסופרטוניקה - הבס של VII6." },
  { chord: "I", deg: "1", why: "מצב יסודי: היסוד בבס - הטוניקה עצמה." },
  { chord: "V", deg: "5", why: "מצב יסודי: היסוד בבס - הדומיננטה." },
] as const;

function bassQuestion(): Question {
  const q = pick(BASS_POOL);
  return {
    prompt: (
      <>
        איזו דרגה יושבת בבס של <span dir="ltr">{q.chord}</span>?
      </>
    ),
    options: shuffle(["1", "2", "3", "5", "7"]),
    answer: q.deg,
    explain: <>{q.why}</>,
  };
}

const DOUBLING_POOL: Question[] = [
  {
    prompt: <>איזה צליל אסור להכפיל ב־V6?</>,
    options: [
      "את הבס (הצליל המוביל)",
      "את היסוד (הדומיננטה)",
      "את הקווינטה (הסופרטוניקה)",
      "מותר להכפיל כל צליל שנוח",
    ],
    answer: "את הבס (הצליל המוביל)",
    explain: <>הבס של V6 הוא הצליל המוביל - הכפלתו תגרור אוקטבות מקבילות או צליל מוביל שלא נפתר.</>,
  },
  {
    prompt: <>מה מכפילים בדרך כלל ב־VII6?</>,
    options: [
      "את הבס (הסופרטוניקה)",
      "את היסוד (הצליל המוביל)",
      "את הקווינטה (דרגה 4)",
      "את שני צלילי הטריטון",
    ],
    answer: "את הבס (הסופרטוניקה)",
    explain: <>מכפילים את הצליל היחיד שאינו חלק מהטריטון - הסופרטוניקה שבבס.</>,
  },
  {
    prompt: <>בסקסט־אקורדים בכלל, מה קובע את ההכפלה?</>,
    options: [
      "הובלת הקולות - כל צליל כשר חוץ מהצליל המוביל",
      "תמיד מכפילים את הבס, בדיוק כמו במצב היסודי",
      "תמיד מכפילים את היסוד, גם כשהוא אינו בבס",
      "תמיד מכפילים את הקווינטה, הוותרנית הקבועה",
    ],
    answer: "הובלת הקולות - כל צליל כשר חוץ מהצליל המוביל",
    explain: <>בניגוד למצב היסודי, בהיפוך ראשון אין העדפה קשיחה: בוחרים את מה שמחבר הכי חלק - ורק הצליל המוביל נשאר מחוץ למשחק.</>,
  },
  {
    prompt: <>‏V7 שלם דורש ויתור על הקווינטה של I. ומה "המחיר" של V6?</>,
    options: [
      "אין מחיר - האקורד שלם והפתרון חלק",
      "הטוניקה שאחריו מאבדת את הטרצה",
      "נוצרות קווינטות מקבילות עם הבס",
      "הסופרן נאלץ לקפוץ אל היסוד",
    ],
    answer: "אין מחיר - האקורד שלם והפתרון חלק",
    explain: <>זה חלק מהקסם של הסקסט־אקורדים: הבס נפתר בצעד, וכל השאר מסתדר בלי ויתורים.</>,
  },
];

function doublingQuestion(): Question {
  return pick(DOUBLING_POOL);
}

const ROLE_POOL: Question[] = [
  {
    prompt: <>הבס עולה דו–רה–מי (בדו מז'ור). איזה אקורד מתאים על רה?</>,
    options: ["VII6", "V6", "I6", "V"],
    answer: "VII6",
    explain: <>‏VII6 הוא אקורד המעבר בין I ל־I6 - הבס שלו, הסופרטוניקה, הוא בדיוק הצעד שבאמצע.</>,
  },
  {
    prompt: <>הבס מצייר שכן תחתון: דו–סי–דו. איזה אקורד על סי?</>,
    options: ["V6", "VII6", "I6", "V7"],
    answer: "V6",
    explain: <>הצליל המוביל בבס נפתר חזרה אל הטוניקה - V6 הוא הדומיננטה בתפקיד שכן.</>,
  },
  {
    prompt: <>מדוע I6 שימושי אחרי I?</>,
    options: [
      "הוא נותן לבס לזוז בלי לעזוב את הטוניקה",
      "הוא מגביר את המתח לקראת הדומיננטה",
      "הוא מחליף את הדומיננטה בקדנצות",
      "הוא מוסיף לטוניקה דיסוננס חדש",
    ],
    answer: "הוא נותן לבס לזוז בלי לעזוב את הטוניקה",
    explain: <>אותה הרמוניה, בס אחר: ההיפוך הראשון מרחיב את הטוניקה ומעניק לבס חיים מלודיים.</>,
  },
  {
    prompt: <>מה קורה לטריטון של VII6 כשהוא משמש אקורד מעבר?</>,
    options: [
      "הפתרון מוקל - דרגה 4 רשאית לעלות אל 5",
      "הוא חייב להיפתר כרגיל, בלי שום הקלה",
      "הוא נעלם מהאקורד בהשמטת הקווינטה",
      "הוא נשמע פתאום כקונסוננס יציב",
    ],
    answer: "הפתרון מוקל - דרגה 4 רשאית לעלות אל 5",
    explain: <>בתנועת מעבר צעדית, בעיקר במקבילות עם הבס, האוזן סולחת: 4 ממשיכה בכיוון הקו במקום לרדת אל 3.</>,
  },
  {
    prompt: <>איזה אקורד מהיחידה הזו הוא משולש מוקטן - ולכן כמעט לא מופיע במצב יסודי?</>,
    options: ["VII", "V", "I", "II"],
    answer: "VII",
    explain: <>הקווינטה המוקטנת מעל הבס גלויה מדי במצב יסודי; בהיפוך ראשון היא נחבאת בין הקולות העליונים.</>,
  },
];

function roleQuestion(): Question {
  return pick(ROLE_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit08() {
  const sixPlayer = usePlayer();
  const i6Player = usePlayer();
  const v6Player = usePlayer();
  const viiPlayer = usePlayer();
  const linePlayer = usePlayer();
  const minorPlayer = usePlayer();
  const [viiTab, setViiTab] = useState(0);

  const viiForm = VII6_FORMS[viiTab];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 8 · חלק שני</div>
        <h1>סקסט־אקורדים: I6, V6 ו־VII6</h1>
        <p className="lede">
          ביחידה 7 הבס קפץ בין יסודות - דו, סול, דו. יחידה זו משחררת אותו: היפוך ראשון שם בבס את הטרצה
          של האקורד, וכך הבס יכול ללכת בצעדים ולשיר בעצמו, בלי לוותר על הדקדוק של I ו־V.
        </p>
      </header>

      <Section id="what" num="8.1" title="מהו סקסט־אקורד">
        <p>
          <Term he="סקסט־אקורד" en="Sixth chord" def="משולש בהיפוך ראשון: הטרצה בבס, והספרה 6 מציינת את הסקסטה שבין הבס ליסוד שמעליו." /> הוא
          פשוט משולש בהיפוך ראשון - השם בא מהבס הממוספר <Fig n="6" /> שלמדנו ביחידה 4: מעל הבס נערמות
          טרצה וסקסטה במקום טרצה וקווינטה. היסוד לא השתנה, אבל הצליל שנושא את האקורד כן - ואיתו האופי:
          המצב היסודי יציב ומוצק, ההיפוך הראשון קליל, פתוח, מזמין תנועה. שלושת הסקסט־אקורדים של היחידה:
        </p>
        <Widget
          title="שלושה אקורדים - ולידם מצבם היסודי. לחצו והשוו"
          foot={
            <PlayButton
              label="נגנו את החמישה"
              events={SIX_CHORDS.map((n, i) => ({ midi: n.midi, time: i * 1.1, dur: 1.15, idx: i }))}
              bpm={84}
              player={sixPlayer}
            />
          }
        >
          <Score notes={SIX_CHORDS} width={430} highlightIndex={sixPlayer.index} ariaLabel="מצב יסודי מול היפוך ראשון של I, V ו־VII" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          היפוך ראשון איננו "גרסה ב'" של האקורד - הוא כלי אחר לאותה מטרה. במצב יסודי האקורד מכריז;
          בהיפוך ראשון הוא מתחבר. לכן סקסט־אקורדים חיים באמצעי משפטים, בין נקודות היציבות, בשירות קו
          הבס.
        </Callout>
      </Section>

      <Section id="i6" num="8.2" title="‏I6 - הטוניקה משוחררת">
        <p>
          ‏I6 הוא אקורד הטוניקה עם <Deg n="3" kind="stable" /> בבס. ההרמוניה נשארת "בית", אבל הבס כבר
          איננו מסומר לדו: הוא רשאי לטפס אל מי, ומשם להמשיך - למשל אל סול של V. כך מהלך I–V–I מקבל בס
          מגוון בלי שינוי הרמוני אמיתי. בהכפלה, I6 גמיש: מכפילים את מה שנוח להובלת הקולות - כאן הסופרן
          והאלט חולקים את דו:
        </p>
        <Widget
          title="‏I–I6–V–I: הבס זז, ההרמוניה נשארת בבית"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(I6_MOVE, 1.5)} bpm={72} player={i6Player} />}
        >
          <SatbScores chords={I6_MOVE} marks={["I", "I6", "V", "I"]} highlight={i6Player.index} width={340} label="מהלך I–I6–V–I" />
        </Widget>
      </Section>

      <Section id="v6" num="8.3" title="‏V6 - הצליל המוביל בבס">
        <p>
          ב־V6 יושב בבס הצליל שהכי רוצה לזוז: <Deg n="7" kind="active" />. מכאן נובע הכול - הבס{" "}
          <em className="hl">חייב</em> להיפתר בצעד מעלה אל הטוניקה, ולכן V6 מופיע כמעט תמיד צמוד ל־I,
          כשכן תחתון: דו–סי–דו. ומכיוון שהבס הוא הצליל המוביל, <b>לעולם אין מכפילים אותו</b> - הכפלה
          תגרור שני קולות שנפתרים לאותו מקום, כלומר אוקטבות מקבילות:
        </p>
        <Widget
          title="‏I–V6–I: שכן תחתון בבס - סי נפתר חזרה אל דו"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(V6_MOVE, 1.5)} bpm={72} player={v6Player} />}
        >
          <SatbScores chords={V6_MOVE} marks={["I", "V6", "I"]} highlight={v6Player.index} width={320} label="מהלך I–V6–I" />
        </Widget>
        <Callout label="השוו">
          ‏V7 שלם אילץ אותנו לוותר על הקווינטה של הטוניקה (יחידה 7). ‏V6 נותן דומיננטה מלאה ופתרון מלא -
          בלי מחיר. זה יתרון קבוע של היפוכים: חובות הפתרון מתקיימות בצעדים, והחשבון יוצא חלק.
        </Callout>
      </Section>

      <Section id="vii6" num="8.4" title="‏VII6 - אקורד המעבר">
        <p>
          משולש הדרגה השביעית הוא מוקטן - קווינטה מוקטנת מעל היסוד - ולכן במצב יסודי כמעט אינו מופיע:
          הדיסוננס גלוי מדי מעל הבס. אבל בהיפוך ראשון הבס שלו הוא <Deg n="2" kind="active" />, בדיוק
          הצעד שבין דו למי - ו־VII6 הופך ל
          <Term he="אקורד מעבר" en="Passing chord" def="אקורד שממלא צעד בין שני אקורדים יציבים, כשם שצליל עובר ממלא צעד בין שני צלילים." /> המושלם
          בין I ל־I6. מכפילים בו את הבס - הצליל היחיד שאינו שייך לטריטון:
        </p>
        <Widget
          title="‏VII6 מגשר בין שני מצבי הטוניקה - בחרו כיוון"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {VII6_FORMS.map((f, i) => (
                  <button key={f.he} role="tab" aria-selected={viiTab === i} onClick={() => setViiTab(i)}>
                    {f.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את המהלך" events={chordSeq([...viiForm.chords], 1.5)} bpm={72} player={viiPlayer} />
            </>
          }
        >
          <SatbScores
            key={viiForm.he}
            chords={[...viiForm.chords]}
            marks={[...viiForm.marks]}
            highlight={viiPlayer.index}
            width={320}
            label={`מעבר ${viiForm.he}`}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {viiForm.note}
          </p>
        </Widget>
        <Callout label="דקות חשובה">
          בתוך VII6 מסתתר הטריטון פה–סי. בפתרון רגיל פה יורדת אל מי - אבל כשהאקורד משמש מעבר צעדי,
          הדין מוקל: <Deg n="4" kind="active" /> רשאית להמשיך מעלה אל <Deg n="5" kind="stable" /> עם כיוון הקו. תנועת
          המעבר, כמו בקונטרפונקט, מרככת את חובות הדיסוננס.
        </Callout>
      </Section>

      <Section id="line" num="8.5" title="קו בס מלודי - הכול ביחד">
        <p>
          עכשיו אפשר לראות בשביל מה כל זה: עם I, ‏I6, ‏V, ‏V6 ו־VII6 בלבד, הבס מפסיק להיות ספק שורשים
          והופך למלודיה של ממש - שכן תחתון, טיפוס בצעדים, ורק בקדנצה קפיצת היסודות המוכרת. הקשיבו לבס
          לבדו: דו–סי–דו–רה–מי–סול–דו - קו שאפשר לשיר:
        </p>
        <Widget
          title="‏I–V6–I–VII6–I6–V–I: בס שהוא מנגינה"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(BASS_LINE, 1.4)} bpm={76} player={linePlayer} />}
        >
          <SatbScores chords={BASS_LINE} marks={BASS_MARKS} highlight={linePlayer.index} width={480} label="מהלך שלם עם קו בס מלודי" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          זו חלוקת העבודה של ההרמוניה הטונאלית: מצבים יסודיים מציבים את עמודי התווך - בפתיחה ובקדנצה -
          וסקסט־אקורדים מותחים ביניהם קווים. כשקוראים בס של כורל, מהירות הזיהוי הזו היא הכול: קפיצה =
          עמוד, צעד = גשר.
        </Callout>
      </Section>

      <Section id="minor" num="8.6" title="ובמינור? אותו דקדוק, עם 7 מוגבהת">
        <p>
          הכול עובר למינור כמות שהוא - ובלבד שנזכור את הכלל מיחידה 7: הדומיננטה זקוקה לצליל מוביל, ולכן
          מגביהים את <Deg n="7" kind="active" /> גם בתוך VII6. בלה מינור, סול♯ הוא חלק מהאקורד, והבס - סי, הסופרטוניקה
          - מגשר בין לה לדו של i6:
        </p>
        <Widget
          title="‏i–VII6–i6 בלה מינור - שימו לב לסול הדיאז"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(MINOR_PASSING, 1.5)} bpm={72} player={minorPlayer} />}
        >
          <SatbScores
            chords={MINOR_PASSING}
            marks={["i", "VII6", "i6"]}
            highlight={minorPlayer.index}
            width={320}
            label="מהלך i–VII6–i6 בלה מינור"
            accidentalKey="Am"
          />
        </Widget>
      </Section>

      <Section id="review" num="8.7" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>סקסט־אקורד</b>היפוך ראשון: טרצה בבס, ספרור 6. קליל ומחבר.</div>
          <div className="review-chip"><b>I6</b>‏3 בבס - הטוניקה נשארת, הבס משתחרר לזוז.</div>
          <div className="review-chip"><b>V6</b>הצליל המוביל בבס, נפתר מעלה אל 1. לעולם לא מכפילים את הבס.</div>
          <div className="review-chip"><b>VII6</b>אקורד מעבר בין I ל־I6, בס על 2. מכפילים את הבס.</div>
          <div className="review-chip"><b>הטריטון של VII6</b>במעבר צעדי, 4 רשאית לעלות אל 5 עם הקו.</div>
          <div className="review-chip"><b>הכפלה בסקסט־אקורדים</b>גמישה - לפי הובלת הקולות; רק צליל מוביל אסור.</div>
          <div className="review-chip"><b>חלוקת עבודה</b>מצבים יסודיים = עמודים; היפוכים = גשרים של צעדים.</div>
          <div className="review-chip"><b>במינור</b>מגביהים את 7 גם ב־VII6 - סימן מזדמן, כמו ב־V.</div>
        </div>
      </Section>

      <Section id="drills" num="8.8" title="תרגול - עד שזה אוטומטי">
        <Drill title="מי בבס?" generate={bassQuestion} />
        <Drill title="חוקי ההכפלה" generate={doublingQuestion} />
        <Drill title="תפקידי האקורדים" generate={roleQuestion} />
      </Section>

      <NextUnit current={8}>
        <b>הבא בתור - יחידה 9: היפוכי V7.</b>{" "}
        <FigText text="מה שעשינו למשולשים נעשה עכשיו לספטאקורד: ‏6/5, ‏4/3 ו־4/2 שמים כל אחד מצלילי הדומיננטה בבס - וכל אחד מביא צבע ותפקיד משלו." />
      </NextUnit>
    </div>
  );
}
