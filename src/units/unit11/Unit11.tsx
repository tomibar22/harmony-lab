import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick } from "../../components/Drill";
import { Callout, Deg, Fig, FigText, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";
import { SeqEvent } from "../../engine/audio";

/* ---------------- the double identity, as two block chords ---------------- */

const IDENTITY: ScoreNote[] = [
  { keys: ["g/4", "c/5", "e/5"], midi: [67, 72, 76], fig: "6/4", sub: "מתח: קוורטה מעל הבס", kind: "active" },
  { keys: ["g/4", "b/4", "d/5"], midi: [67, 71, 74], fig: "5/3", sub: "פתרון: V נקי", kind: "stable" },
];

/* ---------------- metric placement: strong beat → weak beat → home ---------------- */

const METER_DEMO: ScoreNote[] = [
  { keys: ["g/4", "c/5", "e/5"], midi: [67, 72, 76], duration: "q", fig: "6/4", mark: "חזק", kind: "active" },
  { keys: ["g/4", "b/4", "d/5"], midi: [67, 71, 74], duration: "q", fig: "5/3", mark: "חלש" },
  { bar: true, keys: [], midi: [] },
  { keys: ["e/4", "g/4", "c/5"], midi: [64, 67, 72], duration: "h", mark: "I", kind: "stable" },
];

/* ---------------- the reusable four-voice chords (C major) ----------------
   every adjacent pair in every progression below was checked by hand
   for parallels, resolution duties, ranges and spacing */

const I_OPEN: Satb = { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] };

/* full cadence approached from II6: bass fa–sol, then 6/4 melts into 5/3 */
const CADENCE: Satb[] = [
  I_OPEN,
  { s: ["d/5", 74], a: ["f/4", 65], t: ["a/3", 57], b: ["f/3", 53] },
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["g/3", 55] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/3", 55] },
  I_OPEN,
];
const CADENCE_MARKS = ["I", "II6", "V64", "V53", "I"];

/* with V7: the octave above the bass falls to the seventh (8–7) */
const TO_V7: Satb[] = [
  I_OPEN,
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["g/2", 43] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["f/3", 53], b: ["g/2", 43] },
  { s: ["c/5", 72], a: ["c/4", 60], t: ["e/3", 52], b: ["c/3", 48] },
];
const TO_V7_MARKS = ["I", "V64", "V7", "I"];

/* ---------------- in minor: 4 resolves onto the raised leading tone ---------------- */

const MINOR_CAD: Satb[] = [
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["e/2", 40] },
  { s: ["g#/4", 68], a: ["b/3", 59], t: ["d/3", 50], b: ["e/2", 40] },
  { s: ["a/4", 69], a: ["a/3", 57], t: ["c/3", 48], b: ["a/2", 45] },
];
const MINOR_MARKS = ["i", "V64", "V7", "i"];

/* barlines occupy a highlight slot but not a time slot */
function seqOf(notes: ScoreNote[], dur = 1.3): SeqEvent[] {
  const evs: SeqEvent[] = [];
  let beat = 0;
  notes.forEach((n, i) => {
    if (n.bar) return;
    evs.push({ midi: [...n.midi], time: beat * dur, dur: dur * 1.04, idx: i });
    beat++;
  });
  return evs;
}

/* ---------------- drills ---------------- */

const IDENTITY_POOL: Question[] = [
  {
    prompt: <>הקוורט־סקסט הקדנציאלי מכיל את צלילי הטוניקה. כמי הוא מתפקד?</>,
    options: [
      "כקישוט של הדומיננטה - שני עיכובים מעל בס של V",
      "כטוניקה לכל דבר",
      "כאקורד הכנה כמו II6",
      "כאקורד מעבר",
    ],
    answer: "כקישוט של הדומיננטה - שני עיכובים מעל בס של V",
    explain: <>האוזן שומעת את הבס: סול שמחכה לפתרון. הסקסטה והקוורטה שמעליו הן מתח שנמס אל V.</>,
  },
  {
    prompt: <>איזה צליל מכפילים בקוורט־סקסט הקדנציאלי?</>,
    options: ["את הבס - הדומיננטה", "את הקוורטה", "את הסקסטה", "מה שנוח"],
    answer: "את הבס - הדומיננטה",
    explain: <>תמיד את הבס: הוא הצליל האמיתי היחיד באקורד - השאר עיכובים שדינם לרדת.</>,
  },
  {
    prompt: <>מדוע האקורד הזה איננו \"טוניקה בהיפוך שני\" מבחינת התפקוד?</>,
    options: [
      "כי הקוורטה מעל הבס דיסוננטית - והאקורד כולו נשען על V",
      "כי אין בו את צליל הטוניקה",
      "כי הוא תמיד במינור",
      "כי הבס שלו הוא הטוניקה",
    ],
    answer: "כי הקוורטה מעל הבס דיסוננטית - והאקורד כולו נשען על V",
    explain: <>כבר ביחידה 4 ראינו שההיפוך השני מיוחד: הקוורטה מעל הבס נחשבת דיסוננס - וכאן היא מתנהגת בדיוק כמו השהיה.</>,
  },
];

