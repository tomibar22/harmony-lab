import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";

/* ---------------- meet the chord: diatonic ii° vs. the Phrygian II ----------------
   all examples in A minor: bII = Bb major, usually in 6/3 over the bass D */

const MEET: ScoreNote[] = [
  { keys: ["b/3", "d/4", "f/4"], midi: [59, 62, 65], mark: "ii°", sub: "מוקטן - צורם" },
  { keys: ["bb/3", "d/4", "f/4"], midi: [58, 62, 65], mark: "♭II", sub: "מז'ורי - רך ואפל", kind: "active" },
  { bar: true, keys: [], midi: [] },
  { keys: ["d/4", "f/4", "b/4"], midi: [62, 65, 71], fig: "6", mark: "ii°6", sub: "הדיאטוני" },
  { keys: ["d/4", "f/4", "bb/4"], midi: [62, 65, 70], fig: "6", mark: "♭II6", sub: "הנפוליטני", kind: "active" },
];

/* ---------------- to the dominant: direct, or through the cadential 6/4 ---------------- */

const I_AM: Satb = { s: ["a/4", 69], a: ["e/4", 64], t: ["c/4", 60], b: ["a/2", 45] };
const N6: Satb = { s: ["bb/4", 70], a: ["f/4", 65], t: ["d/4", 62], b: ["d/3", 50] };
const V_AM: Satb = { s: ["g#/4", 68], a: ["e/4", 64], t: ["b/3", 59], b: ["e/3", 52] };

const TO_V = [
  {
    he: "ישר אל V",
    chords: [I_AM, N6, V_AM, I_AM] as Satb[],
    marks: ["i", "♭II6", "V", "i"],
    note: "סי♭ קופצת היישר אל סול♯: טרצה מוקטנת בסופרן - המרווח החתום של הנפוליטני. צורב, ומכוון.",
  },
  {
    he: "דרך 6/4 קדנציאלי",
    chords: [
      I_AM,
      N6,
      { s: ["a/4", 69], a: ["e/4", 64], t: ["c/4", 60], b: ["e/3", 52] },
      V_AM,
      I_AM,
    ] as Satb[],
    marks: ["i", "♭II6", "i64", "V", "i"],
    note: "צליל מעבר ממלא את הטרצה המוקטנת: סי♭–לה–סול♯. הקו יורד כרומטית - והמתח נפרש במקום להישרף בבת אחת.",
  },
] as const;

/* ---------------- roads into the Neapolitan ---------------- */

const APPROACH = [
  {
    he: "מ־iv, בתנועת 5–♭6",
    chords: [
      I_AM,
      { s: ["a/4", 69], a: ["f/4", 65], t: ["d/4", 62], b: ["d/3", 50] },
      N6,
      V_AM,
      I_AM,
    ] as Satb[],
    marks: ["i", "iv", "♭II6", "V", "i"],
    note: "מעל בס רה קבוע, הקווינטה לה עולה אל סי♭ - והסובדומיננטה נהפכת לנפוליטני. שימו לב כמה קרוב זה לצמד iv–ii°6 הדיאטוני.",
  },
  {
    he: "מ־VI, כקווינטה יורדת",
    chords: [
      I_AM,
      { s: ["a/4", 69], a: ["f/4", 65], t: ["c/4", 60], b: ["f/3", 53] },
      N6,
      V_AM,
      I_AM,
    ] as Satb[],
    marks: ["i", "VI", "♭II6", "V", "i"],
    note: "פה יורדת אל סי♭ - קווינטה יורדת, כאילו VI הוא הדומיננטה הפרטית של הנפוליטני. הדרך האהובה על מוצרט.",
  },
] as const;

/* ---------------- the three positions ---------------- */

const POSITIONS: ScoreNote[] = [
  { keys: ["d/4", "f/4", "bb/4"], midi: [62, 65, 70], fig: "6", sub: "השגור: «הסקסטה הנפוליטנית»", kind: "active" },
  { keys: ["bb/3", "d/4", "f/4"], midi: [58, 62, 65], fig: "5/3", sub: "מצב יסודי - נדיר" },
  { keys: ["f/3", "bb/3", "d/4"], midi: [53, 58, 62], fig: "6/4", sub: "הנדיר מכולם" },
];

/* ---------------- chromatic notation: the ascending scale in C major ---------------- */

