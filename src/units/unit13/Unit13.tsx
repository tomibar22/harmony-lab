import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick } from "../../components/Drill";
import { Callout, Deg, FigText, PlayButton, Rn, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";

/* ---------------- the preparation chords grow a seventh ---------------- */

const SEVENTH_CHORDS: ScoreNote[] = [
  { keys: ["d/4", "f/4", "a/4", "c/5"], midi: [62, 65, 69, 72], mark: "II7", fig: "7", sub: "בס: רה" },
  { keys: ["f/4", "a/4", "c/5", "d/5"], midi: [65, 69, 72, 74], mark: "II65", fig: "6/5", sub: "בס: פה" },
  { keys: ["f/4", "a/4", "c/5", "e/5"], midi: [65, 69, 72, 76], mark: "IV7", fig: "7", sub: "בס: פה" },
];

/* ---------------- the reusable four-voice chords (C major) ----------------
   every adjacent pair in every progression below was checked by hand
   for parallels, resolution duties, ranges and spacing */

const I_OPEN: Satb = { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] };
const V_CLOSE: Satb = { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/3", 55] };

/* ---------------- II65: the cadence workhorse ---------------- */

const II65_MOVE: Satb[] = [
  I_OPEN,
  { s: ["c/5", 72], a: ["d/4", 62], t: ["a/3", 57], b: ["f/3", 53] },
  V_CLOSE,
  I_OPEN,
];
const II65_MARKS = ["I", "II65", "V", "I"];

/* ---------------- II7 in root position: falling fifths ---------------- */

const II7_CHAIN: Satb[] = [
  I_OPEN,
  { s: ["c/5", 72], a: ["c/4", 60], t: ["g/3", 55], b: ["e/3", 52] },
  { s: ["c/5", 72], a: ["f/4", 65], t: ["a/3", 57], b: ["d/3", 50] },
  { s: ["d/5", 74], a: ["f/4", 65], t: ["b/3", 59], b: ["g/2", 43] },
  { s: ["c/5", 72], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
];
const II7_MARKS = ["I", "I6", "II7", "V7", "I"];

/* ---------------- IV7 and the parallel trap ---------------- */

const IV7_MOVE: Satb[] = [
  { s: ["g/4", 67], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
  { s: ["a/4", 69], a: ["e/4", 64], t: ["c/4", 60], b: ["f/3", 53] },
  { s: ["g/4", 67], a: ["d/4", 62], t: ["b/3", 59], b: ["g/3", 55] },
  { s: ["g/4", 67], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
];
const IV7_MARKS = ["I", "IV7", "V", "I"];

/* ---------------- in minor: the half-diminished color ---------------- */

const MINOR_II65: Satb[] = [
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
  { s: ["a/4", 69], a: ["b/3", 59], t: ["f/3", 53], b: ["d/3", 50] },
  { s: ["g#/4", 68], a: ["b/3", 59], t: ["e/3", 52], b: ["e/3", 52] },
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
];
const MINOR_MARKS = ["i", "II65", "V", "i"];

/* ---------------- drills ---------------- */

const PREP_POOL: Question[] = [
  {
    prompt: <>מהי \"ספטימה מוכנה\"?</>,
    options: [
      "הצליל כבר נשמע באותו קול באקורד הקודם, ופשוט נשאר",
      "ספטימה שמנוגנת חזק",
      "ספטימה שמגיעה בקפיצה מלמטה",
      "ספטימה כתובה מראש בתווים",
    ],
    answer: "הצליל כבר נשמע באותו קול באקורד הקודם, ופשוט נשאר",
    explain: <>ירושה ישירה מהשהיית המין הרביעי: הדיסוננס נכנס כצליל מוחזק — לא כזעזוע.</>,
  },
  {
    prompt: <>הספטימה של II7 היא דו — הטוניקה. לאן היא נפתרת?</>,
    options: ["יורדת בצעד אל סי — הצליל המוביל", "עולה אל רה", "נשארת לתמיד", "קופצת אל סול"],
    answer: "יורדת בצעד אל סי — הצליל המוביל",
    explain: <>דין הספטימה אחד: צעד מטה. וכאן הצעד נוחת היישר על הרגיש שבצלילי V.</>,
  },
  {
    prompt: <>איזו דרגה יושבת בבס של <Rn n="II65" />?</>,
    options: ["4 — כמו IV וכמו II6", "2", "6", "1"],
    answer: "4 — כמו IV וכמו II6",
    explain: <>שוב פה בבס, שצועד אל סול: כל משפחת ההכנה חולקת את אותה כניסה אל הדומיננטה.</>,
  },
];

function prepQuestion(): Question {
  return pick(PREP_POOL);
}

const CRAFT_POOL: Question[] = [
  {
    prompt: <>מה האיום המרכזי במעבר IV7 ← V?</>,
    options: [
      "קווינטות מקבילות בין הקולות שמחזיקים את לה ואת מי",
      "הכפלת הצליל המוביל",
      "ספטימה שעולה",
      "אין שום איום",
    ],
    answer: "קווינטות מקבילות בין הקולות שמחזיקים את לה ואת מי",
    explain: <>לה–מי היא קווינטה; אם שניהם יורדים יחד צעד — סול–רה — נולדו מקבילות. מחלצים בתנועה נגדית, או בפריסה שהופכת את הזוג לקוורטה.</>,
  },
  {
    prompt: <>מדוע דווקא <Rn n="II65" /> אהוב כל כך בקדנצות?</>,
    options: [
      "בס של IV, צליל של II, ועוד ספטימה מוכנה שנפתרת אל הצליל המוביל",
      "כי הוא האקורד החזק ביותר",
      "כי אין בו דיסוננס",
      "כי הבס שלו הוא הטוניקה",
    ],
    answer: "בס של IV, צליל של II, ועוד ספטימה מוכנה שנפתרת אל הצליל המוביל",
    explain: <>כל היתרונות של II6 מיחידה 10 — ומעליהם דיסוננס מבוית שמוסיף דחיפות בלי סיכון.</>,
  },
  {
    prompt: <>‏II7 ← V7 ← I: מה מניע את השרשרת הזו?</>,
    options: [
      "יסודות שנופלים בקווינטות: רה ← סול ← דו",
      "בס שעולה בסקונדות",
      "צלילים משותפים בלבד",
      "המקצב",
    ],
    answer: "יסודות שנופלים בקווינטות: רה ← סול ← דו",
    explain: <>מנוע הקווינטה היורדת מיחידה 10 — עכשיו כשכל חוליה נושאת ספטימה, וכל ספטימה מוכנה בקודמתה.</>,
  },
];

function craftQuestion(): Question {
  return pick(CRAFT_POOL);
}

const MINOR_POOL: Question[] = [
  {
    prompt: <>מה איכותו של ספטאקורד הסופרטוניקה במינור?</>,
    options: ["חצי־מוקטן: משולש מוקטן + ספטימה קטנה", "מז'ורי עם ספטימה גדולה", "מינורי רגיל", "מוגדל"],
    answer: "חצי־מוקטן: משולש מוקטן + ספטימה קטנה",
    explain: <>סי–רה–פה–לה בלה מינור: הצבע הרך־כאוב שהרומנטיקנים אהבו עד כלות.</>,
  },
  {
    prompt: <>גם במינור נעדיף את הסופרטוניקה בהיפוך ראשון. למה?</>,
    options: [
      "המשולש שבבסיסו מוקטן — וכמו II6 ו־VII6, ההיפוך מסתיר את הקווינטה המוקטנת",
      "כי כך קל יותר לנגן",
      "בגלל סימן ההיתק",
      "אין העדפה כזו",
    ],
    answer: "המשולש שבבסיסו מוקטן — וכמו II6 ו־VII6, ההיפוך מסתיר את הקווינטה המוקטנת",
    explain: <>אותו עיקרון בפעם השלישית: דיסוננס מבני עובר לקולות העליונים, והבס מקבל צליל יציב.</>,
  },
];

function minorQuestion(): Question {
  return pick(MINOR_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit13() {
  const cmpPlayer = usePlayer();
  const ii65Player = usePlayer();
  const chainPlayer = usePlayer();
  const iv7Player = usePlayer();
  const minorPlayer = usePlayer();

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 13 · חלק שני</div>
        <h1>ספטאקורדים של II ו־IV</h1>
        <p className="lede">
          מה שהספטימה עשתה לדומיננטה ביחידה 7, היא עושה עכשיו לאקורדי ההכנה: מוסיפה דחיפות, כאב קטן,
          סיבה להמשיך. אבל בניגוד ל־V7, שהדיסוננס שלו נולד חופשי — כאן הספטימה אוהבת להיכנס{" "}
          <em className="hl">מוכנה</em>: צליל שכבר היה שם, ורק מחליף משמעות. זו חתימת החלק השני.
        </p>
      </header>

      <Section id="grow" num="13.1" title="אקורדי ההכנה מגדלים ספטימה">
        <p>
          שני המועמדים: <b>II7</b> — רה, פה, לה ועכשיו גם דו — ו<b>IV7</b> — פה, לה, דו ומי. שימו לב
          מה הן הספטימות: של II7 זו <Deg n="1" kind="stable" />, ושל IV7 זו <Deg n="3" kind="stable" /> —
          שתיהן צלילי טוניקה! לכן קל כל כך להכין אותן: הן פשוט נשארות מהאקורד הקודם. ואת II7, כמו את
          II, נפגוש הכי הרבה בהיפוך הראשון — <Rn n="II65" />, עם פה בבס:
        </p>
        <Widget
          title="‏II7, ‏II65 ו־IV7 — לחצו והשוו"
          foot={
            <PlayButton
              label="נגנו את השלושה"
              events={SEVENTH_CHORDS.map((n, i) => ({ midi: n.midi, time: i * 1.2, dur: 1.25, idx: i }))}
              bpm={80}
              player={cmpPlayer}
            />
          }
        >
          <Score notes={SEVENTH_CHORDS} width={330} highlightIndex={cmpPlayer.index} ariaLabel="ספטאקורדים של הסופרטוניקה והסובדומיננטה" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          שלושת חוקי הספטימה, לכל ספטאקורד שהוא: נכנסת מוכנה (או בצעד), יורדת בצעד, ולעולם אינה
          מוכפלת. מי שמפנים אותם פעם אחת — פותר נכון כל דיסוננס אקורדי שיפגוש, מכאן ועד וגנר.
        </Callout>
      </Section>

      <Section id="ii65" num="13.2" title="‏II65 — סוס העבודה של הקדנצות">
        <p>
          קחו את II6 האהוב מיחידה 10 והוסיפו לו את דו: קיבלתם <Rn n="II65" /> — בס של סובדומיננטה,
          גוף של סופרטוניקה, ועכשיו גם דיסוננס מבוית. עקבו אחרי הסופרן: דו נמשך מהטוניקה (הכנה),
          נעשה ספטימה מעל רה (מתח), ויורד אל סי של V (פתרון) — הכנה־מתח־פתרון בקול אחד:
        </p>
        <Widget
          title="‏I–II65–V–I: הסופרן מחזיק דו — ואז נכנע אל סי"
          foot={<PlayButton label="נגנו את הקדנצה" events={chordSeq(II65_MOVE, 1.5)} bpm={66} player={ii65Player} />}
        >
          <SatbScores chords={II65_MOVE} marks={II65_MARKS} highlight={ii65Player.index} width={340} label="קדנצה עם II65" />
        </Widget>
      </Section>

      <Section id="ii7" num="13.3" title="‏II7 במצב יסודי: שרשרת הקווינטות">
        <p>
          במצב יסודי, II7 חושף את המנוע במלוא הדרו: היסודות נופלים בקווינטות — רה אל סול, סול אל דו —
          וכל ספטימה בשרשרת מוכנה על ידי האקורד שלפניה. האלט מחזיק את דו עד שהיא הופכת ספטימה של II7;
          הטנור לוקח את פה כספטימה של V7; והכול נפתר צעד־צעד:
        </p>
        <Widget
          title="‏I–I6–II7–V7–I: שתי ספטימות, שתיהן מוכנות, שתיהן נפתרות"
          foot={<PlayButton label="נגנו את השרשרת" events={chordSeq(II7_CHAIN, 1.5)} bpm={66} player={chainPlayer} />}
        >
          <SatbScores chords={II7_CHAIN} marks={II7_MARKS} highlight={chainPlayer.index} width={400} label="שרשרת קווינטות עם ספטימות מוכנות" />
        </Widget>
      </Section>

      <Section id="iv7" num="13.4" title="‏IV7 — והמלכודת המפורסמת">
        <p>
          ‏IV7 מתוק במיוחד — הספטימה שלו היא מי, המדיאנטה — אבל הוא מגיע ממולכד: בתוכו אורבות שתי
          קווינטות, פה–דו ולה–מי, וב־V ממתינה סול–רה. גרירה עצלה של הקולות תוליד מקבילות. שני
          החילוצים בדוגמה: הקול שמחזיק את דו יורד אל סי — <em className="hl">נגד</em> הבס העולה —
          ואת לה–מי הופכים בפריסה לקוורטה (לה מעל מי), שהרי קוורטות מקבילות בין קולות עליונים מותרות:
        </p>
        <Widget
          title="‏I–IV7–V–I: הטנור נסוג אל סי, והסופרן והאלט יורדים בקוורטות"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(IV7_MOVE, 1.5)} bpm={66} player={iv7Player} />}
        >
          <SatbScores chords={IV7_MOVE} marks={IV7_MARKS} highlight={iv7Player.index} width={340} label="מהלך I–IV7–V–I" />
        </Widget>
      </Section>

      <Section id="minor" num="13.5" title="ובמינור? הצליל החצי־מוקטן">
        <p>
          במינור, ספטאקורד הסופרטוניקה נעשה{" "}
          <Term he="חצי־מוקטן" en="Half-diminished" def="משולש מוקטן שמעליו ספטימה קטנה — מסומן ø. במינור: ספטאקורד הדרגה השנייה." /> —
          משולש מוקטן עם ספטימה קטנה מעליו: סי, רה, פה, לה. הצבע הזה, רך וכאוב בעת ובעונה אחת, יהפוך
          לחותם של הרומנטיקה. וכמו תמיד אצל המוקטנים, ההיפוך הראשון הוא ביתו — <FigText text="‏II65" /> עם
          רה בבס:
        </p>
        <Widget
          title="‏i–II65–V–i בלה מינור — הקשיבו לצבע החצי־מוקטן"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(MINOR_II65, 1.5)} bpm={66} player={minorPlayer} />}
        >
          <SatbScores
            chords={MINOR_II65}
            marks={MINOR_MARKS}
            highlight={minorPlayer.index}
            width={340}
            label="קדנצה חצי־מוקטנת בלה מינור"
            accidentalKey="Am"
          />
        </Widget>
      </Section>

      <Section id="review" num="13.6" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>חוקי הספטימה</b>נכנסת מוכנה (או בצעד), יורדת בצעד, לא מוכפלת.</div>
          <div className="review-chip"><b>ספטימות של טוניקה</b>של II7 — דו; של IV7 — מי. לכן קל להכין אותן.</div>
          <div className="review-chip"><b>II65</b>בס של IV, צליל של II, ספטימה מוכנה שיורדת אל הצליל המוביל.</div>
          <div className="review-chip"><b>II7 יסודי</b>שרשרת קווינטות: רה ← סול ← דו, ספטימה מוכנה בכל חוליה.</div>
          <div className="review-chip"><b>IV7</b>מוקש לה–מי מול סול–רה: הקול עם לה עולה נגד הספטימה.</div>
          <div className="review-chip"><b>במינור</b>הסופרטוניקה חצי־מוקטנת (ø) — וביתה בהיפוך הראשון.</div>
          <div className="review-chip"><b>העיקרון החוזר</b>משולש מוקטן בבסיס? היפוך ראשון: II6, ‏VII6, ‏II65.</div>
          <div className="review-chip"><b>חתימת החלק</b>‏T–S–D–T על כל גווניו — התחביר הטונאלי שלם.</div>
        </div>
      </Section>

      <Section id="drills" num="13.7" title="תרגול — עד שזה אוטומטי">
        <Drill title="דין הספטימה" generate={prepQuestion} />
        <Drill title="מלאכת החיבור" generate={craftQuestion} />
        <Drill title="הצבע החצי־מוקטן" generate={minorQuestion} />
      </Section>

      <NextUnit current={13}>
        <b>סוף החלק השני — ותחילת השלישי.</b> מ־I–V–I החשוף של יחידה 7 ועד קדנצות עם ספטימות מוכנות,
        התחביר הטונאלי הבסיסי בידיכם. מכאן משנים שאלה: לא עוד "מה בא אחרי מה" אלא "איך דברים נעים" —
        טכניקות 5/3, ‏6/3 ו־6/4.
      </NextUnit>
    </div>
  );
}
