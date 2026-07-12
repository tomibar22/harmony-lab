import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Fig, FigText, PlayButton, Section, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";

/* ---------------- the reusable four-voice chords ----------------
   every adjacent pair in every progression below was checked by hand
   for parallels, resolution duties, ranges and spacing */

const I_OPEN: Satb = { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] };
const I_SIX: Satb = { s: ["c/5", 72], a: ["c/4", 60], t: ["g/3", 55], b: ["e/3", 52] };

/* passing 6/4: the bass walks 1-2-3 under a dominant 6/4 */
const PASSING: Satb[] = [
  I_OPEN,
  { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["d/3", 50] },
  I_SIX,
];
const PASSING_MARKS = ["I", "V64", "I6"];

/* neighbor (pedal) 6/4: the bass holds while two voices lean up and back */
const NEIGHBOR: Satb[] = [
  I_OPEN,
  { s: ["c/5", 72], a: ["f/4", 65], t: ["a/3", 57], b: ["c/3", 48] },
  I_OPEN,
];
const NEIGHBOR_MARKS = ["I", "IV64", "I"];

/* arpeggiated 6/4: the bass climbs its own chord - and lands on the cadential */
const ARPEGGIO: Satb[] = [
  I_OPEN,
  I_SIX,
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["g/3", 55] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/3", 55] },
  I_OPEN,
];
const ARPEGGIO_MARKS = ["I", "I6", "I64", "V", "I"];

/* in minor: the passing 6/4 with the soprano leaning on G# */
const MINOR_PASSING: Satb[] = [
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
  { s: ["g#/4", 68], a: ["b/3", 59], t: ["e/3", 52], b: ["b/2", 47] },
  { s: ["a/4", 69], a: ["a/3", 57], t: ["e/3", 52], b: ["c/3", 48] },
];
const MINOR_MARKS = ["i", "V64", "i6"];

/* ---------------- drills ---------------- */

const TYPE_POOL = [
  { desc: "הבס צועד 1–2–3, וה־6/4 ממלא את האמצע", ans: "עובר", why: "כמו VII6 ו־V43 - דרך שלישית לגשר בין שני מצבי הטוניקה." },
  { desc: "הבס עומד במקום, ושני קולות נשענים מעלה וחוזרים", ans: "שכן", why: "‏IV64 מעל בס טוניקה קפוא - נדנוד עדין שאינו עוזב את הבית." },
  { desc: "הבס מטפס דרך צלילי האקורד שלו עצמו: 1–3–5", ans: "מפורק", why: "הבס מארפג' את האקורד; ה־6/4 הוא פשוט התחנה העליונה." },
  { desc: "על פעמה חזקה, רגע לפני V בקדנצה", ans: "קדנציאלי", why: "המוכר מיחידה 11: שני עיכובים מעל בס הדומיננטה." },
] as const;

function typeQuestion(): Question {
  const q = pick(TYPE_POOL);
  return {
    prompt: <>{q.desc} - איזה 6/4 זה?</>,
    options: shuffle(TYPE_POOL.map((t) => t.ans)),
    answer: q.ans,
    explain: <>{q.why}</>,
  };
}

