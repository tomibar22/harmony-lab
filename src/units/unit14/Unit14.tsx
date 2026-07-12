import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, FigText, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";
import { SeqEvent } from "../../engine/audio";

/* ---------------- three kinds of root motion, as block-chord pairs ---------------- */

const MOTIONS: ScoreNote[] = [
  { keys: ["d/4", "f/4", "a/4"], midi: [62, 65, 69], mark: "II", sub: "קווינטה יורדת" },
  { keys: ["g/3", "b/3", "d/4"], midi: [55, 59, 62], mark: "V" },
  { bar: true, keys: [], midi: [] },
  { keys: ["c/4", "e/4", "g/4"], midi: [60, 64, 67], mark: "I", sub: "טרצה יורדת" },
  { keys: ["a/3", "c/4", "e/4"], midi: [57, 60, 64], mark: "VI" },
  { bar: true, keys: [], midi: [] },
  { keys: ["f/4", "a/4", "c/5"], midi: [65, 69, 72], mark: "IV", sub: "סקונדה עולה" },
  { keys: ["g/4", "b/4", "d/5"], midi: [67, 71, 74], mark: "V" },
];

/* barlines occupy a highlight slot but not a time slot */
function seqOf(notes: ScoreNote[], dur = 1.2): SeqEvent[] {
  const evs: SeqEvent[] = [];
  let beat = 0;
  notes.forEach((n, i) => {
    if (n.bar) return;
    evs.push({ midi: [...n.midi], time: beat * dur, dur: dur * 1.04, idx: i });
    beat++;
  });
  return evs;
}

/* ---------------- the reusable four-voice chords ----------------
   every adjacent pair in every progression below was checked by hand
   for parallels, resolution duties, ranges and spacing */