const CHROMA_UP: ScoreNote[] = [
  { keys: ["c/4"], midi: [60], duration: "q" },
  { keys: ["c#/4"], midi: [61], duration: "q", kind: "active" },
  { keys: ["d/4"], midi: [62], duration: "q" },
  { keys: ["d#/4"], midi: [63], duration: "q", kind: "active" },
  { keys: ["e/4"], midi: [64], duration: "q" },
  { keys: ["f/4"], midi: [65], duration: "q" },
  { keys: ["f#/4"], midi: [66], duration: "q", kind: "active" },
  { keys: ["g/4"], midi: [67], duration: "q" },
  { keys: ["g#/4"], midi: [68], duration: "q", kind: "active" },
  { keys: ["a/4"], midi: [69], duration: "q" },
  { keys: ["bb/4"], midi: [70], duration: "q", kind: "stable", sub: "‏♭7 - החריג" },
  { keys: ["b/4"], midi: [71], duration: "q" },
  { keys: ["c/5"], midi: [72], duration: "q" },
];

/* ---------------- drills ---------------- */

const FIND_POOL = [
  { key: "לה מינור", chord: "סי♭ מז'ור", why: "‏♭2 של לה מינור היא סי♭; משולש מז'ורי עליה: סי♭–רה–פה." },
  { key: "רה מינור", chord: "מי♭ מז'ור", why: "‏♭2 של רה מינור היא מי♭; המשולש: מי♭–סול–סי♭." },
  { key: "מי מינור", chord: "פה מז'ור", why: "‏♭2 של מי מינור היא פה בקר; המשולש: פה–לה–דו - בלי סימן היתק אחד." },
  { key: "דו♯ מינור", chord: "רה מז'ור", why: "‏♭2 של דו♯ מינור היא רה בקר; המשולש: רה–פה♯–לה." },
] as const;

function findQuestion(): Question {
  const q = pick(FIND_POOL);
  return {
    prompt: <>מהו אקורד ♭II ב{q.key}?</>,
    options: shuffle(["סי♭ מז'ור", "מי♭ מז'ור", "פה מז'ור", "רה מז'ור"]),
    answer: q.chord,
    explain: <>{q.why}</>,
  };
}

const VOICE_POOL: Question[] = [
  {
    prompt: <>איזה צליל מכפילים ב־♭II6?</>,
    options: [
      "את צליל הבס - הדרגה הרביעית",
      "את היסוד - ‏♭2",
      "את הקווינטה",
      "אסור להכפיל דבר",
    ],
    answer: "את צליל הבס - הדרגה הרביעית",
    explain: <>‏4 היא הדיאטונית היחידה באקורד - וההכפלה שלה גם מכינה בנוחות את הספטימה של V7.</>,
  },
  {
    prompt: <>מה קורה כש־♭II6 ניגש היישר אל V?</>,
    options: [
      "‏♭2 קופצת אל הצליל המוביל - טרצה מוקטנת, המרווח החתום של האקורד",
      "‏♭2 עולה בחצי טון",
      "נוצרות קווינטות מקבילות",
      "שום דבר מיוחד",
    ],
    answer: "‏♭2 קופצת אל הצליל המוביל - טרצה מוקטנת, המרווח החתום של האקורד",
    explain: <>סי♭–סול♯ בלה מינור. אפשר גם למלא אותה בצליל מעבר - ‏♭2–1–♯7 - בעזרת 6/4 קדנציאלי או אקורד עזר.</>,
  },
  {
    prompt: <>איזו תנועה מלודית מוטב למנוע בסופרן?</>,
    options: [
      "‏♭2 ישירות אל ♮2 - סקונדה מוגדלת שאינה משכנעת",
      "‏♭2 יורדת אל 1",
      "‏4 עולה אל 5",
      "כל תנועה כרומטית",
    ],
    answer: "‏♭2 ישירות אל ♮2 - סקונדה מוגדלת שאינה משכנעת",
    explain: <>בקול פנימי ההתקדמות אפשרית; בסופרן היא נשמעת כמעידה. בין שתי צורות הסקונדה ישובצו צלילים אחרים.</>,
  },
  {
    prompt: <>מדוע ♭II חי כמעט תמיד במצב סקסטה?</>,
    options: [
      "במצב יסודי הבס קופץ אל V בקווינטה מוקטנת - והחיבור מאבד את טבעיותו",
      "כי כך יפה יותר על הנייר",
      "מצב יסודי אסור בתכלית",
      "בגלל המשקל",
    ],
    answer: "במצב יסודי הבס קופץ אל V בקווינטה מוקטנת - והחיבור מאבד את טבעיותו",
    explain: <>מעל הבס רה, הצעד רה–מי מוליך אל הדומיננטה בטבעיות גמורה - ולכן דווקא הסקסטה היא ביתו של האקורד.</>,
  },
];