const RULE_POOL: Question[] = [
  {
    prompt: <>מה משותף לכל סוגי ה־6/4?</>,
    options: [
      "מכפילים את הבס, והאקורד נשען על הקשר מבוקר - לא עומד בפני עצמו",
      "כולם מופיעים רק בקדנצות",
      "כולם דורשים בס קופץ",
      "אין ביניהם שום דבר משותף",
    ],
    answer: "מכפילים את הבס, והאקורד נשען על הקשר מבוקר - לא עומד בפני עצמו",
    explain: <>הקוורטה מעל הבס דיסוננטית - ולכן ההיפוך השני חי רק בתבניות שמצדיקות אותו: מעבר, שכנות, פירוק או עיכוב.</>,
  },
  {
    prompt: <>מדוע ההיפוך השני \"מסוכן\" מלכתחילה?</>,
    options: [
      "הקוורטה שמעל הבס נחשבת דיסוננס - האקורד אינו יציב",
      "יש בו יותר מדי צלילים",
      "הוא תמיד חזק מדי",
      "אסור בכלל להשתמש בו",
    ],
    answer: "הקוורטה שמעל הבס נחשבת דיסוננס - האקורד אינו יציב",
    explain: <>עוד מיחידה 4: מעל הבס, הקוורטה דורשת טיפול. לכן 6/4 לעולם אינו \"סתם עוד היפוך\".</>,
  },
  {
    prompt: <>ב־6/4 העובר בין I ל־I6, מי בדרך כלל הצליל המוכפל?</>,
    options: [
      "הבס - הדרגה החמישית, שהיא הקווינטה של האקורד",
      "הצליל המוביל",
      "הקוורטה",
      "מה שיוצא",
    ],
    answer: "הבס - הדרגה החמישית, שהיא הקווינטה של האקורד",
    explain: <>הכלל אחיד לכל משפחת ה־6/4: הבס מוכפל - הוא העוגן שהתבנית כולה נשענת עליו.</>,
  },
  {
    prompt: <>מה מגלה ה־6/4 המפורק על הקוורט־סקסט הקדנציאלי?</>,
    options: [
      "שהבס יכול להגיע אליו מתוך אקורד הטוניקה עצמו - בפירוק 1–3–5",
      "שהוא בעצם אקורד טוניקה",
      "שאין צורך לפתור אותו",
      "שהוא קיים רק במז'ור",
    ],
    answer: "שהבס יכול להגיע אליו מתוך אקורד הטוניקה עצמו - בפירוק 1–3–5",
    explain: <>הבס מטפס דו–מי–סול, ובהגיעו לסול צלילי הטוניקה שמעליו הופכים בן־רגע לעיכובים של V. שתי נקודות מבט על אותו רגע.</>,
  },
];

function ruleQuestion(): Question {
  return pick(RULE_POOL);
}

const MINOR_POOL: Question[] = [
  {
    prompt: <>ב־6/4 העובר במינור (i–V64–i6), מה קורה בסופרן?</>,
    options: [
      "נשען על סול♯ וחוזר אל לה - שכן תחתון עם הצליל המוביל",
      "יורד אל סול טבעי",
      "נשאר במקום",
      "קופץ אוקטבה",
    ],
    answer: "נשען על סול♯ וחוזר אל לה - שכן תחתון עם הצליל המוביל",
    explain: <>האקורד העובר הוא ממשפחת הדומיננטה - ולכן ההגבהה בתוקף: לה–סול♯–לה מעל בס לה–סי–דו.</>,
  },
  {
    prompt: <>האם כללי ה־6/4 משתנים במינור?</>,
    options: [
      "לא - אותן ארבע תבניות, אותה הכפלת בס; רק ההגבהות מצייתות לכללי המינור",
      "כן, הכול שונה",
      "‏6/4 אסור במינור",
      "רק הקדנציאלי קיים במינור",
    ],
    answer: "לא - אותן ארבע תבניות, אותה הכפלת בס; רק ההגבהות מצייתות לכללי המינור",
    explain: <>התבניות הן עניין של הובלת קולות - והיא אינה תלויה במודוס. הצליל המוביל המוגבה מופיע היכן שיש פונקציה דומיננטית.</>,
  },
];