/* III harmonizing the descending soprano 8-7-6-5 (C major) */
const DESCENT: Satb[] = [
  { s: ["c/5", 72], a: ["g/4", 67], t: ["e/4", 64], b: ["c/3", 48] },
  { s: ["b/4", 71], a: ["g/4", 67], t: ["e/4", 64], b: ["e/3", 52] },
  { s: ["a/4", 69], a: ["f/4", 65], t: ["c/4", 60], b: ["f/3", 53] },
  { s: ["g/4", 67], a: ["d/4", 62], t: ["b/3", 59], b: ["g/3", 55] },
  { s: ["g/4", 67], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
];
const DESCENT_MARKS = ["I", "III", "IV", "V", "I"];

/* the same idea in A minor: the natural descending scale, G# only inside V */
const MINOR_DESCENT: Satb[] = [
  { s: ["a/4", 69], a: ["e/4", 64], t: ["c/4", 60], b: ["a/2", 45] },
  { s: ["g/4", 67], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
  { s: ["f/4", 65], a: ["d/4", 62], t: ["a/3", 57], b: ["d/3", 50] },
  { s: ["e/4", 64], a: ["b/3", 59], t: ["g#/3", 56], b: ["e/3", 52] },
  { s: ["e/4", 64], a: ["c/4", 60], t: ["a/3", 57], b: ["a/2", 45] },
];
const MINOR_MARKS = ["i", "III", "iv", "V", "i"];

/* ---------------- the complete diatonic family ---------------- */

const FAMILY: ScoreNote[] = [
  { keys: ["c/4", "e/4", "g/4"], midi: [60, 64, 67], mark: "I", sub: "הבית", kind: "stable" },
  { keys: ["d/4", "f/4", "a/4"], midi: [62, 65, 69], mark: "II", sub: "הכנה" },
  { keys: ["e/4", "g/4", "b/4"], midi: [64, 67, 71], mark: "III", sub: "הצל" },
  { keys: ["f/4", "a/4", "c/5"], midi: [65, 69, 72], mark: "IV", sub: "הכנה" },
  { keys: ["g/4", "b/4", "d/5"], midi: [67, 71, 74], mark: "V", sub: "המתח", kind: "active" },
  { keys: ["a/4", "c/5", "e/5"], midi: [69, 72, 76], mark: "VI", sub: "המתחזה" },
  { keys: ["b/4", "d/5", "f/5"], midi: [71, 74, 77], mark: "VII", sub: "הגשר" },
];

/* ---------------- drills ---------------- */

const MOTION_POOL = [
  { pair: "II ← V", ans: "קווינטה יורדת", why: "רה אל סול — אותה קפיצה כמו סול אל דו. החזקה שבתנועות." },
  { pair: "V ← I", ans: "קווינטה יורדת", why: "אב־התנועות: הדומיננטה נופלת אל הבית." },
  { pair: "I ← VI", ans: "טרצה יורדת", why: "שני צלילים משותפים — מעבר רך שמחליף צבע בלי לזוז כמעט." },
  { pair: "IV ← V", ans: "סקונדה", why: "אף צליל משותף — ולכן הקולות העליונים חייבים תנועה נגדית לבס." },
  { pair: "V ← VI", ans: "סקונדה", why: "הקדנצה הנמנעת: יסודות שכנים, תנועה נגדית, והכפלת הטרצה." },
] as const;

function motionQuestion(): Question {
  const q = pick(MOTION_POOL);
  return {
    prompt: (
      <>
        מהי תנועת היסודות במעבר <span dir="ltr">{q.pair}</span>?
      </>
    ),
    options: shuffle(["קווינטה יורדת", "טרצה יורדת", "סקונדה"]),
    answer: q.ans,
    explain: <>{q.why}</>,
  };
}

const III_POOL: Question[] = [
  {
    prompt: <>אילו דרגות בונות את III?</>,
    options: ["3, 5, 7", "1, 3, 5", "2, 4, 6", "4, 6, 1"],
    answer: "3, 5, 7",
    explain: <>המדיאנטה, הדומיננטה — והצליל המוביל. השילוב המוזר הזה הוא מפתח לאופיו.</>,
  },
  {
    prompt: <>מה תפקידו הקלאסי של III במז'ור?</>,
    options: [
      "לתמוך בצליל המוביל כשהמלודיה יורדת 8–7–6",
      "לסיים קדנצות",
      "להכין את הדומיננטה",
      "להחליף את IV",
    ],
    answer: "לתמוך בצליל המוביל כשהמלודיה יורדת 8–7–6",
    explain: <>בתוך III, סי הוא צליל אקורד רגיל — ומותר לו לרדת אל לה במקום לעלות אל דו.</>,
  },
  {
    prompt: <>מדוע הצליל המוביל רשאי לרדת בתוך III?</>,
    options: [
      "האקורד אינו דומיננטי — סי כאן צליל אקורד שירד עם הקו, לא מתח שדורש פתרון",
      "כי הוא תמיד יורד",
      "זו טעות נפוצה שהותרה",
      "רק במינור מותר",
    ],
    answer: "האקורד אינו דומיננטי — סי כאן צליל אקורד שירד עם הקו, לא מתח שדורש פתרון",
    explain: <>המשיכה של הצליל המוביל נולדת מהקשר דומיננטי (V, VII). בתוך III הוא סתם קומה שלישית של האקורד.</>,
  },
  {
    prompt: <>מדוע III נדיר במז'ור?</>,
    options: [
      "הוא נוגע בשטח של I ושל V בלי הכוח של אף אחד מהם",
      "הוא צורם",
      "אסור לשיר את צליליו",
      "הוא קיים רק במינור",
    ],
    answer: "הוא נוגע בשטח של I ושל V בלי הכוח של אף אחד מהם",
    explain: <>שניים מצליליו שייכים ל־I ושניים ל־V — יש לו תפקיד משלו רק כשהקו המלודי מזמין אותו.</>,
  },
];

function iiiQuestion(): Question {
  return pick(III_POOL);
}

const MINOR_POOL: Question[] = [
  {
    prompt: <>מה איכותו של III במינור, ומה משמעותו?</>,
    options: [
      "מז'ורי — זהו אקורד הסולם המקביל, שער שדרכו המינור נוטה אל המז'ור",
      "מינורי חסר חשיבות",
      "מוקטן ולכן נדיר",
      "מוגדל תמיד",
    ],
    answer: "מז'ורי — זהו אקורד הסולם המקביל, שער שדרכו המינור נוטה אל המז'ור",
    explain: <>דו–מי–סול בתוך לה מינור: הרמז הראשון למודולציה שתגיע בהמשך הספר.</>,
  },
  {
    prompt: <>בלה מינור, אילו צלילים בונים את III?</>,
    options: ["דו, מי, סול טבעי", "דו, מי, סול דיאז", "סי, רה, פה", "דו, מי במול, סול"],
    answer: "דו, מי, סול טבעי",
    explain: <>ההגבהה שייכת לדומיננטה בלבד. ‏III חי בצד הטבעי של המינור — סול♮ הוא הסוּבּטוניקה.</>,
  },
  {
    prompt: <>בירידה 8–7–6–5 במינור (לה–סול–פה–מי), מדוע סול ופה טבעיים?</>,
    options: [
      "הקו יורד — וההגבהות קיימות רק בעלייה אל הטוניקה או בתוך הדומיננטה",
      "טעות — צריך להגביה",
      "כי כך קל יותר לשיר",
      "אין הבדל",
    ],
    answer: "הקו יורד — וההגבהות קיימות רק בעלייה אל הטוניקה או בתוך הדומיננטה",
    explain: <>בדיוק כפי שלמדנו ביחידה 1: המינור המלודי מגביה בעלייה ומשחרר בירידה. ההרמוניה מצייתת לקו.</>,
  },
];

function minorQuestion(): Question {
  return pick(MINOR_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit14() {
  const motPlayer = usePlayer();
  const descPlayer = usePlayer();
  const minorPlayer = usePlayer();
  const famPlayer = usePlayer();

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 14 · חלק שלישי</div>
        <h1><FigText text="טכניקות 5/3: ‏III ותנועות היסודות" /></h1>
        <p className="lede">
          החלק השני לימד אותנו תחביר: מה בא לפני מה. החלק השלישי שואל שאלה אחרת — <em className="hl">איך
          דברים נעים</em>. נפתח במצב היסודי: שלוש דרכים שבהן יסוד הולך אל יסוד, והמשולש האחרון שטרם
          פגשנו — III, האקורד שחי בצילם של כל האחרים ויודע לעשות דבר אחד שאיש מלבדו אינו יכול.
        </p>
      </header>

      <Section id="motions" num="14.1" title="שלוש תנועות של יסודות">
        <p>
          כל מעבר בין אקורדים במצב יסודי שייך לאחת משלוש משפחות, ולכל אחת אופי וכללים משלה.{" "}
          <b>קווינטה יורדת</b> (V ← I, ‏II ← V) — התנועה החזקה, מנוע הטונאליות, עם צליל משותף אחד.{" "}
          <b>טרצה יורדת</b> (I ← VI, ‏VI ← IV) — הרכה שבתנועות: שני צלילים משותפים, הצבע מתחלף
          כמעט בלי תזוזה. <b>סקונדה</b> (IV ← V, ‏V ← VI) — הדרמטית: אף צליל משותף, ולכן חובת
          תנועה נגדית לבס:
        </p>
        <Widget
          title="שלושת הזוגות — הקשיבו לאופי של כל תנועה"
          foot={<PlayButton label="נגנו את הזוגות" events={seqOf(MOTIONS, 1.15)} bpm={72} player={motPlayer} />}
        >
          <Score notes={MOTIONS} width={430} highlightIndex={motPlayer.index} ariaLabel="שלוש תנועות יסודות: קווינטה, טרצה וסקונדה" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          שימו לב לחשבון הצלילים המשותפים: קווינטה — אחד, טרצה — שניים, סקונדה — אפס. המספר הזה
          מכתיב הכול: כמה קולות יכולים לנוח, כמה חייבים לזוז, וכמה זהירות דורש המעבר. שלוש המשפחות
          הללו הן כל הדקדוק של המצב היסודי.
        </Callout>
      </Section>

      <Section id="iii" num="14.2" title="‏III — המשולש האחרון, והצליל המוביל היורד">
        <p>
          משולש המדיאנטה <b>III</b> בנוי על <Deg n="3" kind="stable" /> ומכיל את <Deg n="5" /> ואת{" "}
          <Deg n="7" kind="active" /> — שניים מצליליו שייכים ל־I, שניים ל־V, ולכן רוב הזמן אין לו
          מה להציע שהשכנים אינם עושים טוב ממנו. אבל תפקיד אחד שמור לו לבדו: כשהסופרן יורד{" "}
          <span dir="ltr">8–7–6–5</span>, מישהו צריך לתמוך בסי <em className="hl">היורד</em> — וב־V
          אסור לו לרדת. בתוך III, סי הוא סתם צליל אקורד, חופשי ללכת עם הקו:
        </p>
        <Widget
          title="‏I–III–IV–V–I: הסופרן יורד דו–סי–לה–סול, ו־III מכשיר את הירידה"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(DESCENT, 1.5)} bpm={69} player={descPlayer} />}
        >
          <SatbScores chords={DESCENT} marks={DESCENT_MARKS} highlight={descPlayer.index} width={400} label="מהלך I–III–IV–V–I עם סופרן יורד" />
        </Widget>
        <Callout label="דקות חשובה">
          זה אינו ביטול של חוק הצליל המוביל אלא חידוד שלו: המשיכה מעלה נולדת מ<em className="hl">הקשר
          דומיננטי</em>. אותו סי, בתוך V — מתח שחייב פתרון; בתוך III — קומה שלישית של אקורד, שמותר
          לה לרדת עם המלודיה. הצליל לא השתנה; ההקשר כן.
        </Callout>
      </Section>

      <Section id="minor" num="14.3" title="‏III במינור — שער הסולם המקביל">
        <p>
          במז'ור III הוא צל; במינור הוא כוכב. שם הוא משולש <b>מז'ורי</b> — דו–מי–סול בתוך לה מינור —
          כלומר אקורד הטוניקה של ה
          <Term he="סולם המקביל" en="Relative major" def="הסולם המז'ורי שחולק עם המינור את אותם צלילים ואותו סימן היתק — בנוי על הדרגה השלישית שלו." /> כולו.
          שימו לב: בתוכו סול <em className="hl">טבעי</em> — ההגבהה שמורה לדומיננטה בלבד, והקו היורד
          לה–סול–פה–מי משתמש בצד הטבעי של המינור, בדיוק כפי שלמד המינור המלודי ביחידה 1. סול♯ מופיע
          רק ברגע שמגיעים ל־V:
        </p>
        <Widget
          title="‏i–III–iv–V–i: ירידה טבעית — וההגבהה נשמרת לדומיננטה"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(MINOR_DESCENT, 1.5)} bpm={69} player={minorPlayer} />}
        >
          <SatbScores
            chords={MINOR_DESCENT}
            marks={MINOR_MARKS}
            highlight={minorPlayer.index}
            width={400}
            label="מהלך i–III–iv–V–i בלה מינור"
            accidentalKey="Am"
          />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          ‏III במינור הוא ההצצה הראשונה אל אחד הסודות הגדולים של הטונאליות: כל יצירה מינורית נושאת
          בתוכה מז'ור שלם, במרחק טרצה. כשנגיע למודולציה, הדלת הזו — המינור שנשען אל מקבילו — תהיה
          הראשונה שנפתח.
        </Callout>
      </Section>

      <Section id="family" num="14.4" title="המשפחה בשלמותה">
        <p>
          עם III, פגשנו את כל שבעת המשולשים הדיאטוניים. זה הרגע למבט אחד על המשפחה כולה — כל אחד
          ותפקידו בדרמה:
        </p>
        <Widget
          title="שבעת המשולשים של דו מז'ור — לחצו על כל אחד"
          foot={<PlayButton label="נגנו את כולם" events={FAMILY.map((n, i) => ({ midi: [...n.midi], time: i * 0.95, dur: 1, idx: i }))} bpm={84} player={famPlayer} />}
        >
          <Score notes={FAMILY} width={520} highlightIndex={famPlayer.index} ariaLabel="שבעת המשולשים הדיאטוניים ותפקידיהם" />
        </Widget>
      </Section>

      <Section id="review" num="14.5" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>קווינטה יורדת</b>התנועה החזקה; צליל משותף אחד. ‏II ← V ← I.</div>
          <div className="review-chip"><b>טרצה יורדת</b>הרכה; שני צלילים משותפים. ‏I ← VI ← IV.</div>
          <div className="review-chip"><b>סקונדה</b>אף צליל משותף — קולות עליונים נגד הבס. ‏IV ← V.</div>
          <div className="review-chip"><b>III</b>‏3–5–7: שניים מ־I, שניים מ־V — ולכן נדיר במז'ור.</div>
          <div className="review-chip"><b>התפקיד</b>תומך בצליל המוביל היורד: סופרן 8–7–6–5 מעל I–III–IV–V.</div>
          <div className="review-chip"><b>העיקרון</b>משיכת הצליל המוביל תלויה בהקשר דומיננטי — לא בצליל עצמו.</div>
          <div className="review-chip"><b>במינור</b>‏III מז'ורי — אקורד הסולם המקביל; סול טבעי בתוכו.</div>
          <div className="review-chip"><b>הצד הטבעי</b>בירידה אין הגבהות: ♯ שמור לדומיננטה בלבד.</div>
        </div>
      </Section>

      <Section id="drills" num="14.6" title="תרגול — עד שזה אוטומטי">
        <Drill title="תנועות היסודות" generate={motionQuestion} />
        <Drill title="המדיאנטה" generate={iiiQuestion} />
        <Drill title="‏III במינור" generate={minorQuestion} />
      </Section>

      <NextUnit current={14}>
        <b>הבא בתור — יחידה 15: סקוונצות דיאטוניות.</b> מה קורה כשתנועת יסודות אחת חוזרת שוב ושוב,
        קומה אחרי קומה במורד הסולם? המכונה היפה ביותר של הבארוק.
      </NextUnit>
    </div>
  );
}
