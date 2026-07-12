import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";

/* ---------------- the borrowed palette: three pairs ---------------- */

const PALETTE: ScoreNote[] = [
  { keys: ["f/4", "a/4", "c/5"], midi: [65, 69, 72], mark: "IV", sub: "דיאטוני" },
  { keys: ["f/4", "ab/4", "c/5"], midi: [65, 68, 72], mark: "iv", sub: "מושאל", kind: "active" },
  { bar: true, keys: [], midi: [] },
  { keys: ["a/4", "c/5", "e/5"], midi: [69, 72, 76], mark: "VI", sub: "דיאטוני" },
  { keys: ["ab/4", "c/5", "eb/5"], midi: [68, 72, 75], mark: "♭VI", sub: "מושאל", kind: "active" },
  { bar: true, keys: [], midi: [] },
  { keys: ["d/4", "f/4", "a/4"], midi: [62, 65, 69], mark: "II", sub: "דיאטוני" },
  { keys: ["d/4", "f/4", "ab/4"], midi: [62, 65, 68], mark: "II°", sub: "מושאל", kind: "active" },
];

/* ---------------- the reusable four-voice chords ----------------
   every adjacent pair in every progression below was checked by hand;
   the borrowed b6 always falls by half step, never near the leading tone */

const I_OPEN: Satb = { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] };
const V_CLOSE: Satb = { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/3", 55] };
const V7_FULL: Satb = { s: ["b/4", 71], a: ["d/4", 62], t: ["f/3", 53], b: ["g/2", 43] };

const SUBDOM_FORMS = [
  {
    he: "‏IV דיאטוני",
    chords: [I_OPEN, { s: ["c/5", 72], a: ["f/4", 65], t: ["a/3", 57], b: ["f/3", 53] }, V_CLOSE, I_OPEN] as Satb[],
    marks: ["I", "IV", "V", "I"],
    note: "המוכר מיחידה 10: לה יורדת אל סול בטון שלם, והכול בהיר.",
  },
  {
    he: "‏iv מושאל",
    chords: [I_OPEN, { s: ["c/5", 72], a: ["f/4", 65], t: ["ab/3", 56], b: ["f/3", 53] }, V_CLOSE, I_OPEN] as Satb[],
    marks: ["I", "iv", "V", "I"],
    note: "אותו מהלך - אבל לה♭ נמסה אל סול בחצי טון, והרגע מתקדר. עקבו אחרי הטנור: סול–לה♭–סול.",
  },
] as const;

const DECEPTIVE_FORMS = [
  {
    he: "נמנעת רגילה: V7 ← VI",
    chords: [I_OPEN, V7_FULL, { s: ["c/5", 72], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] }] as Satb[],
    marks: ["I", "V7", "VI"],
    note: "ההפתעה המוכרת מיחידה 12 - הבית מתחלף בקרוב משפחה מינורי.",
  },
  {
    he: "נמנעת מושאלת: V7 ← ‏♭VI",
    chords: [I_OPEN, V7_FULL, { s: ["c/5", 72], a: ["c/4", 60], t: ["eb/3", 51], b: ["ab/2", 44] }] as Satb[],
    marks: ["I", "V7", "♭VI"],
    note: "הבס עולה חצי טון בלבד - סול–לה♭ - והאקורד שמתקבל מז'ורי אך זר, כאילו נפתחה דלת לעולם אחר. הרגע האהוב על שוברט.",
  },
] as const;

/* ---------------- the Picardy third: mixture in reverse ---------------- */

const PICARDY: Satb[] = [
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
  { s: ["g#/4", 68], a: ["b/3", 59], t: ["d/3", 50], b: ["e/2", 40] },
  { s: ["a/4", 69], a: ["a/3", 57], t: ["c#/3", 49], b: ["a/2", 45] },
];
const PICARDY_MARKS = ["i", "V7", "I"];

/* ---------------- drills ---------------- */

const BORROW_POOL = [
  { chord: "iv בדו מז'ור", tone: "לה♭", why: "הסובדומיננטה המינורית: פה–לה♭–דו. הצליל השאול מדו מינור." },
  { chord: "‏♭VI בדו מז'ור", tone: "לה♭ (וגם מי♭)", why: "לה♭–דו–מי♭ - אקורד שלם מהצד המונמך של המינור המקביל." },
  { chord: "‏II° בדו מז'ור", tone: "לה♭", why: "רה–פה–לה♭: הסופרטוניקה נעשית מוקטנת - כמו במינור, וכמוה תעדיף היפוך ראשון." },
] as const;