function minorQuestion(): Question {
  return pick(MINOR_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit17() {
  const passPlayer = usePlayer();
  const nbrPlayer = usePlayer();
  const arpPlayer = usePlayer();
  const minorPlayer = usePlayer();

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 17 · חלק שלישי</div>
        <h1><FigText text="טכניקות 6/4: שאר בני המשפחה" /></h1>
        <p className="lede">
          את הנסיך פגשנו ביחידה 11 - הקוורט־סקסט הקדנציאלי. עכשיו שאר המשפחה: שלוש דרכים נוספות שבהן
          ההיפוך \"המסוכן\" - זה שהקוורטה שלו מעל הבס דיסוננטית - הופך לכלי עדין ומבוקר. המפתח תמיד
          זהה: ה־<Fig n="6/4" /> לעולם אינו עומד בפני עצמו; הוא חי בתוך תבנית שמצדיקה אותו.
        </p>
      </header>

      <Section id="family" num="17.1" title="משפחה אחת, כלל אחד">
        <p>
          עוד מיחידה 4 אנחנו יודעים: הקוורטה מעל הבס - דיסוננס. לכן ההיפוך השני אינו מופיע חופשי כמו
          אחיו הראשון, אלא רק בארבע תבניות שכל אחת מהן מנטרלת את הסכנה בדרכה: <b>קדנציאלי</b> (עיכוב
          - יחידה 11), <b>עובר</b> (הבס בתנועה), <b>שכן</b> (הבס קפוא), ו<b>מפורק</b> (הבס בתוך
          האקורד עצמו). ובכולן כלל ברזל אחד: <em className="hl">מכפילים את הבס</em> - העוגן שהתבנית
          נשענת עליו.
        </p>
        <Callout label="רעיון מרכזי" insight>
          ארבעת השמות אינם ארבעה אקורדים אלא ארבעה <em className="hl">הקשרים</em>. זו התמצית של החלק
          השלישי כולו: לא מה האקורד מכיל אלא מה הוא עושה - אותו 6/4 בדיוק יכול להיות עיכוב דרמטי,
          גשר צנוע או נדנוד ביתי, לפי מה שהבס והמשקל עושים סביבו.
        </Callout>
      </Section>

      <Section id="passing" num="17.2" title="ה־6/4 העובר - דרך שלישית בין I ל־I6">
        <p>
          את הבס העולה דו–רה–מי כבר גישרנו פעמיים: עם VII6 (יחידה 8) ועם V43 (יחידה 9). הדרך
          השלישית: <span dir="ltr">V</span> בהיפוך שני - <Fig n="6/4" /> על רה. הסופרן מצייר שכן
          תחתון 8–7–8, הטנור מחזיק את סול המשותף, והבס המוכפל (רה, הקווינטה של V) צועד באמצע.
          שלושה גשרים לאותו נהר - ההבדל רק בצבע:
        </p>
        <Widget
          title="‏I–V64–I6: הבס עובר, הסופרן נשען על הצליל המוביל"
          foot={<PlayButton label="נגנו את המעבר" events={chordSeq(PASSING, 1.5)} bpm={72} player={passPlayer} />}
        >
          <SatbScores chords={PASSING} marks={PASSING_MARKS} highlight={passPlayer.index} width={320} label="6/4 עובר בין I ל־I6" />
        </Widget>
      </Section>

      <Section id="neighbor" num="17.3" title="ה־6/4 השכן - נדנוד מעל בס קפוא">
        <p>
          כאן הבס אינו זז כלל: מעל דו מוחזק, הטנור והאלט נשענים צעד מעלה - סול אל לה, מי אל פה -
          ומיד שבים. לרגע נשמע אקורד הסובדומיננטה בהיפוך שני, אבל האוזן אינה עוזבת את הטוניקה:
          זהו קישוט של הבית, לא יציאה ממנו. תבנית החתימה של סיומי יצירות אינספור:
        </p>
        <Widget
          title="‏I–IV64–I: שני שכנים עליונים מעל דו שאינו זז"
          foot={<PlayButton label="נגנו את הנדנוד" events={chordSeq(NEIGHBOR, 1.5)} bpm={66} player={nbrPlayer} />}
        >
          <SatbScores chords={NEIGHBOR} marks={NEIGHBOR_MARKS} highlight={nbrPlayer.index} width={320} label="6/4 שכן מעל בס טוניקה" />
        </Widget>
      </Section>

      <Section id="arpeggio" num="17.4" title="ה־6/4 המפורק - והמפגש עם הקדנציאלי">
        <p>
          הדרך השלישית להכשיר 6/4: הבס פשוט מטייל בתוך האקורד של עצמו - דו, מי, סול - וכל התבנית
          היא הרמוניה אחת מפורקת. אבל שימו לב מה קורה כשהבס מגיע לסול: צלילי הטוניקה שמעליו הופכים
          בן־רגע לעיכובים, וה־6/4 המפורק <em className="hl">הוא עצמו</em> הקוורט־סקסט הקדנציאלי של
          יחידה 11. הבס בנה את הקדנצה מתוך אקורד הבית:
        </p>
        <Widget
          title="‏I–I6–I64–V–I: הבס מארפג' - ונוחת היישר על הקדנצה"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(ARPEGGIO, 1.4)} bpm={72} player={arpPlayer} />}
        >
          <SatbScores chords={ARPEGGIO} marks={ARPEGGIO_MARKS} highlight={arpPlayer.index} width={400} label="6/4 מפורק שהופך לקדנציאלי" />
        </Widget>
        <Callout label="דקות חשובה">
          ההבחנה בין מפורק לקדנציאלי היא עניין של משקל והמשך: בס שמטפס בפעמות קלות - פירוק תמים;
          אותו סול על פעמה חזקה, עם 6–5 ו־4–3 שנמסים אל V - קדנציאלי. שוב: ההקשר, לא הצלילים.
        </Callout>
      </Section>

      <Section id="minor" num="17.5" title="ובמינור? השכן התחתון מקבל ♯">
        <p>
          התבניות אינן משתנות - הובלת קולות היא הובלת קולות. רק כלל ההגבהות של המינור מצטרף: ה־6/4
          העובר הוא ממשפחת הדומיננטה, ולכן הסופרן נשען על <em className="hl">סול♯</em> - שכן תחתון
          בחצי טון, שנמשך חזרה אל לה בדיוק כמו ביחידה 7:
        </p>
        <Widget
          title="‏i–V64–i6 בלה מינור - לה–סול♯–לה מעל בס עולה"
          foot={<PlayButton label="נגנו את המעבר" events={chordSeq(MINOR_PASSING, 1.5)} bpm={72} player={minorPlayer} />}
        >
          <SatbScores
            chords={MINOR_PASSING}
            marks={MINOR_MARKS}
            highlight={minorPlayer.index}
            width={320}
            label="6/4 עובר בלה מינור"
            accidentalKey="Am"
          />
        </Widget>
      </Section>

      <Section id="review" num="17.6" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>הבעיה</b>קוורטה מעל הבס = דיסוננס; ‏6/4 חי רק בתבנית מצדיקה.</div>
          <div className="review-chip"><b>כלל הברזל</b>בכל סוגי ה־6/4 מכפילים את הבס.</div>
          <div className="review-chip"><b>עובר</b>‏I–V64–I6: בס 1–2–3 - אח שלישי ל־VII6 ול־V43.</div>
          <div className="review-chip"><b>שכן</b>‏I–IV64–I: בס קפוא, שני קולות נשענים מעלה וחוזרים.</div>
          <div className="review-chip"><b>מפורק</b>הבס מטייל בתוך האקורד שלו: 1–3–5 - הרמוניה אחת.</div>
          <div className="review-chip"><b>המפגש</b>פירוק שנוחת על 5 בפעמה חזקה = הקדנציאלי מיחידה 11.</div>
          <div className="review-chip"><b>ההבחנה</b>משקל והמשך קובעים את הסוג - לא הצלילים עצמם.</div>
          <div className="review-chip"><b>במינור</b>אותן תבניות; בעובר הסופרן נשען על סול♯.</div>
        </div>
      </Section>

      <Section id="drills" num="17.7" title="תרגול - עד שזה אוטומטי">
        <Drill title="איזה 6/4 זה?" generate={typeQuestion} />
        <Drill title="חוקי המשפחה" generate={ruleQuestion} />
        <Drill title="‏6/4 במינור" generate={minorQuestion} />
      </Section>

      <NextUnit current={17}>
        <b>סוף החלק השלישי.</b> שלושה חלקים, שבע־עשרה יחידות: מסולמות ומרווחים, דרך התחביר של
        I–V–I, ועד טכניקות שבהן ההקשר - מעבר, שכנות, תבנית - קובע מה אקורד באמת עושה. מכאן נפתחות
        דלתות הכרומטיקה והמודולציה; הן עוד לפנינו.
      </NextUnit>
    </div>
  );
}
