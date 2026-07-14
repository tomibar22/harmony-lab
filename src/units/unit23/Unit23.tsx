import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";

/* ---------------- building the ninth: V7 grows one more tone ---------------- */

const BUILD: ScoreNote[] = [
  { keys: ["g/3", "b/3", "d/4", "f/4"], midi: [55, 59, 62, 65], fig: "7", sub: "V7 - המוכר" },
  { keys: ["g/3", "b/3", "d/4", "f/4", "a/4"], midi: [55, 59, 62, 65, 69], fig: "9/7", sub: "חמישה קולות", kind: "active" },
  { keys: ["g/3", "b/3", "f/4", "a/4"], midi: [55, 59, 65, 69], fig: "9/7", sub: "ארבעה: בלי קווינטה", kind: "active" },
];

/* ---------------- resolution: 9th and 7th sink in parallel ---------------- */

const RESOLVE: Satb[] = [
  { s: ["a/4", 69], a: ["f/4", 65], t: ["b/3", 59], b: ["g/2", 43] },
  { s: ["g/4", 67], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
];
const RESOLVE_MARKS = ["V97", "I"];

/* ---------------- melodic faces of the 9th ---------------- */

const FACES = [
  {
    he: "שכן עליון",
    chords: [
      { s: ["g/4", 67], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
      { s: ["a/4", 69], a: ["f/4", 65], t: ["b/3", 59], b: ["g/2", 43] },
      { s: ["g/4", 67], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
    ] as Satb[],
    marks: ["I", "V97", "I"],
    note: "‏5–6–5 בסופרן: לה היא שכן עליון לסול. הדרך החדשה להרמן את התבנית הוותיקה מכולן.",
  },
  {
    he: "השהיה",
    chords: [
      { s: ["a/4", 69], a: ["f/4", 65], t: ["c/4", 60], b: ["f/3", 53] },
      { s: ["a/4", 69], a: ["f/4", 65], t: ["b/3", 59], b: ["g/2", 43] },
      { s: ["g/4", 67], a: ["f/4", 65], t: ["b/3", 59], b: ["g/2", 43] },
      { s: ["g/4", 67], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
    ] as Satb[],
    marks: ["IV", "V97", "V87", "I"],
    note: "לה מגיעה מ־IV, נתפסת מעל הבס החדש - ונמסה אל סול בעוד הדומיננטה מחזיקה: ‏9–8 קלאסי.",
  },
] as const;

/* ---------------- major 9th vs. borrowed flat 9th ---------------- */

const NINTH_COLORS = [
  {
    he: "נונה גדולה: V9",
    chords: [
      { s: ["a/4", 69], a: ["f/4", 65], t: ["b/3", 59], b: ["g/2", 43] },
      { s: ["g/4", 67], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
    ] as Satb[],
    marks: ["V97", "I"],
    note: "לה - הדיאטונית של דו מז'ור. בהירה, מלאה, כמעט פסטורלית.",
  },
  {
    he: "נונה קטנה: V7♭9",
    chords: [
      { s: ["ab/4", 68], a: ["f/4", 65], t: ["b/3", 59], b: ["g/2", 43] },
      { s: ["g/4", 67], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
    ] as Satb[],
    marks: ["V7♭9", "I"],
    note: "לה♭ - האורחת מיחידה 22. אותה ♭6 מושאלת, הפעם צפה מעל הדומיננטה. הצבע מתקדר, המשיכה מתחדדת.",
  },
] as const;

/* ---------------- the leading-tone-seventh connection ---------------- */

const VII_LINK: ScoreNote[] = [
  { keys: ["b/3", "d/4", "f/4", "a/4"], midi: [59, 62, 65, 69], mark: "viiø7", sub: "בלי בס" },
  { keys: ["g/3", "b/3", "d/4", "f/4", "a/4"], midi: [55, 59, 62, 65, 69], mark: "V97", sub: "‏+ סול בבס", kind: "active" },
  { bar: true, keys: [], midi: [] },
  { keys: ["b/3", "d/4", "f/4", "ab/4"], midi: [59, 62, 65, 68], mark: "vii°7", sub: "בלי בס" },
  { keys: ["g/3", "b/3", "d/4", "f/4", "ab/4"], midi: [55, 59, 62, 65, 68], mark: "V7♭9", sub: "‏+ סול בבס", kind: "active" },
];

/* ---------------- ninths in a descending-fifth sequence ---------------- */

const SEQ: Satb[] = [
  { s: ["d/5", 74], a: ["g/4", 67], t: ["b/3", 59], b: ["e/3", 52] },
  { s: ["c/5", 72], a: ["g/4", 67], t: ["b/3", 59], b: ["a/2", 45] },
  { s: ["c/5", 72], a: ["f/4", 65], t: ["a/3", 57], b: ["d/3", 50] },
  { s: ["b/4", 71], a: ["f/4", 65], t: ["a/3", 57], b: ["g/2", 43] },
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
];
const SEQ_MARKS = ["III7", "VI97", "II7", "V97", "I"];

/* ---------------- "elevenths" and "thirteenths" ---------------- */

const HIGH_TONES: ScoreNote[] = [
  { keys: ["g/3", "f/4", "c/5"], midi: [55, 65, 72], fig: "7/4", sub: "קווארטה מעל V7" },
  { keys: ["g/3", "f/4", "b/4"], midi: [55, 65, 71], fig: "3", sub: "‏4–3: נפתרת" },
  { bar: true, keys: [], midi: [] },
  { keys: ["g/3", "f/4", "e/5"], midi: [55, 65, 76], fig: "7/6", sub: "סקסטה מעל V7" },
  { keys: ["g/3", "f/4", "d/5"], midi: [55, 65, 74], fig: "5", sub: "‏6–5: נפתרת" },
  { bar: true, keys: [], midi: [] },
  { keys: ["g/3", "f/4", "c/5"], midi: [55, 65, 72], mark: "«11»", sub: "לא נפתרת...", kind: "active" },
  { keys: ["c/4", "e/4", "c/5"], midi: [60, 64, 72], mark: "I", sub: "כי דו שייכת לבית" },
];

/* ---------------- drills ---------------- */

const NINTH_POOL = [
  { key: "דו מז'ור", tone: "לה", why: "הנונה מעל סול היא לה - הדרגה השישית של הסולם, שכן עליון לקווינטה." },
  { key: "סול מז'ור", tone: "מי", why: "הדומיננטה היא רה; נונה מעליה - מי, הדרגה השישית של סול מז'ור." },
  { key: "פה מז'ור", tone: "רה", why: "הדומיננטה היא דו; נונה מעליה - רה, הדרגה השישית של פה מז'ור." },
  { key: "לה מינור", tone: "פה (נונה קטנה)", why: "במינור הדרגה השישית נמוכה, ולכן הנונה מעל מי היא פה - נונה קטנה." },
] as const;

function ninthQuestion(): Question {
  const q = pick(NINTH_POOL);
  return {
    prompt: <>מהו צליל הנונה של V9/7 ב{q.key}?</>,
    options: shuffle(["לה", "מי", "רה", "פה (נונה קטנה)"]),
    answer: q.tone,
    explain: <>{q.why}</>,
  };
}

const CONCEPT_POOL: Question[] = [
  {
    prompt: <>בכתיבה בארבעה קולות, על איזה צליל של V9/7 מוותרים?</>,
    options: ["על הקווינטה", "על הספטימה", "על הטרצה (הצליל המוביל)", "על הנונה"],
    answer: "על הקווינטה",
    explain: <>כמו ב־V7 חסר: הקווינטה היא הוותרנית הנצחית. היסוד, הטרצה, הספטימה והנונה - כולם חיוניים לזהות האקורד.</>,
  },
  {
    prompt: <>מדוע הנונה אינה "מנוע הרמוני" כמו הספטימה?</>,
    options: [
      "היא נפתרת אל צליל שכבר קיים באקורד",
      "היא רחוקה מדי מהבס מכדי להישמע כדיסוננס",
      "היא דווקא מנוע חזק יותר, אך נדירה מדי",
      "היא יושבת תמיד בסופרן, הרחק מהקונפליקט",
    ],
    answer: "היא נפתרת אל צליל שכבר קיים באקורד",
    explain: <>פה של V7 נפתרת אל מי - צליל זר לדומיננטה, שדורש אקורד חדש. לה נפתרת אל סול - שכבר יושב בבס. לכן הנונה צבע, והספטימה כוח.</>,
  },
  {
    prompt: <>איך V7♭9 מוצא את דרכו אל סולם מז'ורי?</>,
    options: [
      "במיקסטורה: ‏♭6 מושאלת מהמינור המקביל וצפה מעל הדומיננטה",
      "במודולציה חטופה אל המינור המקביל",
      "בטוניקיזציה של הדרגה השישית",
      "בהיפוך של IV7 עם ספטימה בבס",
    ],
    answer: "במיקסטורה: ‏♭6 מושאלת מהמינור המקביל וצפה מעל הדומיננטה",
    explain: <>יחידה 22 בפעולה: אותה לה♭ מושאלת שהקדירה את iv ואת ♭VI - מקדירה כאן את הדומיננטה עצמה.</>,
  },
  {
    prompt: <>מה היחס בין V7♭9 לספטאקורד המוביל המוקטן?</>,
    options: [
      "ארבעת הצלילים העליונים של V7♭9 הם בדיוק vii°7",
      "אין ביניהם קשר - שני עולמות נפרדים",
      "הם אותו אקורד בדיוק, צליל בצליל",
      "‏vii°7 הוא ההיפוך השלישי של V7♭9",
    ],
    answer: "ארבעת הצלילים העליונים של V7♭9 הם בדיוק vii°7",
    explain: <>סי–רה–פה–לה♭ הם vii°7; הוסיפו סול בבס - וקיבלתם V7♭9. שני שמות לענן אחד, ההבדל הוא היסוד שמתחתיו.</>,
  },
  {
    prompt: <>מהם "אקורד האונדצימה" ו"אקורד הטרצדצימה" באמת?</>,
    options: [
      "קווארטה וסקסטה מעל V7",
      "אקורדים עצמאיים בני שישה ושבעה צלילים",
      "ערימות טרצות שהוגדרו כבר אצל רמו",
      "כינויים מאוחרים לספטאקורדים בהיפוך",
    ],
    answer: "קווארטה וסקסטה מעל V7",
    explain: <>הפתרון מסופק באוזן: הקווארטה שייכת לטוניקה הבאה, ולכן מותר להשאירה תלויה. ערימת הטרצות היא תפיסה מאוחרת.</>,
  },
];

function conceptQuestion(): Question {
  return pick(CONCEPT_POOL);
}

const SEQ_POOL: Question[] = [
  {
    prompt: <>בסקוונצה בקווינטות יורדות בארבעה קולות, אילו ספרורים מתחלפים זה בזה?</>,
    options: ["‏9/7 עם 7/5", "‏6/4 עם 5/3", "‏9/7 עם 6/5", "‏7/5 עם 4/2"],
    answer: "‏9/7 עם 7/5",
    explain: <>הנונה והספטימה של אקורד אחד נמסות בצעד אל הקווינטה והטרצה של הבא - וכך הלאה, לסירוגין, עד הבית.</>,
  },
  {
    prompt: <>מה טיבן של הנונות בסקוונצה דיאטונית בקווינטות יורדות?</>,
    options: [
      "תמיד השהיות - צליל מוחזק מהאקורד הקודם",
      "תמיד צלילי מעבר - חוליות בקו יורד",
      "תמיד שכנים עליונים שנכנסו בקפיצה",
      "תמיד אנטיציפציות של האקורד הבא",
    ],
    answer: "תמיד השהיות - צליל מוחזק מהאקורד הקודם",
    explain: <>כל נונה בשרשרת היא קווינטה של האקורד הקודם שסירבה לזוז - נתפסה מעל הבס החדש ונמסה בצעד.</>,
  },
  {
    prompt: <>‏III7–VI9–II7–V9–I: איפה פגשתם את השרשרת הזאת מחוץ לספר?</>,
    options: [
      "זהו iii–vi–ii–V–I - עמוד התווך של הג'אז, עם אותן נונות בדיוק",
      "זו שרשרת הפובורדון של הרנסנס",
      "זו הקדנצה הפלגלית של המוזיקה הכנסייתית",
      "זהו בס הקינה הברוקי, בלבוש אחר",
    ],
    answer: "זהו iii–vi–ii–V–I - עמוד התווך של הג'אז, עם אותן נונות בדיוק",
    explain: <>מה שהמאה התשע־עשרה כתבה כשרשרת השהיות - הג'אז אימץ כצבע קבוע. אותה הובלת קולות, אותם צלילים.</>,
  },
];

function seqQuestion(): Question {
  return pick(SEQ_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit23() {
  const buildPlayer = usePlayer();
  const resPlayer = usePlayer();
  const facePlayer = usePlayer();
  const colorPlayer = usePlayer();
  const viiPlayer = usePlayer();
  const seqPlayer = usePlayer();
  const highPlayer = usePlayer();
  const [faceTab, setFaceTab] = useState(0);
  const [colorTab, setColorTab] = useState(0);

  const face = FACES[faceTab];
  const color = NINTH_COLORS[colorTab];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 23 · חלק שישי</div>
        <h1>ספטאקורדים עם דיסוננס נוסף</h1>
        <p className="lede">
          חלק שישי נפתח בשאלה פשוטה: אם מעל המשולש אפשר להוסיף ספטימה - אפשר להמשיך? מעל הדומיננטה,
          התשובה היא כן: עוד טרצה אחת, והספטימה מקבלת בת לוויה -{" "}
          <Term he="נונה" en="ninth" def="מרווח של סקונדה מעל האוקטבה: הצליל התשיעי מהיסוד. מעל V7 - הדרגה השישית של הסולם." />.
          אבל כפי שנגלה, היא אורחת מסוג אחר: קישוט שנטל שם של אקורד.
        </p>
      </header>

      <Section id="build" num="23.1" title="אקורד הנונה הדומיננטי: V9/7">
        <p>
          קחו את V7 והוסיפו מעליו את <Deg n="6" /> - לה בדו מז'ור, נונה מעל הבס. בחמישה קולות האקורד
          שלם; בארבעה, כמו תמיד, מוותרים על הקווינטה. הסימון V9/7 מדויק מ"V9" סתמי: הוא מזכיר
          שהספטימה <em className="hl">תמיד שם</em> - נונה בלי ספטימה היא סתם השהיה אל האוקטבה:
        </p>
        <Widget
          title="מ־V7 אל V9/7 - הערימה גדלה בקומה"
          foot={
            <PlayButton
              label="נגנו את שלוש הצורות"
              events={BUILD.map((n, i) => ({ midi: [...n.midi], time: i * 1.3, dur: 1.35, idx: i }))}
              bpm={72}
              player={buildPlayer}
            />
          }
        >
          <Score notes={BUILD} width={340} highlightIndex={buildPlayer.index} ariaLabel="בניית אקורד הנונה" />
        </Widget>
        <p>
          והפתרון? הנונה והספטימה שוקעות יחד, בטרצות מקבילות: לה אל סול, פה אל מי - היישר אל תוך
          הקווינטה והטרצה של הטוניקה:
        </p>
        <Widget
          title="‏V9/7 ← I: שתי הדיסוננסות נמסות במקביל"
          foot={<PlayButton label="נגנו את הפתרון" events={chordSeq(RESOLVE, 1.7)} bpm={60} player={resPlayer} />}
        >
          <SatbScores chords={RESOLVE} marks={RESOLVE_MARKS} highlight={resPlayer.index} width={300} label="פתרון אקורד הנונה" />
        </Widget>
      </Section>

      <Section id="faces" num="23.2" title="הפנים המלודיות של הנונה">
        <p>
          כמו הספטימה בשעתה, גם הנונה נולדה מקישוט: היא שכן עליון ל<Deg n="5" kind="stable" />, או
          השהיה שנתפסה מעל בס חדש. ההרגל הישן של <Deg n="5" />–<Deg n="6" />–<Deg n="5" /> בסופרן
          מקבל פתאום הרמון חדש:
        </p>
        <Widget
          title="בחרו פנים - שכן או השהיה"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {FACES.map((f, i) => (
                  <button key={f.he} role="tab" aria-selected={faceTab === i} onClick={() => setFaceTab(i)}>
                    {f.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את המהלך" events={chordSeq([...face.chords], 1.5)} bpm={66} player={facePlayer} />
            </>
          }
        >
          <SatbScores
            key={face.he}
            chords={[...face.chords]}
            marks={[...face.marks]}
            highlight={facePlayer.index}
            width={320}
            label={face.he}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {face.note}
          </p>
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          מדוע הספטימה היא <em className="hl">מנוע</em> והנונה רק <em className="hl">צבע</em>? פה של
          V7 נפתרת אל מי - צליל זר לאקורד, שכופה התקדמות אל אקורד חדש. לה נפתרת אל סול - שכבר יושב
          בבס. דיסוננס שנפתר בתוך הבית אינו דוחף החוצה; לכן נונות מעשירות את הצליל אך אינן מניעות את
          ההרמוניה - ולכן מותר להן, לא פעם, להישאר תלויות באוויר בלי פתרון כלל, כש<Deg n="5" /> ממילא
          נשמעת מתחתן.
        </Callout>
      </Section>

      <Section id="colors" num="23.3" title="נונה גדולה, נונה קטנה - ולה♭ שחוזרת">
        <p>
          במז'ור הנונה גדולה (סול–לה); במינור - קטנה (מי–פה). אבל זוכרים את האורחת מיחידה 22? בזכות
          המיקסטורה, ‏♭6 חופשייה להופיע גם במז'ור - והפעם היא מטפסת אל ראש הדומיננטה עצמה. ‏V7♭9
          במז'ור הוא לחם חוק:
        </p>
        <Widget
          title="שני צבעים לאותה נונה - בחרו והשוו"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {NINTH_COLORS.map((f, i) => (
                  <button key={f.he} role="tab" aria-selected={colorTab === i} onClick={() => setColorTab(i)}>
                    {f.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את הפתרון" events={chordSeq([...color.chords], 1.7)} bpm={60} player={colorPlayer} />
            </>
          }
        >
          <SatbScores
            key={color.he}
            chords={[...color.chords]}
            marks={[...color.marks]}
            highlight={colorPlayer.index}
            width={300}
            label={color.he}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {color.note}
          </p>
        </Widget>
      </Section>

      <Section id="vii" num="23.4" title="הקשר הסמוי אל vii°7">
        <p>
          הביטו בארבעת הצלילים העליונים של אקורד הנונה: סי–רה–פה–לה. זהו ספטאקורד שלם בזכות עצמו -
          ספטאקורד המוביל. עם נונה גדולה מתקבל viiø7 (חצי־מוקטן), עם נונה קטנה - vii°7 (מוקטן).
          המשמעות מעשית להפליא: כל ספטאקורד מוביל הוא אקורד נונה שמחכה לבס שלו -
        </p>
        <Widget
          title="הוסיפו סול בבס - וספטאקורד המוביל נהיה אקורד נונה"
          foot={
            <PlayButton
              label="נגנו את הזוגות"
              events={VII_LINK.filter((n) => !n.bar).map((n) => ({
                midi: [...n.midi],
                time: VII_LINK.filter((m) => !m.bar).indexOf(n) * 1.35,
                dur: 1.4,
                idx: VII_LINK.indexOf(n),
              }))}
              bpm={69}
              player={viiPlayer}
            />
          }
        >
          <Score notes={VII_LINK} width={420} highlightIndex={viiPlayer.index} ariaLabel="הקשר בין ספטאקורד מוביל לאקורד נונה" />
        </Widget>
        <Callout label="הערת ביצוע">
          ומכאן גם הכלל ההפוך: היפוכים של V9/7 כמעט שאינם בנמצא. כשהנונה אינה בראש והפתרון שלה כבר
          נשמע בקול אחר - הצליל מתעכר. אקורד נונה אמיתי חי במצב יסודי, נונה למעלה, בס למטה; כל השאר
          מוטב לקרוא כ־V7 עם קישוט.
        </Callout>
      </Section>

      <Section id="seq" num="23.5" title="נונות בסקוונצה - והסוד של הג'אז">
        <p>
          פתרון הנונה אוהב תנועת יסודות בקווינטה יורדת - בדיוק כמו הספטימה. בסקוונצה דיאטונית
          יורדת, הנונות הן תמיד השהיות: הקווינטה של אקורד אחד נתפסת מעל הבס הבא, והספרורים מתחלפים
          לסירוגין - ‏9/7, ‏7/5, ‏9/7... עקבו איך כל קול נכנס, נתפס ונמס:
        </p>
        <Widget
          title="‏III7–VI9–II7–V9–I: שרשרת השהיות בקווינטות יורדות"
          foot={<PlayButton label="נגנו את הסקוונצה" events={chordSeq(SEQ, 1.5)} bpm={63} player={seqPlayer} />}
        >
          <SatbScores chords={SEQ} marks={SEQ_MARKS} highlight={seqPlayer.index} width={380} label="נונות בסקוונצת קווינטות יורדות" />
        </Widget>
        <Callout label="גשר אל הג'אז" insight>
          קראו את השרשרת שוב: iii–vi–ii–V–I. זהו ה־turnaround שכל פסנתרן ג'אז מגלגל באצבעותיו - עם
          אותן נונות בדיוק, באותם קולות. מה שאצל מוצרט ושומאן היה שרשרת השהיות מוקפדת, הג'אז אימץ
          כצבע של קבע. ההרמוניה לא המציאה את עצמה מחדש - היא רק החליטה להפסיק להתנצל על הדיסוננס.
        </Callout>
      </Section>

      <Section id="high" num="23.6" title="«אונדצימות» ו«טרצדצימות» - שמות גדולים לקישוטים קטנים">
        <p>
          ומה עם "אקורד 11" ו"אקורד 13"? מעל V7 יכולות להופיע גם קווארטה (דו) וסקסטה (מי) - השהיות
          או שכנים שדרכם להיפתר אל הטרצה ואל הקווינטה. במאה התשע־עשרה החלו להשאירן{" "}
          <em className="hl">בלי פתרון</em>: האוזן משלימה אותו לבד, כי צליל הפתרון ממתין ממילא
          בטוניקה הבאה. התנאי: הדיסוננס חייב לבלוט - כמעט תמיד בסופרן, מעל הספטימה:
        </p>
        <Widget
          title="‏4–3 ו־6–5 מעל V7 - נפתרות, ואז משוחררות"
          foot={
            <PlayButton
              label="נגנו את הצמדים"
              events={HIGH_TONES.filter((n) => !n.bar).map((n) => ({
                midi: [...n.midi],
                time: HIGH_TONES.filter((m) => !m.bar).indexOf(n) * 1.2,
                dur: 1.25,
                idx: HIGH_TONES.indexOf(n),
              }))}
              bpm={69}
              player={highPlayer}
            />
          }
        >
          <Score notes={HIGH_TONES} width={480} highlightIndex={highPlayer.index} ariaLabel="קווארטות וסקסטות מעל הדומיננטה" />
        </Widget>
        <p>
          השמות "אונדצימה" ו"טרצדצימה" נולדו מהרעיון שאפשר להמשיך לערום טרצות עד אין קץ - ‏7, ‏9,
          ‏11, ‏13. אבל במוזיקה של התקופה הזאת הדיסוננסים נולדים מ<em className="hl">תנועה מלודית</em>,
          לא מערימה אנכית: אלו קווארטות וסקסטות שמחליפות את הטרצה והקווינטה, לא צלילים שנוספים
          עליהן. רק במאה העשרים - אצל ראוול ואחריו - הערימה עצמה תיעשה אמת מבנית.
        </p>
      </Section>

      <Section id="review" num="23.7" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>V9/7</b>‏V7 ועוד <Deg n="6" /> מעליו - נונה מעל הבס. בארבעה קולות: בלי קווינטה.</div>
          <div className="review-chip"><b>הפתרון</b>נונה וספטימה שוקעות במקביל - אל הקווינטה והטרצה של I.</div>
          <div className="review-chip"><b>צבע, לא מנוע</b>הנונה נפתרת אל צליל שכבר באקורד - ולכן אינה כופה התקדמות.</div>
          <div className="review-chip"><b>נונה בלי פתרון</b>מותרת ושכיחה - ‏5 נשמעת ממילא, והאוזן משלימה.</div>
          <div className="review-chip"><b>V7♭9 במז'ור</b>מיקסטורה: לה♭ המושאלת צפה מעל הדומיננטה.</div>
          <div className="review-chip"><b>הקשר ל־vii°7</b>ארבעת העליונים של V7♭9 = ‏vii°7; הוסיפו את 5 בבס וגיליתם.</div>
          <div className="review-chip"><b>היפוכים</b>כמעט שאינם: נונה שאינה בראש מתעכרת. מצב יסודי בלבד.</div>
          <div className="review-chip"><b>בסקוונצה</b>קווינטות יורדות: ‏9/7 מתחלף עם 7/5 - וכל נונה היא השהיה.</div>
          <div className="review-chip"><b>«11» ו«13»</b>קווארטה וסקסטה שלא נפתרו מעל V7 - בסופרן, מעל הספטימה.</div>
        </div>
      </Section>

      <Section id="drills" num="23.8" title="תרגול - עד שזה אוטומטי">
        <Drill title="מצאו את הנונה" generate={ninthQuestion} />
        <Drill title="טיבו של הדיסוננס" generate={conceptQuestion} />
        <Drill title="נונות בתנועה" generate={seqQuestion} />
      </Section>

      <NextUnit current={23}>
        הנונה העשירה את הדומיננטה מבפנים. האקורד הבא בדרכנו נועז יותר: הוא מחליף דרגה שלמה בגרסה
        כרומטית זרה - סקונדה מונמכת, רכה ואפלה, שנושאת את שמה של נאפולי. ‏<b>הסקונדה הפריגית</b>{" "}
        ממתינה ביחידה הבאה.
      </NextUnit>
    </div>
  );
}