function identityQuestion(): Question {
  return pick(IDENTITY_POOL);
}

const RESOLVE_POOL: Question[] = [
  {
    prompt: <>לאן הולכת הסקסטה שמעל הבס (מי, בדו מז'ור)?</>,
    options: ["יורדת בצעד אל רה - הקווינטה של V", "עולה אל פה", "נשארת במקום", "קופצת אל סול"],
    answer: "יורדת בצעד אל רה - הקווינטה של V",
    explain: <>‏6 ← 5: העיכוב נמס כלפי מטה, כמו השהיה מהמין הרביעי.</>,
  },
  {
    prompt: <>לאן הולכת הקוורטה שמעל הבס (דו, בדו מז'ור)?</>,
    options: ["יורדת בצעד אל סי - הטרצה של V", "עולה אל רה", "נשארת תמיד", "קופצת אל מי"],
    answer: "יורדת בצעד אל סי - הטרצה של V",
    explain: <>‏4 ← 3: הדיסוננס האמיתי של האקורד יורד אל הצליל המוביל.</>,
  },
  {
    prompt: <>ומה עושה האוקטבה שמעל הבס כשממשיכים אל V7?</>,
    options: ["יורדת אל הספטימה: 8 ← 7", "עולה אל 9", "נשארת בהכרח", "נעלמת"],
    answer: "יורדת אל הספטימה: 8 ← 7",
    explain: <>סול שמעל הבס יורד אל פה - וכל שלושת הקולות העליונים זולגים מטה בצעד אחד מתואם.</>,
  },
  {
    prompt: <>בלה מינור, אל איזה צליל נפתרת הקוורטה (לה)?</>,
    options: ["סול דיאז - הצליל המוביל המוגבה", "סול טבעי", "פה", "סי"],
    answer: "סול דיאז - הצליל המוביל המוגבה",
    explain: <>‏4 ← 3 נוחת על הטרצה של V - ובמינור זו חייבת להיות מוגבהת: סימן מזדמן, כרגיל.</>,
  },
];

function resolveQuestion(): Question {
  return pick(RESOLVE_POOL);
}

const CRAFT_POOL: Question[] = [
  {
    prompt: <>איפה במשקל חייב לשבת הקוורט־סקסט הקדנציאלי?</>,
    options: [
      "בפעמה חזקה מזו של הפתרון",
      "בפעמה חלשה מזו של הפתרון",
      "לא משנה איפה",
      "רק בסוף התיבה",
    ],
    answer: "בפעמה חזקה מזו של הפתרון",
    explain: <>עיכוב דורש הטעמה: מתח על החזק, פתרון על החלש. במיקום הפוך האפקט מתאייד.</>,
  },
  {
    prompt: <>איך מסמנים את האקורד באנליזה, בשיטת הספר?</>,
    options: [
      { value: "V64-53", label: <FigText text="‏V אחד עם ‏6/4 שנמשך אל ‏5/3" /> },
      { value: "I64", label: <FigText text="‏I עם ספרור ‏6/4, כטוניקה" /> },
      { value: "IV", label: <>‏IV</> },
      { value: "II64", label: <FigText text="‏II עם ‏6/4" /> },
    ],
    answer: "V64-53",
    answerLabel: <FigText text="‏V אחד עם ‏6/4 שנמשך אל ‏5/3" />,
    explain: <>הסימון משקף את התפקוד: דומיננטה אחת ארוכה, שהספרות שלה מתחלפות - לא שני אקורדים נפרדים.</>,
  },
  {
    prompt: <>מאילו אקורדים מגיעים בדרך כלל אל הקוורט־סקסט הקדנציאלי?</>,
    options: ["‏I, ‏I6, ‏IV או II6 - אקורדי טוניקה והכנה", "‏V או V7", "‏VII6", "רק מ־I"],
    answer: "‏I, ‏I6, ‏IV או II6 - אקורדי טוניקה והכנה",
    explain: <>הוא עומד בשער הדומיננטה, ולכן כל מה שמוביל אל V יכול להוביל גם אליו.</>,
  },
];

function craftQuestion(): Question {
  return pick(CRAFT_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit11() {
  const idPlayer = usePlayer();
  const cadPlayer = usePlayer();
  const v7Player = usePlayer();
  const meterPlayer = usePlayer();
  const minorPlayer = usePlayer();

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 11 · חלק שני</div>
        <h1>הקוורט־סקסט הקדנציאלי</h1>
        <p className="lede">
          רגע לפני הקדנצה, מופיע אקורד עם זהות כפולה: הצלילים של הטוניקה, הבס של הדומיננטה. זהו אחד
          הרגעים הדרמטיים של הסגנון הקלאסי - עיכוב מחושב שמותח את הרגע שלפני V - וגם שיעור מרתק על
          ההבדל בין מה שאקורד <em className="hl">מכיל</em> למה שהוא <em className="hl">עושה</em>.
        </p>
      </header>

      <Section id="identity" num="11.1" title="אקורד עם זהות כפולה">
        <p>
          קחו את הבס של V - סול - והניחו מעליו את צלילי I: דו ומי. על הנייר קיבלנו \"טוניקה בהיפוך
          שני\". אבל האוזן שומעת אחרת: הבס סול שולט, ומעליו <b>סקסטה</b> (מי) ו<b>קוורטה</b> (דו)
          שתלויות באוויר - שני{" "}
          <Term he="עיכובים" en="Suspensions" def="צלילים זרים שמתעכבים מעל הרמוניה חדשה ואז נפתרים בצעד יורד - כמו ההשהיה מהמין הרביעי בקונטרפונקט." /> שדינם
          לרדת: מי אל רה, דו אל סי. ברגע שהם יורדים, נשארת דומיננטה נקייה. לכן שמו האמיתי של האקורד
          איננו \"I בהיפוך\" אלא ה
          <Term he="קוורט־סקסט הקדנציאלי" en="Cadential six-four" def="אקורד 6/4 על בס הדומיננטה, בקדנצה: הקוורטה והסקסטה מעכבות את הטרצה והקווינטה של V ונפתרות מטה." /> -
          קישוט של V, לא טוניקה:
        </p>
        <Widget
          title="‏6/4 נמס אל 5/3 - אותו בס, המתח יורד צעד"
          legend={
            <>
              <span><span className="dot active" />מתח</span>
              <span><span className="dot stable" />פתרון</span>
            </>
          }
          foot={<PlayButton label="נגנו את הזוג" events={seqOf(IDENTITY, 1.4)} bpm={72} player={idPlayer} />}
        >
          <Score notes={IDENTITY} width={280} highlightIndex={idPlayer.index} ariaLabel="הקוורט־סקסט הקדנציאלי ופתרונו" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          תווית אינה תפקוד. שני אקורדים עשויים להכיל את אותם צלילים בדיוק - ולעשות דברים הפוכים.
          הקוורט־סקסט הקדנציאלי הוא ההוכחה: כל מה שמעל הבס מתנהג כעיכוב, ולכן האקורד כולו הוא
          דומיננטה מקושטת. לכן גם מסמנים אותו <span dir="ltr">V</span> עם <Fig n="6/4" /> שנמשך אל{" "}
          <Fig n="5/3" /> - ולא כ־I.
        </Callout>
      </Section>

      <Section id="rules" num="11.2" title="שלושה חוקים - והקדנצה המפוארת">
        <p>
          המלאכה פשוטה כשזוכרים ששני הצלילים העליונים הם עיכובים: <b>(1)</b> מכפילים תמיד את הבס -
          הצליל האמיתי היחיד; <b>(2)</b> הסקסטה יורדת בצעד: <Deg n="3" kind="active" /> ←{" "}
          <Deg n="2" />; <b>(3)</b> הקוורטה יורדת בצעד: <Deg n="1" kind="active" /> ←{" "}
          <Deg n="7" />. הבס אינו זז עד הקדנצה עצמה. הנה הצורה הקלאסית, בהמשך ישיר ליחידה 10 - ‏II6
          מכין, והקוורט־סקסט מעכב:
        </p>
        <Widget
          title="‏I–II6–V(6/4–5/3)–I: הקדנצה במלוא הדרה"
          foot={<PlayButton label="נגנו את הקדנצה" events={chordSeq(CADENCE, 1.5)} bpm={66} player={cadPlayer} />}
        >
          <SatbScores chords={CADENCE} marks={CADENCE_MARKS} highlight={cadPlayer.index} width={400} label="קדנצה עם קוורט־סקסט קדנציאלי" />
        </Widget>
      </Section>

      <Section id="v7" num="11.3" title="ואפשר גם אל V7: ‏8 יורדת אל 7">
        <p>
          כשמעל הבס יש גם אוקטבה (סול נוסף), נפתחת אפשרות שלישית ומתוקה: בפתרון, האוקטבה יורדת אל
          הספטימה - <Deg n="5" /> ← <Deg n="4" kind="active" /> - וכל שלושת הקולות העליונים זולגים
          מטה יחד, צעד אחד כל אחד, אל V7 שלם. שרשרת של שלושה עיכובים שנפתרים בבת אחת:
        </p>
        <Widget
          title="‏I–V(6/4)–V7–I: שלושה קולות יורדים צעד מעל בס קפוא"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(TO_V7, 1.5)} bpm={66} player={v7Player} />}
        >
          <SatbScores chords={TO_V7} marks={TO_V7_MARKS} highlight={v7Player.index} width={340} label="קוורט־סקסט קדנציאלי הנפתר אל V7" />
        </Widget>
      </Section>

      <Section id="meter" num="11.4" title="החוק הרביעי: המשקל">
        <p>
          לעיכוב יש כתובת מקצבית. כדי שהמתח יורגש, הקוורט־סקסט חייב לשבת על פעמה{" "}
          <em className="hl">חזקה</em> מזו של פתרונו - מתח מוטעם, פתרון מרפה. הפכו את הסדר, והדרמה
          מתאיידת לצליל חולף. זו הסיבה שברוב הקדנצות הקלאסיות הוא נוחת על הפעמה הראשונה של תיבת
          הקדנצה:
        </p>
        <Widget
          title="מתח על החזק, פתרון על החלש - והבית בתיבה הבאה"
          foot={<PlayButton label="נגנו את התיבה" events={seqOf(METER_DEMO, 1.2)} bpm={76} player={meterPlayer} />}
        >
          <Score
            notes={METER_DEMO}
            timeSig="2/4"
            width={300}
            highlightIndex={meterPlayer.index}
            ariaLabel="מיקום מטרי של הקוורט־סקסט הקדנציאלי"
          />
        </Widget>
      </Section>

      <Section id="minor" num="11.5" title="ובמינור? הקוורטה נוחתת על ההגבהה">
        <p>
          במינור הכול זהה - עם נקודת חן אחת: הקוורטה (לה, בלה מינור) יורדת אל הטרצה של V, וזו חייבת
          להיות <em className="hl">הצליל המוביל המוגבה</em>: סול♯. העיכוב נפתר היישר אל הצליל הרגיש
          ביותר בסולם, והקדנצה מקבלת חדות כפולה:
        </p>
        <Widget
          title="‏i–V(6/4)–V7–i בלה מינור - הפתרון נוחת על סול♯"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(MINOR_CAD, 1.5)} bpm={66} player={minorPlayer} />}
        >
          <SatbScores
            chords={MINOR_CAD}
            marks={MINOR_MARKS}
            highlight={minorPlayer.index}
            width={340}
            label="קוורט־סקסט קדנציאלי בלה מינור"
            accidentalKey="Am"
          />
        </Widget>
      </Section>

      <Section id="review" num="11.6" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>זהות כפולה</b>צלילי I על בס של V - והתפקוד: דומיננטה מקושטת.</div>
          <div className="review-chip"><b>הסימון</b>‏V אחד עם 6/4 ← 5/3, לא \"I בהיפוך שני\".</div>
          <div className="review-chip"><b>הכפלה</b>תמיד את הבס - הדומיננטה, הצליל האמיתי היחיד.</div>
          <div className="review-chip"><b>הפתרון</b>‏6 ← 5 ו־4 ← 3, שניהם בצעד יורד, מעל בס קפוא.</div>
          <div className="review-chip"><b>אל V7</b>אם יש אוקטבה: 8 ← 7, ושלושת הקולות זולגים יחד.</div>
          <div className="review-chip"><b>משקל</b>המתח על פעמה חזקה מהפתרון - אחרת האפקט אובד.</div>
          <div className="review-chip"><b>הדרך פנימה</b>מ־I, ‏I6, ‏IV או II6 - כמו כל כניסה אל V.</div>
          <div className="review-chip"><b>במינור</b>הקוורטה נפתרת אל סול♯ - ההגבהה של הצליל המוביל.</div>
        </div>
      </Section>

      <Section id="drills" num="11.7" title="תרגול - עד שזה אוטומטי">
        <Drill title="מהות האקורד" generate={identityQuestion} />
        <Drill title="חובות הפתרון" generate={resolveQuestion} />
        <Drill title="מלאכת הקדנצה" generate={craftQuestion} />
      </Section>

      <NextUnit current={11}>
        <b>הבא בתור - יחידה 12: ‏VI ו־IV6.</b> ההפתעה הגדולה של ההרמוניה - הקדנצה הנמנעת, שבה V הולך
        הביתה ומוצא מישהו אחר בדלת - ועוד דרכים להרחיב את הטוניקה.
      </NextUnit>
    </div>
  );
}