function borrowQuestion(): Question {
  const q = pick(BORROW_POOL);
  return {
    prompt: <>איזה צליל מושאל יוצר את {q.chord}?</>,
    options: shuffle(["לה♭", "לה♭ (וגם מי♭)", "פה♯", "סי♭"]),
    answer: q.tone,
    explain: <>{q.why}</>,
  };
}

const CONCEPT_POOL: Question[] = [
  {
    prompt: <>מהי מיקסטורה, ובמה היא שונה מטוניקיזציה וממודולציה?</>,
    options: [
      "השאלת אקורדים מהמקביל בלי לעזוב את הטוניקה - צבע, לא מסע",
      "שם אחר למודולציה",
      "מעבר לסולם רחוק",
      "סוג של קדנצה",
    ],
    answer: "השאלת אקורדים מהמקביל בלי לעזוב את הטוניקה - צבע, לא מסע",
    explain: <>שלושת כיווני הכרומטיקה: להציץ החוצה (טוניקיזציה), לעבור דירה (מודולציה), ולהכניס אורח פנימה (מיקסטורה).</>,
  },
  {
    prompt: <>מהו צליל החתימה של המיקסטורה במז'ור, ומה דינו?</>,
    options: [
      "‏♭6 (לה♭ בדו מז'ור) - נמס אל 5 בחצי טון יורד",
      "‏♯4 - עולה",
      "‏♭7 - נשאר במקום",
      "‏♭2 - קופץ",
    ],
    answer: "‏♭6 (לה♭ בדו מז'ור) - נמס אל 5 בחצי טון יורד",
    explain: <>המראה של הצליל המוביל: כמו שסי נמשך מעלה אל דו, לה♭ נמשך מטה אל סול - מגנט בכיוון ההפוך.</>,
  },
  {
    prompt: <>מדוע אקורדי המיקסטורה אינם מערערים את הטוניקה?</>,
    options: [
      "הם מחליפים מודוס, לא מרכז: דו נשארת הבית - רק צבעה מתחלף",
      "כי הם שקטים",
      "הם דווקא מערערים",
      "כי אין בהם סימנים",
    ],
    answer: "הם מחליפים מודוס, לא מרכז: דו נשארת הבית - רק צבעה מתחלף",
    explain: <>דו מז'ור ודו מינור חולקים טוניקה ודומיננטה. ההשאלה נוגעת בצבע - לא בכוח המשיכה.</>,
  },
  {
    prompt: <>במה מסוכנת הנמנעת המושאלת (V7 ← ‏♭VI) מבחינת הובלת קולות?</>,
    options: [
      "כרגיל בנמנעת - מכפילים את הטרצה (הטוניקה), והקולות נפתרים כדין; רק הבס זז חצי טון",
      "אסור לבצע אותה",
      "הצליל המוביל יורד בה",
      "אין בה שום כלל",
    ],
    answer: "כרגיל בנמנעת - מכפילים את הטרצה (הטוניקה), והקולות נפתרים כדין; רק הבס זז חצי טון",
    explain: <>כללי יחידה 12 שרירים גם בגרסה המושאלת: הצליל המוביל מעלה, הספטימה מטה, והטרצה מוכפלת.</>,
  },
];

function conceptQuestion(): Question {
  return pick(CONCEPT_POOL);
}

const PICARDY_POOL: Question[] = [
  {
    prompt: <>מהי טרצת פיקרדי?</>,
    options: [
      "סיום יצירה מינורית על אקורד טוניקה מז'ורי - הטרצה מוגבהת ברגע האחרון",
      "טרצה מקבילה אסורה",
      "שם של קדנצה נמנעת",
      "מרווח מוגדל",
    ],
    answer: "סיום יצירה מינורית על אקורד טוניקה מז'ורי - הטרצה מוגבהת ברגע האחרון",
    explain: <>מיקסטורה במראה: המינור שואל מהמז'ור המקביל את הצליל האחד שהופך את סופו לאור.</>,
  },
  {
    prompt: <>מה מוכיחה טרצת פיקרדי על המיקסטורה?</>,
    options: [
      "שההשאלה עובדת לשני הכיוונים - גם המינור שואב מהמז'ור המקביל",
      "שהיא מותרת רק במז'ור",
      "שהיא טעות עתיקה",
      "שום דבר",
    ],
    answer: "שההשאלה עובדת לשני הכיוונים - גם המינור שואב מהמז'ור המקביל",
    explain: <>שני מודוסים על אותה טוניקה הם שני צבעים של בית אחד - והדלת ביניהם פתוחה משני העברים.</>,
  },
];