function voiceQuestion(): Question {
  return pick(VOICE_POOL);
}

const CONTEXT_POOL: Question[] = [
  {
    prompt: <>מהו שימוש הציר הנפוץ של הנפוליטני במודולציה?</>,
    options: [
      "‏♭II6 של המינור מתפרש מחדש כ־IV6 של סולם מז'ורי בטרצה מטה",
      "הוא הופך לדומיננטה של הסולם החדש",
      "הוא נשאר טוניקה",
      "אין לו שימוש כזה",
    ],
    answer: "‏♭II6 של המינור מתפרש מחדש כ־IV6 של סולם מז'ורי בטרצה מטה",
    explain: <>סי♭/רה של לה מינור הוא בדיוק IV6 של פה מז'ור. מודולציה שצירה אקורד כרומטי - מודולציה כרומטית - ומפתיעה תמיד.</>,
  },
  {
    prompt: <>מדוע ♭II נדיר יותר במז'ור?</>,
    options: [
      "הוא דורש שני שינויים כרומטיים - ‏♭2 וגם ♭6 - והצבע האפל שלו זר לסביבה",
      "הוא אסור במז'ור",
      "אין ♭2 במז'ור",
      "כי אין קדנצות במז'ור",
    ],
    answer: "הוא דורש שני שינויים כרומטיים - ‏♭2 וגם ♭6 - והצבע האפל שלו זר לסביבה",
    explain: <>במינור נדרש שינוי אחד בלבד. במז'ור הוא יגיע לרוב אגב מיקסטורה רחבה - דרך ♭VI או מטוניקה בהיפוך ראשון.</>,
  },
  {
    prompt: <>איך כותבים שכן כרומטי - ואיך צליל מעבר כרומטי?</>,
    options: [
      "שניהם כסקונדה קטנה: דו–דו♯–רה בעלייה, מוגבהים בעלייה ומונמכים בירידה",
      "תמיד עם במולים",
      "כאוניסון מוגדל: דו–רה♭♭",
      "אין כללים",
    ],
    answer: "שניהם כסקונדה קטנה: דו–דו♯–רה בעלייה, מוגבהים בעלייה ומונמכים בירידה",
    explain: <>הכתיב משקף את הכיוון: צליל מוגבה מבקש לעלות, מונמך - לרדת. והחריגים: במז'ור מעדיפים ♯4 ו־♭7 הקרובים לסולם.</>,
  },
  {
    prompt: <>האם מותר לטוניקיזציה לגעת בנפוליטני?</>,
    options: [
      "כן - ♭II מקבל לא פעם דומיננטה משלו, ואף מורחב - בלי לאבד את דרכו אל V",
      "לא, הוא כרומטי מדי",
      "רק במז'ור",
      "רק בסוף יצירה",
    ],
    answer: "כן - ♭II מקבל לא פעם דומיננטה משלו, ואף מורחב - בלי לאבד את דרכו אל V",
    explain: <>נושא שהוצג על i יכול לחזור חצי טון מעלה, על ♭II מטוניקז - והמסע הגדול i–♭II–V–i נשמר.</>,
  },
];

