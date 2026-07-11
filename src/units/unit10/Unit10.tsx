import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";

/* ---------------- the intermediate chords, side by side ---------------- */

const S_CHORDS: ScoreNote[] = [
  { keys: ["f/4", "a/4", "c/5"], midi: [65, 69, 72], mark: "IV", sub: "4 · 6 · 1" },
  { keys: ["d/4", "f/4", "a/4"], midi: [62, 65, 69], mark: "II", sub: "2 · 4 · 6" },
  { keys: ["f/4", "a/4", "d/5"], midi: [65, 69, 74], mark: "II6", fig: "6", sub: "בס: פה" },
];

/* ---------------- the reusable four-voice chords (C major) ----------------
   every adjacent pair in every progression below was checked by hand
   for parallels, resolution duties, ranges and spacing */

const I_OPEN: Satb = { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] };
const V_CLOSE: Satb = { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/3", 55] };
const II6_CHORD: Satb = { s: ["d/5", 74], a: ["f/4", 65], t: ["a/3", 57], b: ["f/3", 53] };

/* ---------------- IV: no common tone with V — upper voices go down ---------------- */

const IV_MOVE: Satb[] = [
  I_OPEN,
  { s: ["c/5", 72], a: ["f/4", 65], t: ["a/3", 57], b: ["f/3", 53] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/3", 55] },
  I_OPEN,
];

/* ---------------- II: the falling-fifth engine ---------------- */

const II_MOVE: Satb[] = [
  I_OPEN,
  { s: ["a/4", 69], a: ["d/4", 62], t: ["f/3", 53], b: ["d/3", 50] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/2", 43] },
  I_OPEN,
];

/* ---------------- II6: the bass of IV, the sound of II ---------------- */

const II6_MOVE: Satb[] = [I_OPEN, II6_CHORD, V_CLOSE, I_OPEN];

/* ---------------- the complete sentence, with a prepared seventh ---------------- */

const SENTENCE: Satb[] = [
  I_OPEN,
  II6_CHORD,
  { s: ["b/4", 71], a: ["f/4", 65], t: ["g/3", 55], b: ["g/3", 55] },
  I_OPEN,
];
const SENTENCE_MARKS = ["I", "II6", "V7", "I"];

/* ---------------- in minor: ii° lives only in first inversion ---------------- */

const MINOR_II6: Satb[] = [
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["f/3", 53], b: ["d/3", 50] },
  { s: ["g#/4", 68], a: ["b/3", 59], t: ["e/3", 52], b: ["e/3", 52] },
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
];
const MINOR_MARKS = ["i", "II6", "V", "i"];

/* ---------------- drills ---------------- */

const TONES_POOL = [
  { chord: "IV", tones: "4, 6, 1", why: "הסובדומיננטה, הסובמדיאנטה והטוניקה — צליל משותף אחד עם I." },
  { chord: "II", tones: "2, 4, 6", why: "הסופרטוניקה ושתי שכנותיה — צליל משותף אחד עם V (הדרגה 2)." },
  { chord: "I", tones: "1, 3, 5", why: "משולש הטוניקה — היציבות עצמן." },
  { chord: "V", tones: "5, 7, 2", why: "משולש הדומיננטה — המשיכות של הסולם." },
] as const;

function tonesQuestion(): Question {
  const q = pick(TONES_POOL);
  return {
    prompt: (
      <>
        אילו דרגות בונות את <span dir="ltr">{q.chord}</span>?
      </>
    ),
    options: shuffle(TONES_POOL.map((c) => c.tones)),
    answer: q.tones,
    explain: <>{q.why}</>,
  };
}

const CRAFT_POOL: Question[] = [
  {
    prompt: <>ל־IV ול־V אין צליל משותף. איך מחברים אותם בלי מקבילות?</>,
    options: [
      "הקולות העליונים יורדים — בניגוד לבס העולה",
      "כל הקולות עולים יחד עם הבס",
      "מקפיצים את הסופרן אוקטבה",
      "משמיטים את הקווינטה של V",
    ],
    answer: "הקולות העליונים יורדים — בניגוד לבס העולה",
    explain: <>תנועה נגדית לבס היא הביטוח: כשכולם עולים יחד נולדות קווינטות ואוקטבות מקבילות.</>,
  },
  {
    prompt: <>מה מכפילים בדרך כלל ב־II6?</>,
    options: ["את הבס (דרגה 4)", "את היסוד (דרגה 2)", "את הסקסטה", "שום דבר"],
    answer: "את הבס (דרגה 4)",
    explain: <>כמו בסקסט־אקורדים בכלל: ההכפלה משרתת את הובלת הקולות, והבס — הסובדומיננטה — מועמד מצוין.</>,
  },
  {
    prompt: <>מדוע II–V נחשב חיבור חזק במיוחד?</>,
    options: [
      "היסודות נופלים בקווינטה — התנועה החזקה בטונאליות",
      "יש להם שלושה צלילים משותפים",
      "שניהם אקורדים מז'וריים",
      "הבס נשאר במקום",
    ],
    answer: "היסודות נופלים בקווינטה — התנועה החזקה בטונאליות",
    explain: <>רה → סול היא אותה תנועת יסודות כמו סול → דו. שרשרת הקווינטות היורדות היא המנוע של ההרמוניה.</>,
  },
  {
    prompt: <>ב־II6–V7 הספטימה של V7 יכולה להיות "מוכנה". מה זה אומר?</>,
    options: [
      "הצליל פה כבר נמצא באותו קול ב־II6 ופשוט נשאר",
      "מנגנים אותה חזק יותר",
      "היא מגיעה בקפיצה",
      "היא מושמטת",
    ],
    answer: "הצליל פה כבר נמצא באותו קול ב־II6 ופשוט נשאר",
    explain: <>בדיוק כמו הכנת דיסוננס בהשהיה מהקונטרפונקט: הדיסוננס נכנס כצליל מוחזק — רך ומשכנע.</>,
  },
  {
    prompt: <>האם המהלך V ← IV (סובדומיננטה אחרי דומיננטה) מקובל?</>,
    options: [
      "לא — הכיוון הוא T–S–D–T, והנסיגה נשמעת הפוכה",
      "כן, זה המהלך הנפוץ ביותר",
      "רק במינור",
      "רק בקדנצה",
    ],
    answer: "לא — הכיוון הוא T–S–D–T, והנסיגה נשמעת הפוכה",
    explain: <>אקורדי הביניים מכינים את V, לא ממשיכים אותו. אחרי הדומיננטה האוזן מצפה לטוניקה.</>,
  },
];

function craftQuestion(): Question {
  return pick(CRAFT_POOL);
}

const MINOR_POOL: Question[] = [
  {
    prompt: <>מדוע במינור משתמשים ב־II6 ולא ב־II במצב יסודי?</>,
    options: [
      "‏II במינור הוא משולש מוקטן — במצב יסודי הקווינטה המוקטנת חשופה מעל הבס",
      "‏II לא קיים במינור",
      "הבס גבוה מדי",
      "אין סיבה — שניהם שווים",
    ],
    answer: "‏II במינור הוא משולש מוקטן — במצב יסודי הקווינטה המוקטנת חשופה מעל הבס",
    explain: <>אותו היגיון כמו VII: משולש מוקטן חי בנוח רק בהיפוך ראשון, כשהדיסוננס נחבא בין הקולות העליונים.</>,
  },
  {
    prompt: <>בלה מינור, אילו צלילים בונים את II6?</>,
    options: ["רה בבס, ומעליו פה, סי", "רה בבס, ומעליו פה, סי במול", "מי בבס, ומעליו סול, דו", "פה בבס, ומעליו לה, דו"],
    answer: "רה בבס, ומעליו פה, סי",
    explain: <>‏II בלה מינור: סי–רה–פה (מוקטן). בהיפוך ראשון רה בבס — והסולם נותן פה וסי טבעיים.</>,
  },
];

function minorQuestion(): Question {
  return pick(MINOR_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit10() {
  const cmpPlayer = usePlayer();
  const ivPlayer = usePlayer();
  const iiPlayer = usePlayer();
  const ii6Player = usePlayer();
  const sentPlayer = usePlayer();
  const minorPlayer = usePlayer();

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 10 · חלק שני</div>
        <h1>בדרך אל V: ‏IV, ‏II ו־II6</h1>
        <p className="lede">
          עד עכשיו הגענו לדומיננטה היישר מהטוניקה. הגיע הזמן לתחנת ביניים: אקורד שיוצא מהבית, צובר
          תנופה, ומוסר את המקל ל־V. אלה אקורדי ההכנה — הסובדומיננטה והסופרטוניקה — והם משלימים את
          המשפט הטונאלי: טוניקה, הכנה, דומיננטה, טוניקה.
        </p>
      </header>

      <Section id="between" num="10.1" title="הצלע השלישית של המשפט">
        <p>
          <Term he="הרמוניות ביניים" en="Intermediate harmonies" def="אקורדים שתפקידם להוביל מהטוניקה אל הדומיננטה — ובראשם IV ו־II. באות אחרי I ולפני V, לא להפך." /> נשענות
          על שתי הדרגות שמקיפות את הדומיננטה: <Deg n="4" kind="active" /> ו־<Deg n="6" />, ואיתן{" "}
          <Deg n="2" kind="active" />. משולש הסובדומיננטה <b>IV</b> חולק צליל אחד עם I (הטוניקה עצמה),
          ומשולש הסופרטוניקה <b>II</b> חולק צליל אחד עם V — כל אחד אוחז ביד אחרת, ולכן שניהם גשרים
          טבעיים. ואת II נפגוש לרוב בהיפוך ראשון, <b>II6</b>, שמעמיד בבס את אותה סובדומיננטה של IV:
        </p>
        <Widget
          title="שלושת אקורדי ההכנה — לחצו והשוו"
          foot={
            <PlayButton
              label="נגנו את השלושה"
              events={S_CHORDS.map((n, i) => ({ midi: n.midi, time: i * 1.2, dur: 1.25, idx: i }))}
              bpm={80}
              player={cmpPlayer}
            />
          }
        >
          <Score notes={S_CHORDS} width={330} highlightIndex={cmpPlayer.index} ariaLabel="אקורדי הסובדומיננטה והסופרטוניקה" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          הדקדוק הטונאלי הוא חד־כיווני: טוניקה ← הכנה ← דומיננטה ← טוניקה. ‏IV ו־II באים{" "}
          <em className="hl">לפני</em> V ולא אחריו — דומיננטה שנסוגה אל הסובדומיננטה נשמעת כמו משפט
          שהתחרט באמצע. הכיוון הזה הוא שהופך רצף אקורדים לתחביר.
        </Callout>
      </Section>

      <Section id="iv" num="10.2" title="‏IV — הסובדומיננטה">
        <p>
          החיבור I–IV נוח: דו משותף לשניהם, ושאר הקולות זזים בצעד. אבל IV–V הוא סיפור אחר —{" "}
          <em className="hl">אין ביניהם אף צליל משותף</em>, ושני האקורדים בנויים על בסים סמוכים. הפתרון
          הבדוק: הבס עולה פה–סול, ושלושת הקולות העליונים יורדים אל הצליל הקרוב — תנועה נגדית לבס:
        </p>
        <Widget
          title="‏I–IV–V–I: הקשיבו לקולות העליונים יורדים כשהבס עולה"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(IV_MOVE, 1.5)} bpm={72} player={ivPlayer} />}
        >
          <SatbScores chords={IV_MOVE} marks={["I", "IV", "V", "I"]} highlight={ivPlayer.index} width={340} label="מהלך I–IV–V–I" />
        </Widget>
        <Callout label="אזהרת מקבילות">
          המלכודת הנפוצה ביותר בכתיבה הרמונית: לגרור את כל הקולות מעלה יחד עם הבס ב־IV–V. התוצאה —
          קווינטות ואוקטבות מקבילות בשורה. כשאין צליל משותף בין אקורדים סמוכים, תנועה נגדית לבס היא
          חגורת הבטיחות.
        </Callout>
      </Section>

      <Section id="ii" num="10.3" title="‏II — מנוע הקווינטה היורדת">
        <p>
          ל־II יש יתרון מבני על IV: היסוד שלו נופל אל היסוד של V ב<b>קווינטה יורדת</b> — רה אל סול —
          בדיוק כפי שסול נופל אל דו. זו התנועה החזקה ביותר בין יסודות בטונאליות, ולכן II–V–I הוא שרשרת
          של שתי קווינטות יורדות, המנוע שיניע בהמשך את הסקוונצות כולן. גם כאן, ביציאה מ־I עדיף שהקולות
          העליונים יירדו:
        </p>
        <Widget
          title="‏I–II–V–I: יסודות נופלים בקווינטות — רה ← סול ← דו"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(II_MOVE, 1.5)} bpm={72} player={iiPlayer} />}
        >
          <SatbScores chords={II_MOVE} marks={["I", "II", "V", "I"]} highlight={iiPlayer.index} width={340} label="מהלך I–II–V–I" />
        </Widget>
      </Section>

      <Section id="ii6" num="10.4" title="‏II6 — הבס של IV, הצליל של II">
        <p>
          ההיפוך הראשון של II מציע את הטוב משני העולמות: בבס יושבת <Deg n="4" kind="active" /> — אותו
          צעד פה–סול נוח של IV — ומעליה מצלצלת הסופרטוניקה עם משיכת הקווינטה שלה אל V. לכן II6 הוא
          אקורד ההכנה האהוב על הסגנון, בייחוד בקדנצות. בהכפלה — כרגיל בסקסט־אקורדים — מעדיפים את הבס:
        </p>
        <Widget
          title="‏I–II6–V–I: פה בבס, ומעליו הצליל של הסופרטוניקה"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(II6_MOVE, 1.5)} bpm={72} player={ii6Player} />}
        >
          <SatbScores chords={II6_MOVE} marks={["I", "II6", "V", "I"]} highlight={ii6Player.index} width={340} label="מהלך I–II6–V–I" />
        </Widget>
      </Section>

      <Section id="sentence" num="10.5" title="המשפט השלם — וספטימה מוכנה">
        <p>
          עכשיו אפשר לכתוב את המשפט הטונאלי המלא, ועם בונוס של יופי: כש־II6 ממשיך אל V7, הצליל פה —
          שכבר נמצא ב־II6 — פשוט <em className="hl">נשאר באותו קול</em> והופך לספטימה. הדיסוננס לא
          נכנס בקפיצה אלא כצליל מוחזק, בדיוק כמו הכנת ההשהיה שלמדנו בקונטרפונקט. הקשיבו לאלט: פה אחת,
          שמחליפה משמעות באמצע הדרך ואז נפתרת אל מי:
        </p>
        <Widget
          title="‏I–II6–V7–I: האלט מחזיק את פה — הכנה, דיסוננס, פתרון"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(SENTENCE, 1.5)} bpm={68} player={sentPlayer} />}
        >
          <SatbScores chords={SENTENCE} marks={SENTENCE_MARKS} highlight={sentPlayer.index} width={340} label="מהלך I–II6–V7–I עם ספטימה מוכנה" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          ‏T–S–D–T: טוניקה, הכנה, דומיננטה, טוניקה. זה השלד של רוב המשפטים במוזיקה הטונאלית — מקורל
          של באך ועד שיר פופ. שלוש היחידות הבאות יעשירו כל צלע במבנה הזה, אבל התחביר עצמו כבר שלם.
        </Callout>
      </Section>

      <Section id="minor" num="10.6" title="ובמינור? ‏II חי רק בהיפוך ראשון">
        <p>
          במינור, משולש הסופרטוניקה הוא <b>מוקטן</b> — סי–רה–פה בלה מינור — ולכן, כמו VII, הוא נמנע
          ממצב יסודי: הקווינטה המוקטנת חשופה מדי מעל הבס. ‏II6 פותר את הבעיה בדיוק באותה דרך, עם רה
          בבס. ‏IV לעומתו הופך פשוט למינורי, וכשר לגמרי. וכמובן — הדומיננטה עדיין דורשת את הצליל
          המוביל המוגבה:
        </p>
        <Widget
          title="‏i–II6–V–i בלה מינור — האקורד המוקטן מוצא בית בהיפוך"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(MINOR_II6, 1.5)} bpm={72} player={minorPlayer} />}
        >
          <SatbScores
            chords={MINOR_II6}
            marks={MINOR_MARKS}
            highlight={minorPlayer.index}
            width={340}
            label="מהלך i–II6–V–i בלה מינור"
            accidentalKey="Am"
          />
        </Widget>
      </Section>

      <Section id="review" num="10.7" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>המשפט השלם</b>‏T–S–D–T: טוניקה ← הכנה ← דומיננטה ← טוניקה. חד־כיווני.</div>
          <div className="review-chip"><b>IV</b>צליל משותף עם I; אל V — קולות עליונים יורדים נגד הבס.</div>
          <div className="review-chip"><b>המלכודת</b>‏IV–V עם כל הקולות מעלה = מקבילות. תנועה נגדית מצילה.</div>
          <div className="review-chip"><b>II</b>יסוד שנופל בקווינטה אל V — התנועה החזקה בטונאליות.</div>
          <div className="review-chip"><b>II6</b>הבס של IV, הצליל של II — אקורד ההכנה המועדף. מכפילים את הבס.</div>
          <div className="review-chip"><b>ספטימה מוכנה</b>‏II6–V7: פה נשארת באותו קול והופכת לדיסוננס מוחזק.</div>
          <div className="review-chip"><b>אין נסיגה</b>אחרי V לא חוזרים ל־IV או ל־II — הדומיננטה הולכת הביתה.</div>
          <div className="review-chip"><b>במינור</b>‏II מוקטן — חי רק כ־II6; ‏IV מינורי; ‏V עם 7 מוגבהת.</div>
        </div>
      </Section>

      <Section id="drills" num="10.8" title="תרגול — עד שזה אוטומטי">
        <Drill title="צלילי האקורדים" generate={tonesQuestion} />
        <Drill title="מלאכת החיבור" generate={craftQuestion} />
        <Drill title="הסופרטוניקה במינור" generate={minorQuestion} />
      </Section>

      <NextUnit current={10}>
        <b>הבא בתור — יחידה 11: הקוורט־סקסט הקדנציאלי.</b> אקורד 6/4 מפורסם שנשמע כמו טוניקה אבל
        מתפקד כקישוט של הדומיננטה — עיכוב דרמטי רגע לפני הקדנצה.
      </NextUnit>
    </div>
  );
}
