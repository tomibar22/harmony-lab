import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";

/* ---------------- one accidental turns a chord into an ambassador ---------------- */

const TRANSFORM: ScoreNote[] = [
  { keys: ["d/4", "f/4", "a/4"], midi: [62, 65, 69], mark: "II", sub: "הכנה רגילה" },
  { keys: ["d/4", "f#/4", "a/4"], midi: [62, 66, 69], mark: "V/V", sub: "פה♯ — דומיננטה של V", kind: "active" },
  { bar: true, keys: [], midi: [] },
  { keys: ["c/4", "e/4", "g/4"], midi: [60, 64, 67], mark: "I", sub: "הטוניקה" },
  { keys: ["c/4", "e/4", "g/4", "bb/4"], midi: [60, 64, 67, 70], mark: "V7/IV", sub: "סי♭ — דומיננטה של IV", kind: "active" },
];

/* ---------------- the ambassador family ---------------- */

const FAMILY: ScoreNote[] = [
  { keys: ["a/3", "c#/4", "e/4"], midi: [57, 61, 64], mark: "V/II", sub: "דו♯ ← רה" },
  { keys: ["b/3", "d#/4", "f#/4"], midi: [59, 63, 66], mark: "V/III", sub: "רה♯ ← מי" },
  { keys: ["e/4", "g#/4", "b/4"], midi: [64, 68, 71], mark: "V/VI", sub: "סול♯ ← לה" },
];

/* ---------------- the reusable four-voice chords ----------------
   every adjacent pair in every progression below was checked by hand;
   the chromatic step always stays in one voice (no cross relation) */

const VofV_MOVE: Satb[] = [
  { s: ["e/4", 64], a: ["c/4", 60], t: ["g/3", 55], b: ["c/3", 48] },
  { s: ["d/4", 62], a: ["c/4", 60], t: ["f#/3", 54], b: ["d/3", 50] },
  { s: ["d/4", 62], a: ["b/3", 59], t: ["g/3", 55], b: ["g/2", 43] },
  { s: ["e/4", 64], a: ["c/4", 60], t: ["g/3", 55], b: ["c/3", 48] },
];
const VofV_MARKS = ["I", "V7/V", "V", "I"];