function picardyQuestion(): Question {
  return pick(PICARDY_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit22() {
  const palPlayer = usePlayer();
  const subPlayer = usePlayer();
  const decPlayer = usePlayer();
  const picPlayer = usePlayer();
  const [subTab, setSubTab] = useState(0);
  const [decTab, setDecTab] = useState(0);

  const subForm = SUBDOM_FORMS[subTab];
  const decForm = DECEPTIVE_FORMS[decTab];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 22 · חלק חמישי</div>
        <h1>מיקסטורה: צבעים מהמקביל</h1>
        <p className="lede">
          הכיוון השלישי של הכרומטיקה: לא להציץ החוצה (יחידה 20) ולא לעבור דירה (יחידה 21) - אלא
          להזמין אורחים פנימה. דו מז'ור ודו מינור חולקים טוניקה, דומיננטה וכוח משיכה; כל מה שמפריד
          ביניהם הוא צבע. <Term he="מיקסטורה" en="Mixture" def="השאלת אקורדים מהמודוס המקביל - לרוב מהמינור אל המז'ור - בלי לעזוב את הטוניקה." /> פותחת
          את הדלת שביניהם.
        </p>
      </header>

      <Section id="palette" num="22.1" title="הפלטה המושאלת - ולה♭ שבמרכזה">
        <p>
          רוב ההשאלות מגיעות מהצד המונמך של המינור, וכמעט כולן נושאות צליל אחד: <b>‏♭6</b> - לה♭
          בדו מז'ור. זו המראָה של הצליל המוביל: כמו שסי נמשך בחצי טון <em className="hl">מעלה</em>{" "}
          אל דו, לה♭ נמשך בחצי טון <em className="hl">מטה</em> אל סול. שלושת המושאלים הגדולים -
          הקשיבו איך צליל אחד מקדיר כל זוג:
        </p>
        <Widget
          title="שלושה זוגות: דיאטוני מול מושאל - ההבדל תמיד לה♭"
          foot={
            <PlayButton
              label="נגנו את הזוגות"
              events={PALETTE.filter((n) => !n.bar).map((n) => ({ midi: [...n.midi], time: PALETTE.filter((m) => !m.bar).indexOf(n) * 1.15, dur: 1.2, idx: PALETTE.indexOf(n) }))}
              bpm={76}
              player={palPlayer}
            />
          }
        >
          <Score notes={PALETTE} width={460} highlightIndex={palPlayer.index} ariaLabel="אקורדים דיאטוניים מול מושאלים" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          מיקסטורה מחליפה <em className="hl">מודוס</em>, לא מרכז: הטוניקה נשארת דו, הדומיננטה נשארת
          סול, והתחביר כולו - T–S–D–T - עומד על תילו. רק הצבע מתקדר לרגע. לכן אפשר להשאיל בחופשיות
          כזו: האורחים מדברים את אותה שפה.
        </Callout>
      </Section>

      <Section id="iv" num="22.2" title="‏iv - הסובדומיננטה המושאלת">
        <p>
          ההשאלה הנפוצה מכולן. קחו את I–IV–V–I מיחידה 10 והנמיכו את לה ללה♭: ההכנה מתקדרת, וכשהיא
          נמסה אל הדומיננטה - חצי טון במקום טון - הקדנצה מקבלת רוך כמעט כואב. כלל אחד מלווה את{" "}
          <Deg n="6" kind="active" /> המונמכת: היא <em className="hl">יורדת תמיד</em>, ובאותו קול -
          ולעולם אינה נפגשת עם הצליל המוביל בקול אחד (סקונדה מוגדלת):
        </p>
        <Widget
          title="בחרו גרסה והשוו - ההבדל כולו בטנור"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {SUBDOM_FORMS.map((f, i) => (
                  <button key={f.he} role="tab" aria-selected={subTab === i} onClick={() => setSubTab(i)}>
                    {f.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את המהלך" events={chordSeq([...subForm.chords], 1.5)} bpm={66} player={subPlayer} />
            </>
          }
        >
          <SatbScores
            key={subForm.he}
            chords={[...subForm.chords]}
            marks={[...subForm.marks]}
            highlight={subPlayer.index}
            width={340}
            label={subForm.he}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {subForm.note}
          </p>
        </Widget>
      </Section>

      <Section id="bvi" num="22.3" title="‏♭VI - הנמנעת שנפתחת לעולם אחר">
        <p>
          ביחידה 12 ההפתעה הייתה קרוב משפחה; כאן היא זר גמור. ‏V7 מוליך אל <b>‏♭VI</b> - לה♭ מז'ור -
          והבס, במקום צעד שלם, זז <em className="hl">חצי טון</em> בלבד. כל כללי הנמנעת נשמרים
          (הטרצה - דו - מוכפלת, הקולות נפתרים כדין), אבל הצבע רחוק פתאום, מז'ורי וזוהר במקום זר:
        </p>
        <Widget
          title="שתי נחיתות - בחרו והשוו את עומק ההפתעה"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {DECEPTIVE_FORMS.map((f, i) => (
                  <button key={f.he} role="tab" aria-selected={decTab === i} onClick={() => setDecTab(i)}>
                    {f.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את הקדנצה" events={chordSeq([...decForm.chords], 1.5)} bpm={63} player={decPlayer} />
            </>
          }
        >
          <SatbScores
            key={decForm.he}
            chords={[...decForm.chords]}
            marks={[...decForm.marks]}
            highlight={decPlayer.index}
            width={320}
            label={decForm.he}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {decForm.note}
          </p>
        </Widget>
      </Section>

      <Section id="picardy" num="22.4" title="טרצת פיקרדי - מיקסטורה במראה">
        <p>
          וההשאלה עובדת גם הפוך: מאות שנים נהגו לסיים יצירות מינוריות על אקורד טוניקה{" "}
          <em className="hl">מז'ורי</em> - המינור שואל מהמז'ור המקביל את הטרצה המוגבהת, ברגע האחרון
          ממש. זו <Term he="טרצת פיקרדי" en="Picardy third" def="הגבהת הטרצה באקורד הסיום של יצירה מינורית - סיום מז'ורי לעולם מינורי." /> -
          דו♯ שמאיר את לה מינור בסופו, כמו קרן שמש אחרונה:
        </p>
        <Widget
          title="‏i–V7–I: הסיום המינורי שנפתח אל האור"
          foot={<PlayButton label="נגנו את הסיום" events={chordSeq(PICARDY, 1.6)} bpm={56} player={picPlayer} />}
        >
          <SatbScores
            chords={PICARDY}
            marks={PICARDY_MARKS}
            highlight={picPlayer.index}
            width={320}
            label="טרצת פיקרדי בלה מינור"
            accidentalKey="Am"
          />
        </Widget>
      </Section>

      <Section id="review" num="22.5" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>מיקסטורה</b>השאלה מהמקביל - מחליפה מודוס, לא מרכז.</div>
          <div className="review-chip"><b>שלושת הכיוונים</b>להציץ (טוניקיזציה), לעבור (מודולציה), להזמין (מיקסטורה).</div>
          <div className="review-chip"><b>צליל החתימה</b>‏♭6 - המראה של הצליל המוביל: נמס בחצי טון אל 5.</div>
          <div className="review-chip"><b>המושאלים הגדולים</b>‏iv, ‏♭VI, ‏II° - כולם נושאים את לה♭.</div>
          <div className="review-chip"><b>iv</b>הכנה שמתקדרת: לה♭ יורדת אל סול, באותו קול, בלי סקונדה מוגדלת.</div>
          <div className="review-chip"><b>♭VI</b>נמנעת מושאלת: בס בחצי טון, טרצה מוכפלת, צבע מעולם אחר.</div>
          <div className="review-chip"><b>פיקרדי</b>ההשאלה ההפוכה: מינור שמסתיים על I מז'ורי.</div>
          <div className="review-chip"><b>הלקח</b>מז'ור ומינור על אותה טוניקה - שני צבעים של בית אחד.</div>
        </div>
      </Section>

      <Section id="drills" num="22.6" title="תרגול - עד שזה אוטומטי">
        <Drill title="מי הושאל, ואיך" generate={borrowQuestion} />
        <Drill title="שלושת הכיוונים" generate={conceptQuestion} />
        <Drill title="טרצת פיקרדי" generate={picardyQuestion} />
      </Section>

      <NextUnit current={22}>
        <b>סוף החלק החמישי - ותחנה גדולה במסע.</b> עשרים ושתיים יחידות: מסולם ראשון ועד כרומטיקה על
        שלושת כיווניה. הכלים שבידיכם פותחים כעת את רוב המוזיקה הטונאלית - קראו, נגנו, נתחו. והדרך
        עוד ארוכה ויפה: ספטאקורדים מוקטנים, נאפוליטנים, מודולציות רחוקות - עולמות שממתינים בפרקי
        ההמשך של הספר.
      </NextUnit>
    </div>
  );
}