function contextQuestion(): Question {
  return pick(CONTEXT_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit24() {
  const meetPlayer = usePlayer();
  const toVPlayer = usePlayer();
  const appPlayer = usePlayer();
  const posPlayer = usePlayer();
  const chromaPlayer = usePlayer();
  const [toVTab, setToVTab] = useState(0);
  const [appTab, setAppTab] = useState(0);

  const toV = TO_V[toVTab];
  const app = APPROACH[appTab];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 24 · חלק שישי</div>
        <h1>הסקונדה הפריגית: הנפוליטני</h1>
        <p className="lede">
          עד כה הכרומטיקה שאלה, הציצה ועברה דירה - אבל תמיד שמרה על דרגות הסולם עצמן. האקורד הבא
          מעז יותר: הוא מחליף את הסופרטוניקה כולה בגרסה זרה -{" "}
          <Term he="הסקונדה הפריגית" en="Phrygian II" def="משולש מז'ורי הבנוי על הדרגה השנייה המונמכת (♭2) - ♭II. בהיפוך ראשון: הסקסטה הנפוליטנית." /> -
          משולש מז'ורי על <Deg n="2" kind="active" /> מונמכת. רך, אפל, ובלתי ניתן לטעות בו.
        </p>
      </header>

      <Section id="meet" num="24.1" title="ii° יוצא, ♭II נכנס">
        <p>
          במינור, המשולש הדיאטוני על הסופרטוניקה מוקטן - ii° - וכבר למדנו שהוא סובל רק היפוך ראשון,
          וגם אז צליל צורם משהו. הנמיכו את היסוד בחצי טון - סי הופכת לסי♭ בלה מינור - והמוקטן נהפך
          למשולש <em className="hl">מז'ורי</em> מלא ורך. השם "פריגי" מזכיר את המודוס שסקונדה נמוכה
          היא חותמו; השם "נפוליטני" - את אסכולת האופרה של נאפולי שאהבה אותו. בהיפוך ראשון, ביתו
          הקבוע, הוא זכה לכינוי הנודע מכולם: <b>הסקסטה הנפוליטנית</b>:
        </p>
        <Widget
          title="ההשוואה: הסופרטוניקה הדיאטונית מול הפריגית - בלה מינור"
          foot={
            <PlayButton
              label="נגנו את הזוגות"
              events={MEET.filter((n) => !n.bar).map((n) => ({
                midi: [...n.midi],
                time: MEET.filter((m) => !m.bar).indexOf(n) * 1.3,
                dur: 1.35,
                idx: MEET.indexOf(n),
              }))}
              bpm={69}
              player={meetPlayer}
            />
          }
        >
          <Score
            notes={MEET}
            width={400}
            highlightIndex={meetPlayer.index}
            accidentalKey="Am"
            ariaLabel="השוואת הסופרטוניקה הדיאטונית והנפוליטני"
          />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          ‏♭II איננו תוצר של מיקסטורה - סי♭ אינה שייכת לשום צורה של לה מינור או לה מז'ור - ואיננו
          טוניקיזציה. זהו מקור כרומטי <em className="hl">שלישי</em>: שינוי דרגה לשם צבע ועוצמה.
          ובכל זאת תפקידו שמרני להפליא: כמו ii°6 הכשר, הוא אקורד ביניים שמוליך אל הדומיננטה.
          גוף חדש, נשמה ישנה.
        </Callout>
      </Section>

      <Section id="tov" num="24.2" title="הדרך אל V - והטרצה המוקטנת">
        <p>
          ‏<Deg n="2" kind="active" /> המונמכת נמשכת <em className="hl">מטה</em>. כשהנפוליטני ניגש
          היישר אל V, היא מדלגת אל הצליל המוביל - מרווח של טרצה מוקטנת, צליל החתימה של האקורד.
          ולרוב ממלאים את הקפיצה בצליל מעבר: סי♭–לה–סול♯, קו כרומטי יורד שנפרש על פני 6/4 קדנציאלי:
        </p>
        <Widget
          title="בחרו דרך - קפיצה חשופה או קו ממולא"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {TO_V.map((f, i) => (
                  <button key={f.he} role="tab" aria-selected={toVTab === i} onClick={() => setToVTab(i)}>
                    {f.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את הקדנצה" events={chordSeq([...toV.chords], 1.5)} bpm={60} player={toVPlayer} />
            </>
          }
        >
          <SatbScores
            key={toV.he}
            chords={[...toV.chords]}
            marks={[...toV.marks]}
            highlight={toVPlayer.index}
            width={340}
            label={toV.he}
            accidentalKey="Am"
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {toV.note}
          </p>
        </Widget>
        <Callout label="כללי הובלה">
          מכפילים את <em className="hl">הבס</em> - הדרגה הרביעית, הדיאטונית היחידה באקורד - וכך גם
          מכינים את הספטימה של V7. ותנועה אחת מוטב למנוע: ‏♭2 ישירות אל ♮2 באותו קול עליון - סקונדה
          מוגדלת שאוזן המאה השמונה־עשרה לא סלחה עליה. בין שני פני הסקונדה ישובץ תמיד משהו - קפיצה,
          צליל מעבר, אקורד שלם.
        </Callout>
      </Section>

      <Section id="approach" num="24.3" title="הדרכים אל הנפוליטני">
        <p>
          כל מה שמוליך אל ii°6 מוליך גם אל ♭II6 - אבל שתי דרכים חביבות במיוחד: מ־iv, בהרמת הקווינטה
          מעל בס קבוע (תנועת 5–♭6 המוכרת), ומ־VI, שיסודו יורד קווינטה אל הנפוליטני כאילו היה
          הדומיננטה הפרטית שלו:
        </p>
        <Widget
          title="שתי כניסות - בחרו והשוו"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {APPROACH.map((f, i) => (
                  <button key={f.he} role="tab" aria-selected={appTab === i} onClick={() => setAppTab(i)}>
                    {f.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את המהלך" events={chordSeq([...app.chords], 1.5)} bpm={63} player={appPlayer} />
            </>
          }
        >
          <SatbScores
            key={app.he}
            chords={[...app.chords]}
            marks={[...app.marks]}
            highlight={appPlayer.index}
            width={360}
            label={app.he}
            accidentalKey="Am"
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {app.note}
          </p>
        </Widget>
        <p>
          ומכיוון שהנפוליטני הוא יעד מצוין, גם שרשרת סקסט־אקורדים מקבילים (יחידה 16!) יכולה לגלוש
          מהטוניקה היישר אליו - ואף מותר <em className="hl">לטוניקז</em> אותו: לתת לו דומיננטה
          משלו, להשתהות בו - ואז להמשיך, כרגיל, אל V.
        </p>
      </Section>

      <Section id="positions" num="24.4" title="שלושת המצבים - ואחד ששולט">
        <p>
          מצב הסקסטה הוא הבית; השאר אורחים נדירים. במצב יסודי הבס נאלץ לקפוץ אל V בקווינטה מוקטנת
          או קווארטה מוגדלת - ולכן יופיע רק כשסיבה קומפוזיטורית טובה דורשת זאת, ואז ימשיך ברצון אל
          V6 או vii°7 דווקא. ומצב 6/4, הנדיר מכולם, חי כשכן עליון לדומיננטה:
        </p>
        <Widget
          title="שלושת מצבי ♭II בלה מינור"
          foot={
            <PlayButton
              label="נגנו את השלושה"
              events={POSITIONS.map((n, i) => ({ midi: [...n.midi], time: i * 1.3, dur: 1.35, idx: i }))}
              bpm={69}
              player={posPlayer}
            />
          }
        >
          <Score notes={POSITIONS} width={420} highlightIndex={posPlayer.index} accidentalKey="Am" ariaLabel="שלושת מצבי הנפוליטני" />
        </Widget>
        <p>
          ובמז'ור? ביתו האמיתי של ♭II הוא המינור. במז'ור נדרשים <em className="hl">שני</em> שינויים
          כרומטיים - גם ♭2 וגם ♭6 - והוא יגיע לרוב בעקבות מיקסטורה רחבה: ‏♭VI מכין אותו יפה, וטוניקה
          בהיפוך ראשון מגישה אותו בעדינות. בסולמות עתירי במולים אף נהוג לעיתים{" "}
          <Term he="כתיב אנהרמוני" en="enharmonic notation" def="רישום צליל בשמו האנהרמוני לנוחות קריאה - למשל רה מז'ור במקום מי♭♭ מז'ור. העין קוראת אחרת, האוזן שומעת אותו דבר." /> -
          לכתוב את האקורד בשם נוח יותר לעין, בלי שהאוזן תרגיש דבר.
        </p>
      </Section>

      <Section id="pivot" num="24.5" title="הנפוליטני כציר - מודולציה כרומטית">
        <p>
          ליחידה 21 יש המשך: גם אקורד כרומטי יכול לשמש ציר, והמודולציה שמתקבלת -{" "}
          <em className="hl">מודולציה כרומטית</em> - מפתיעה תמיד, כי הציר עצמו כבר זר לאחד הצדדים.
          השימוש האהוב: ‏♭II6 של סולם מינורי הוא בדיוק IV6 של הסולם המז'ורי שטרצה מתחתיו. סי♭ על
          רה בלה מינור? אותו אקורד עצמו הוא IV6 של פה מז'ור - והדלת בין העולמות נפתחת באקורד אחד.
        </p>
        <Callout label="נקודת מבט" insight>
          חִשבו מה קרה לסולם: הדרגה השנייה - שביחידה 1 הכרנו כצליל פעיל אך דיאטוני לגמרי - קיבלה
          כאן גוף חלופי, זר, שכל כולו נועד להעצים את המשיכה אל הדומיננטה. הכרומטיקה כבר אינה מקשטת
          את המפה - היא מתחילה לצייר אותה מחדש. זה בדיוק הכיוון שהחלק הזה של הספר ילך בו.
        </Callout>
      </Section>

      <Section id="notation" num="24.6" title="דקדוק הכתיב הכרומטי">
        <p>
          ומכיוון שהכרומטיקה מתרבה, הגיע הזמן לכללי הכתיב שלה. העיקרון: הכתיב משקף{" "}
          <em className="hl">כיוון</em>. שכן כרומטי וצליל מעבר כרומטי נכתבים כסקונדה קטנה - דו–דו♯–רה,
          לא דו–רה♭–רה: צליל מוגבה מבקש לעלות, מונמך מבקש לרדת. והחריג: מעדיפים סימנים קרובים
          לסולם - במז'ור ♯4 ו־♭7 (השכנים ממעגל הקווינטות) גם נגד הכיוון. כך נראה הסולם הכרומטי
          העולה בדו מז'ור - כולו דיאזים, מלבד אחד:
        </p>
        <Widget
          title="הסולם הכרומטי העולה - שימו לב לסי♭"
          foot={
            <PlayButton
              label="נגנו את הסולם"
              events={CHROMA_UP.map((n, i) => ({ midi: [...n.midi], time: i * 0.45, dur: 0.5, idx: i }))}
              bpm={100}
              player={chromaPlayer}
            />
          }
        >
          <Score notes={CHROMA_UP} width={620} even highlightIndex={chromaPlayer.index} ariaLabel="הסולם הכרומטי העולה בדו מז'ור" />
        </Widget>
        <p>
          בירידה - תמונת מראה: מונמכים לכל אורך הדרך, מלבד פה♯ (‏♯4) שנשמר גם בירידה. ובמינור,
          הצורות המוגבהות של <Deg n="6" /> ו־<Deg n="7" /> משמשות בשני הכיוונים - ולעיתים, לכבוד
          הנפוליטני, תופיע ♭2 גם בעלייה.
        </p>
      </Section>

      <Section id="review" num="24.7" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>♭II</b>משולש מז'ורי על ♭2 - הסקונדה הפריגית. במינור: שינוי אחד ויחיד.</div>
          <div className="review-chip"><b>הבית</b>מצב סקסטה, בס על 4 - «הסקסטה הנפוליטנית». מצב יסודי ו־6/4 נדירים.</div>
          <div className="review-chip"><b>התפקיד</b>אקורד ביניים אל V - בדיוק כמו ii°6, רק עז ואפל ממנו.</div>
          <div className="review-chip"><b>♭2 יורדת</b>ישר אל V: טרצה מוקטנת; דרך 6/4: ‏♭2–1–♯7 ממולאת.</div>
          <div className="review-chip"><b>הכפלה</b>את הבס (4) - שגם מכין את הספטימה של V7.</div>
          <div className="review-chip"><b>לְהִמָּנַע</b>‏♭2–♮2 ישירה בסופרן; בקול פנימי - אפשרית.</div>
          <div className="review-chip"><b>כניסות</b>מ־iv בתנועת 5–♭6, מ־VI כקווינטה יורדת, מ־i6, משרשרת סקסטות.</div>
          <div className="review-chip"><b>ציר מודולציה</b>‏♭II6 של מינור = ‏IV6 של המז'ור שטרצה מטה - מודולציה כרומטית.</div>
          <div className="review-chip"><b>כתיב כרומטי</b>סקונדה קטנה לפי הכיוון; החריגים הקרובים: ‏♯4 ו־♭7.</div>
        </div>
      </Section>

      <Section id="drills" num="24.8" title="תרגול - עד שזה אוטומטי">
        <Drill title="מצאו את הנפוליטני" generate={findQuestion} />
        <Drill title="הובלת קולות" generate={voiceQuestion} />
        <Drill title="הקשרים ומודולציה" generate={contextQuestion} />
      </Section>

      <NextUnit current={24}>
        הנפוליטני הנמיך את הדרך אל הדומיננטה מלמעלה. האקורד הבא תוקף מלמטה וגם מלמעלה{" "}
        <em>בבת אחת</em>: סקסטה מוגדלת שקוראת לחצי הטון משני צדדיו של הבס - שלושה לאומים, איטלקי,
        צרפתי וגרמני, ומרווח אחד שאין שני לו. <b>אקורדי הסקסטה המוגדלת</b> ביחידה הבאה.
      </NextUnit>
    </div>
  );
}