const VofIV_MOVE: Satb[] = [
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
  { s: ["bb/4", 70], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
  { s: ["a/4", 69], a: ["c/4", 60], t: ["a/3", 57], b: ["f/3", 53] },
  { s: ["a/4", 69], a: ["d/4", 62], t: ["a/3", 57], b: ["f/3", 53] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/3", 55] },
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
];
const VofIV_MARKS = ["I", "V7/IV", "IV", "II6", "V", "I"];

/* in minor: D# — a note the scale never heard of — as the local leading tone */
const MINOR_MOVE: Satb[] = [
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
  { s: ["a/4", 69], a: ["b/3", 59], t: ["d#/3", 51], b: ["b/2", 47] },
  { s: ["g#/4", 68], a: ["b/3", 59], t: ["e/3", 52], b: ["e/3", 52] },
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
];
const MINOR_MARKS = ["i", "V7/V", "V", "i"];

/* ---------------- drills ---------------- */

const ACCIDENTAL_POOL = [
  { target: "V/V", acc: "פה♯", why: "פה♯ הוא הצליל המוביל של סול — חצי טון מתחתיו, מושך מעלה." },
  { target: "V7/IV", acc: "סי♭", why: "דווקא הנמכה: סי♭ היא הספטימה שהופכת את I לדומיננטה של פה." },
  { target: "V/VI", acc: "סול♯", why: "סול♯ — הצליל המוביל של לה. פגשנו אותו כשלה מינור היה הבית; עכשיו הוא אורח." },
  { target: "V/II", acc: "דו♯", why: "דו♯ מוביל אל רה — אפילו הטוניקה עצמה מוותרת על צליל לטובת השגריר." },
] as const;

function accidentalQuestion(): Question {
  const q = pick(ACCIDENTAL_POOL);
  return {
    prompt: (
      <>
        בדו מז'ור, איזה סימן מזדמן יוצר את <span dir="ltr">{q.target}</span>?
      </>
    ),
    options: shuffle(ACCIDENTAL_POOL.map((a) => a.acc)),
    answer: q.acc,
    explain: <>{q.why}</>,
  };
}

const RULE_POOL: Question[] = [
  {
    prompt: <>מהי טוניקיזציה?</>,
    options: [
      "רגע שבו דרגה מקבלת יחס של טוניקה — דומיננטה משלה — בלי לעזוב את הסולם באמת",
      "החלפת סולם קבועה",
      "הוספת צלילים לאקורד",
      "סוג של קדנצה",
    ],
    answer: "רגע שבו דרגה מקבלת יחס של טוניקה — דומיננטה משלה — בלי לעזוב את הסולם באמת",
    explain: <>הבזק של סולם אחר — רגע, לא מעבר. כשהרגע מתארך ומתבסס, קוראים לו מודולציה. זו יחידה 21.</>,
  },
  {
    prompt: <>מה דינו של הצליל המוגבה בדומיננטה משנית (למשל פה♯ ב־V/V)?</>,
    options: [
      "צליל מוביל מקומי: עולה חצי טון אל היעד, ולעולם אינו מוכפל",
      "יורד תמיד",
      "חופשי לגמרי",
      "מוכפל תמיד",
    ],
    answer: "צליל מוביל מקומי: עולה חצי טון אל היעד, ולעולם אינו מוכפל",
    explain: <>כל חוקי הצליל המוביל מיחידה 7 — בהשאלה: המשיכה, הפתרון מעלה, ואיסור ההכפלה.</>,
  },
  {
    prompt: <>איך נמנעים מהצלבה כרומטית (פה ופה♯ בשני קולות שונים ברצף)?</>,
    options: [
      "המהלך הכרומטי נשאר באותו קול: מי ששר פה — הוא שישיר פה♯",
      "מוותרים על הפה♯",
      "מכפילים את שניהם",
      "אי אפשר להימנע",
    ],
    answer: "המהלך הכרומטי נשאר באותו קול: מי ששר פה — הוא שישיר פה♯",
    explain: <>חצי הטון הכרומטי הוא אירוע מלודי — וקול אחד צריך לספר אותו מתחילתו ועד סופו.</>,
  },
  {
    prompt: <>מדוע דווקא V7/IV זקוק לספטימה (סי♭) יותר מכל שגריר אחר?</>,
    options: [
      "בלעדיה הוא פשוט I — הספטימה היא שמפנה אותו מהבית אל IV",
      "כי IV אקורד חלש",
      "הוא לא זקוק לה",
      "כדי שיהיה חזק יותר",
    ],
    answer: "בלעדיה הוא פשוט I — הספטימה היא שמפנה אותו מהבית אל IV",
    explain: <>‏V/V נשמע זר מיד בזכות פה♯; אבל V/IV חולק את כל צליליו עם הטוניקה — רק סי♭ חושפת את כוונתו.</>,
  },
];

function ruleQuestion(): Question {
  return pick(RULE_POOL);
}

const MINOR_POOL: Question[] = [
  {
    prompt: <>בלה מינור, איזה צליל יוצר את V/V — ולאן הוא הולך?</>,
    options: [
      "רה♯, שעולה אל מי — צליל שאינו קיים כלל בסולם, בתפקיד צליל מוביל מקומי",
      "סול♯, שיורד",
      "פה♯ בלבד",
      "סי♭",
    ],
    answer: "רה♯, שעולה אל מי — צליל שאינו קיים כלל בסולם, בתפקיד צליל מוביל מקומי",
    explain: <>‏V של מי (מז'ור!) הוא סי–רה♯–פה♯. הכרומטיקה מגייסת צלילים שהסולם מעולם לא הכיר.</>,
  },
  {
    prompt: <>מה מייחד את הדומיננטות המשניות במינור?</>,
    options: [
      "היעד עצמו (V) הוא אקורד מז'ורי — והשגריר שלו נשמע רחוק במיוחד מהבית המינורי",
      "אין דומיננטות משניות במינור",
      "אין צורך בסימנים מזדמנים",
      "הן תמיד יורדות",
    ],
    answer: "היעד עצמו (V) הוא אקורד מז'ורי — והשגריר שלו נשמע רחוק במיוחד מהבית המינורי",
    explain: <>סי מז'ור בתוך לה מינור: שני עולמות במרחק שני אקורדים. זה כוחה של הכרומטיקה — וזה רק השער.</>,
  },
];

function minorQuestion(): Question {
  return pick(MINOR_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit20() {
  const transPlayer = usePlayer();
  const famPlayer = usePlayer();
  const vvPlayer = usePlayer();
  const vivPlayer = usePlayer();
  const minorPlayer = usePlayer();

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 20 · חלק חמישי</div>
        <h1>דומיננטות משניות וטוניקיזציה</h1>
        <p className="lede">
          תשע־עשרה יחידות חיינו בתוך שבעה צלילים. היחידה הזו חוצה את הגבול — בצעד הקטן ביותר
          האפשרי: חצי טון אחד, שאול מסולם שכן, שהופך אקורד רגיל ל<em className="hl">דומיננטה של
          אקורד אחר</em>. פתאום לכל דרגה יכול להיות צליל מוביל משלה — והסולם כולו מתמלא שערים
          קטנים לעולמות סמוכים.
        </p>
      </header>

      <Section id="borrow" num="20.1" title="לשאול צליל מוביל">
        <p>
          כל הכוח של V ← I ישב תמיד על חצי הטון סי–דו. הרעיון הכרומטי הראשון פשוט להפליא: אפשר{" "}
          <em className="hl">לייצר</em> חצי טון כזה אל כל דרגה שהיא. רוצים לתת ל־V יחס של טוניקה?
          הגביהו את פה לפה♯ בתוך II — וקיבלתם <span dir="ltr">V/V</span>, "דומיננטה של הדומיננטה".
          רוצים להאיר את IV? הנמיכו סי לסי♭ בתוך I — ו־I עצמו הופך{" "}
          <span dir="ltr">V7/IV</span>. אקורד אחד, סימן אחד, עולם חדש:
        </p>
        <Widget
          title="שתי טרנספורמציות של חצי טון — לחצו והשוו לפני/אחרי"
          foot={
            <PlayButton
              label="נגנו את הזוגות"
              events={TRANSFORM.filter((n) => !n.bar).map((n, i) => ({ midi: [...n.midi], time: i * 1.2, dur: 1.25, idx: TRANSFORM.indexOf(n) }))}
              bpm={76}
              player={transPlayer}
            />
          }
        >
          <Score notes={TRANSFORM} width={400} highlightIndex={transPlayer.index} ariaLabel="אקורדים הופכים לדומיננטות משניות" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          זו{" "}
          <Term he="טוניקיזציה" en="Tonicization" def="הענקת יחס של טוניקה רגעית לדרגה בסולם, באמצעות דומיננטה משנית שלה. הבזק — לא מעבר סולם." /> —
          לרגע אחד, דרגה מן השורה מקבלת יחס של בית: דומיננטה משלה, צליל מוביל משלה. האוזן לא עוזבת
          את דו מז'ור באמת; היא רק מציצה מבעד לשער. כשההצצה תתארך לביקור — זו כבר מודולציה, והיא
          מחכה ביחידה 21.
        </Callout>
      </Section>

      <Section id="vv" num="20.2" title="‏V/V — הכרומטיקה הראשונה של כולם">
        <p>
          השגריר הנפוץ ביותר. שימו לב לשלושה דברים בדוגמה: <b>(1)</b> המהלך הכרומטי סול–פה♯–סול
          נשאר כולו בטנור — מי ששר פה ישיר גם פה♯, וכך נמנעת{" "}
          <Term he="הצלבה כרומטית" en="Cross relation" def="הופעת צליל ובן־גרסתו הכרומטי (פה ופה♯) בשני קולות שונים ברצף — צרימה שמסתירים על ידי החזקת המהלך הכרומטי בקול אחד." />;{" "}
          <b>(2)</b> פה♯ מתנהג כצליל מוביל לכל דבר — עולה אל סול, לא מוכפל; <b>(3)</b> הספטימה דו
          מוכנה מהאקורד הקודם ויורדת אל סי, בדיוק כמו ביחידה 13:
        </p>
        <Widget
          title="‏I–V7/V–V–I: עקבו אחרי הטנור — סול, פה♯, סול"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(VofV_MOVE, 1.5)} bpm={66} player={vvPlayer} />}
        >
          <SatbScores chords={VofV_MOVE} marks={VofV_MARKS} highlight={vvPlayer.index} width={340} label="דומיננטה משנית של V" />
        </Widget>
      </Section>

      <Section id="viv" num="20.3" title="‏V7/IV — הטוניקה מחליפה כובע">
        <p>
          המקרה המיוחד: I ו־V/IV הם אותו אקורד בדיוק — דו, מי, סול. רק הספטימה סי♭ חושפת את
          הכוונה: ברגע שהיא נכנסת (בקול הסופרן, ירידה כרומטית דו–סי♭), הבית עצמו הופך שגריר, ומי
          נעשה צליל מוביל מקומי של פה. אחרי הפתרון אל IV, הדרך חזרה מוכרת מיחידה 10 — ‏II6 והקדנצה:
        </p>
        <Widget
          title="‏I–V7/IV–IV–II6–V–I: הבית יוצא לביקור אצל השכן — וחוזר"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(VofIV_MOVE, 1.4)} bpm={69} player={vivPlayer} />}
        >
          <SatbScores chords={VofIV_MOVE} marks={VofIV_MARKS} highlight={vivPlayer.index} width={460} label="דומיננטה משנית של IV" />
        </Widget>
      </Section>

      <Section id="family" num="20.4" title="משפחת השגרירים">
        <p>
          העיקרון כללי: כל דרגה שהאקורד שלה מז'ורי או מינורי — כלומר יכולה להישמע כטוניקה — זכאית
          לדומיננטה משנית. ‏V/II מגייס את דו♯, ‏V/III את רה♯, ‏V/VI את סול♯ (מכר ותיק — הצליל
          המוביל של לה מינור, הפעם כאורח). רק VII המוקטן נשאר בחוץ: אקורד שאינו יכול להיות בית,
          אינו זוכה לשגריר:
        </p>
        <Widget
          title="שלושה שגרירים נוספים — כל אחד עם חצי הטון שלו"
          foot={
            <PlayButton
              label="נגנו את השלושה"
              events={FAMILY.map((n, i) => ({ midi: [...n.midi], time: i * 1.2, dur: 1.25, idx: i }))}
              bpm={76}
              player={famPlayer}
            />
          }
        >
          <Score notes={FAMILY} width={340} highlightIndex={famPlayer.index} ariaLabel="דומיננטות משניות של II, III ו-VI" />
        </Widget>
      </Section>

      <Section id="minor" num="20.5" title="ובמינור? רה♯ — צליל שהסולם לא הכיר">
        <p>
          במינור הרעיון מרחיק לכת עוד יותר: היעד V הוא אקורד מז'ורי (מי–סול♯–סי), ולכן השגריר שלו —
          סי מז'ור — נושא את <em className="hl">רה♯</em>, צליל שאין לו שום קיום בלה מינור. עקבו
          אחרי הטנור: מי–רה♯–מי, אותה תנועה כרומטית מוחזקת בקול אחד, והספטימה לה מוכנה בסופרן:
        </p>
        <Widget
          title="‏i–V7/V–V–i בלה מינור — רה♯ מופיע, מושך, ונעלם"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(MINOR_MOVE, 1.5)} bpm={66} player={minorPlayer} />}
        >
          <SatbScores
            chords={MINOR_MOVE}
            marks={MINOR_MARKS}
            highlight={minorPlayer.index}
            width={340}
            label="דומיננטה משנית של V בלה מינור"
            accidentalKey="Am"
          />
        </Widget>
      </Section>

      <Section id="review" num="20.6" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>הרעיון</b>מייצרים צליל מוביל אל כל דרגה — דומיננטה בהשאלה.</div>
          <div className="review-chip"><b>טוניקיזציה</b>יחס של טוניקה לרגע — הבזק, לא מעבר סולם.</div>
          <div className="review-chip"><b>V/V</b>‏II עם פה♯ — הכרומטיקה הנפוצה ביותר בספרות.</div>
          <div className="review-chip"><b>V7/IV</b>‏I עם סי♭ — הספטימה היא שחושפת את הכוונה.</div>
          <div className="review-chip"><b>הצליל המוגבה</b>צליל מוביל מקומי: עולה, לא מוכפל.</div>
          <div className="review-chip"><b>קול אחד</b>המהלך הכרומטי נשאר באותו קול — בלי הצלבה.</div>
          <div className="review-chip"><b>מי זכאי</b>כל דרגה מז'ורית או מינורית; ‏VII המוקטן — לא.</div>
          <div className="review-chip"><b>במינור</b>‏V/V נושא את רה♯ — צליל מחוץ לסולם לחלוטין.</div>
        </div>
      </Section>

      <Section id="drills" num="20.7" title="תרגול — עד שזה אוטומטי">
        <Drill title="הסימן של כל שגריר" generate={accidentalQuestion} />
        <Drill title="חוקי הטוניקיזציה" generate={ruleQuestion} />
        <Drill title="שגרירים במינור" generate={minorQuestion} />
      </Section>

      <NextUnit current={20}>
        <b>הבא בתור — יחידה 21: מודולציה.</b> מה קורה כשהטוניקיזציה מסרבת להסתיים? כשה־V המוארח
        מתבסס, קונה קדנצה משלו ונשאר — האוזן מחליפה בית. הדרך אל סולם הדומיננטה, אקורד הציר,
        והשיבה.
      </NextUnit>
    </div>
  );
}
