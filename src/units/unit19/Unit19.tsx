import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Fig, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";
import { SeqEvent } from "../../engine/audio";

/* ---------------- rhythm-aware playback: melody over a chord track ---------------- */

const DUR: Record<string, number> = { w: 4, h: 2, q: 1, "8": 0.5 };

type ChordHit = { midi: number[]; time: number; dur: number };

function melSeq(notes: ScoreNote[], chords: ChordHit[]): SeqEvent[] {
  const evs: SeqEvent[] = chords.map((c) => ({ midi: [...c.midi], time: c.time, dur: c.dur, vel: 0.38 }));
  let t = 0;
  notes.forEach((n, i) => {
    if (n.bar) return;
    const d = DUR[n.duration ?? "w"] * (n.dots ? 1.5 : 1);
    evs.push({ midi: [...n.midi], time: t, dur: d * 1.02, idx: i });
    t += d;
  });
  return evs;
}

/* ---------------- the anatomy: preparation, suspension, resolution ---------------- */

const ANATOMY: ScoreNote[] = [
  { keys: ["c/5"], midi: [72], duration: "h", sub: "הכנה", tie: true },
  { keys: ["c/5"], midi: [72], duration: "h", sub: "השהיה", fig: "4", kind: "active" },
  { keys: ["b/4"], midi: [71], duration: "h", sub: "פתרון", fig: "3" },
  { keys: ["c/5"], midi: [72], duration: "h", sub: "הבית" },
];
const ANATOMY_CHORDS: ChordHit[] = [
  { midi: [48, 55, 64], time: 0, dur: 2 },
  { midi: [43, 55, 62], time: 2, dur: 4 },
  { midi: [48, 55, 64], time: 6, dur: 2 },
];

/* ---------------- the catalogue: 4-3, 7-6, 9-8 over a C bass ---------------- */

const CATALOGUE: ScoreNote[] = [
  { keys: ["c/3", "f/3"], midi: [48, 53], duration: "h", fig: "4", kind: "active", sub: "4–3" },
  { keys: ["c/3", "e/3"], midi: [48, 52], duration: "h", fig: "3" },
  { bar: true, keys: [], midi: [] },
  { keys: ["c/3", "b/3"], midi: [48, 59], duration: "h", fig: "7", kind: "active", sub: "7–6" },
  { keys: ["c/3", "a/3"], midi: [48, 57], duration: "h", fig: "6" },
  { bar: true, keys: [], midi: [] },
  { keys: ["c/3", "d/4"], midi: [48, 62], duration: "h", fig: "9", kind: "active", sub: "9–8" },
  { keys: ["c/3", "c/4"], midi: [48, 60], duration: "h", fig: "8" },
];

/* ---------------- anticipation: arriving before the harmony ---------------- */

const ANTICIPATION: ScoreNote[] = [
  { keys: ["d/5"], midi: [74], duration: "q", sub: "על V" },
  { keys: ["c/5"], midi: [72], duration: "q", mark: "ANT", kind: "active", sub: "מקדים!" },
  { bar: true, keys: [], midi: [] },
  { keys: ["c/5"], midi: [72], duration: "h", sub: "הבית הגיע" },
];
const ANT_CHORDS: ChordHit[] = [
  { midi: [43, 55, 59, 62], time: 0, dur: 2 },
  { midi: [48, 55, 64], time: 2, dur: 2 },
];

/* ---------------- pedal point: the bass refuses to move ----------------
   every adjacent pair was checked by hand; the pedal licenses the clash */

const PEDAL: Satb[] = [
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
  { s: ["c/5", 72], a: ["f/4", 65], t: ["a/3", 57], b: ["c/3", 48] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["c/3", 48] },
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
];
const PEDAL_MARKS = ["I", "IV64", "V", "I"];

/* ---------------- in minor: the 4-3 sigh onto the leading tone ---------------- */

const MINOR_SIGH: ScoreNote[] = [
  { keys: ["e/3", "a/3"], midi: [52, 57], duration: "h", fig: "4", kind: "active", sub: "השהיה" },
  { keys: ["e/3", "g#/3"], midi: [52, 56], duration: "h", fig: "3", sub: "פתרון: סול♯" },
  { bar: true, keys: [], midi: [] },
  { keys: ["a/2", "a/3"], midi: [45, 57], duration: "w", sub: "הבית" },
];

/* ---------------- drills ---------------- */

const ANATOMY_POOL: Question[] = [
  {
    prompt: <>מהם שלושת שלבי ההשהיה, לפי הסדר?</>,
    options: [
      "הכנה (קונסוננס, פעמה קלה) ← השהיה (דיסוננס, פעמה חזקה) ← פתרון (צעד מטה)",
      "פתרון ← השהיה ← הכנה",
      "קפיצה ← צעד ← קפיצה",
      "אין שלבים",
    ],
    answer: "הכנה (קונסוננס, פעמה קלה) ← השהיה (דיסוננס, פעמה חזקה) ← פתרון (צעד מטה)",
    explain: <>בדיוק כמו במין הרביעי של יחידה 5 — רק שעכשיו ההרמוניה מתחלפת מתחת לצליל המוחזק.</>,
  },
  {
    prompt: <>לאן נפתרת השהיה?</>,
    options: ["צעד אחד מטה — כמעט תמיד", "צעד מעלה — תמיד", "קפיצה חופשית", "היא לא נפתרת"],
    answer: "צעד אחד מטה — כמעט תמיד",
    explain: <>המתח שנוצר מהעיכוב משתחרר בירידה הקטנה ביותר האפשרית. (היוצא מן הכלל המפורסם: 7–8 העולה — נדיר ומיוחד.)</>,
  },
  {
    prompt: <>מה חובה שיתקיים בצליל ההכנה?</>,
    options: [
      "אותו גובה בדיוק, קונסוננטי באקורד שלו",
      "צליל גבוה יותר",
      "דיסוננס חזק",
      "שתיקה",
    ],
    answer: "אותו גובה בדיוק, קונסוננטי באקורד שלו",
    explain: <>ההשהיה איננה כניסה של דיסוננס — היא הישארות של קונסוננס שהעולם התחלף סביבו.</>,
  },
];

function anatomyQuestion(): Question {
  return pick(ANATOMY_POOL);
}

const FIGURE_POOL = [
  { desc: "קוורטה מעל הבס שנמסה אל טרצה", fig: "4–3", why: "הנפוצה שבהשהיות — פגשנו אותה גם בלב הקוורט־סקסט הקדנציאלי." },
  { desc: "ספטימה מעל הבס שיורדת אל סקסטה", fig: "7–6", why: "החביבה על שרשראות: 7–6 אחרי 7–6 לאורך בס יורד — מנוע ברוקי אהוב." },
  { desc: "נונה מעל הבס שנופלת אל אוקטבה", fig: "9–8", why: "ההשהיה מתפוגגת אל תוך הכפלת הבס — רכה מכולן." },
  { desc: "הבס עצמו מושהה, ונפתר מטה כשמעליו טרצה", fig: "2–3", why: "השהיית הבס: הדיסוננס מתחת, והספרות 2–3 מספרות את הסיפור מלמעלה." },
] as const;

function figureQuestion(): Question {
  const q = pick(FIGURE_POOL);
  return {
    prompt: <>{q.desc} — איזו השהיה זו?</>,
    options: shuffle(FIGURE_POOL.map((f) => f.fig)),
    answer: q.fig,
    explain: <>{q.why}</>,
  };
}

const TIME_POOL: Question[] = [
  {
    prompt: <>מה ההבדל בין השהיה לאנטיציפציה?</>,
    options: [
      "ההשהיה מאחרת — צליל ישן נשאר; האנטיציפציה מקדימה — צליל חדש מגיע מוקדם",
      "אין הבדל",
      "האנטיציפציה חזקה יותר תמיד",
      "ההשהיה עולה והאנטיציפציה יורדת",
    ],
    answer: "ההשהיה מאחרת — צליל ישן נשאר; האנטיציפציה מקדימה — צליל חדש מגיע מוקדם",
    explain: <>שתי דרכים להזיז צליל בזמן: איחור מוטעם (חזק) מול הקדמה קלה (חלש). מראה מושלמת.</>,
  },
  {
    prompt: <>מהי נקודת פדל?</>,
    options: [
      "צליל בס מוחזק — לרוב טוניקה או דומיננטה — בעוד ההרמוניות מתחלפות מעליו",
      "דוושת הפסנתר",
      "אקורד שחוזר שוב ושוב",
      "סוג של קדנצה",
    ],
    answer: "צליל בס מוחזק — לרוב טוניקה או דומיננטה — בעוד ההרמוניות מתחלפות מעליו",
    explain: <>העוגן העמוק ביותר: אפילו אקורדים דיסוננטיים כלפי הפדל נסבלים, כי האוזן יודעת שהוא אינו זז.</>,
  },
  {
    prompt: <>מדוע V שלם יכול להישמע מעל פדל טוניקה — בלי \"לשבור את הכללים\"?</>,
    options: [
      "הפדל הוא רובד נפרד: הדיסוננס נמדד מול ההרמוניה שמעליו, והבס המוחזק מורשה להתנגש",
      "כי V תמיד מותר",
      "זה אסור בעצם",
      "כי הבס בכלל לא נשמע",
    ],
    answer: "הפדל הוא רובד נפרד: הדיסוננס נמדד מול ההרמוניה שמעליו, והבס המוחזק מורשה להתנגש",
    explain: <>עוד רישיון מבוסס־תבנית, כמו בסקוונצה: האוזן מזהה את ההיגיון — בס עוגן והרמוניה נודדת — וסולחת לחיכוך.</>,
  },
];

function timeQuestion(): Question {
  return pick(TIME_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit19() {
  const anatPlayer = usePlayer();
  const catPlayer = usePlayer();
  const antPlayer = usePlayer();
  const pedalPlayer = usePlayer();
  const sighPlayer = usePlayer();

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 19 · חלק רביעי</div>
        <h1>פיגורציה ריתמית</h1>
        <p className="lede">
          ביחידה 18 הזזנו צלילים במרחב — מעלה ומטה בין צלילי האקורד. עכשיו נזיז אותם{" "}
          <em className="hl">בזמן</em>: צליל שמסרב לעזוב כשההרמוניה מתחלפת, צליל שמגיע לפני זמנו,
          ובס שמסרב לזוז בכלל. שלושתם יוצרים דיסוננס — ושלושתם חוקיים לגמרי, כי הזמן עצמו הוא
          שמצדיק אותם.
        </p>
      </header>

      <Section id="anatomy" num="19.1" title="ההשהיה — הדיסוננס שנולד מנאמנות">
        <p>
          את ה
          <Term he="השהיה" en="Suspension" def="צליל שנשאר מהאקורד הקודם אל תוך אקורד חדש שבו הוא דיסוננטי, ואז נפתר בצעד יורד. שלושה שלבים: הכנה, השהיה, פתרון." /> פגשנו
          במין הרביעי של יחידה 5 — עכשיו היא פועלת בתוך מרקם הרמוני מלא. שימו לב לסופרן: דו מוכן
          כצליל אקורד של I, נשאר קשור כשההרמוניה מתחלפת ל־V — ולפתע הוא קוורטה דיסוננטית מעל הבס —
          ואז נכנע וצועד אל סי. שלושה שלבים, תמיד באותו סדר:
        </p>
        <Widget
          title="הכנה — השהיה — פתרון: עקבו אחרי דו אחת שמסרבת לעזוב"
          foot={<PlayButton label="נגנו את ההשהיה" events={melSeq(ANATOMY, ANATOMY_CHORDS)} bpm={69} player={anatPlayer} />}
        >
          <Score notes={ANATOMY} width={340} highlightIndex={anatPlayer.index} ariaLabel="שלבי ההשהיה: הכנה, השהיה, פתרון" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          ההשהיה איננה כניסה של דיסוננס אלא <em className="hl">הישארות</em> של קונסוננס: הצליל לא
          זז — העולם התחלף סביבו. לכן היא הנוגעת ללב שבדיסוננסים: נאמנות לצליל הקודם, רגע אחד
          ארוך מדי.
        </Callout>
      </Section>

      <Section id="catalogue" num="19.2" title="הקטלוג: ‏4–3, ‏7–6, ‏9–8">
        <p>
          להשהיות קוראים על שם המרווחים שהן יוצרות מעל הבס — הדיסוננס ואז פתרונו. שלוש הגדולות:{" "}
          <Fig n="4" />–<Fig n="3" /> (זו מהקוורט־סקסט הקדנציאלי), <Fig n="7" />–<Fig n="6" />{" "}
          (מלכת השרשראות — 7–6 רודפת 7–6 מעל בס יורד), ו־<Fig n="9" />–<Fig n="8" /> (שנמסה אל
          הכפלת הבס). קיימת גם השהיית בס, 2–3 — שם הבס עצמו מתעכב. הנה השלוש בשני קולות חשופים:
        </p>
        <Widget
          title="שלוש ההשהיות הגדולות מעל בס דו — מתח, ופתרון צעד מטה"
          foot={
            <PlayButton
              label="נגנו את השלוש"
              events={melSeq(CATALOGUE, [])}
              bpm={66}
              player={catPlayer}
            />
          }
        >
          <Score notes={CATALOGUE} clef="bass" width={400} highlightIndex={catPlayer.index} ariaLabel="השהיות 4-3, 7-6, 9-8" />
        </Widget>
      </Section>

      <Section id="anticipation" num="19.3" title="אנטיציפציה — המראָה של ההשהיה">
        <p>
          <Term he="אנטיציפציה" en="Anticipation" def="צליל מהאקורד הבא שמגיע מוקדם, על חלק קל של הפעמה, בעודו דיסוננטי כלפי האקורד הנוכחי." /> היא
          ההיפוך המדויק: אם ההשהיה היא צליל ישן שמאחר לעזוב, האנטיציפציה היא צליל חדש שמקדים
          להגיע. הסופרן קופץ אל דו של הטוניקה כשה־V עוד מצלצל — רגע קטן וחסר סבלנות, על החלק הקל
          של הפעמה, שמוכר מכל קדנצה ברוקית:
        </p>
        <Widget
          title="דו מגיעה לפני האקורד שלה — הקשיבו לחוסר הסבלנות"
          foot={<PlayButton label="נגנו את הקדנצה" events={melSeq(ANTICIPATION, ANT_CHORDS)} bpm={63} player={antPlayer} />}
        >
          <Score notes={ANTICIPATION} width={300} highlightIndex={antPlayer.index} ariaLabel="אנטיציפציה בקדנצה" />
        </Widget>
      </Section>

      <Section id="pedal" num="19.4" title="נקודת הפדל — הבס שמסרב לזוז">
        <p>
          הקישוט הריתמי השלישי הפוך משניהם: לא צליל אחד שזז בזמן, אלא צליל אחד ש<em className="hl">אינו
          זז בכלל</em>. <Term he="נקודת פדל" en="Pedal point" def="צליל בס מוחזק — כמעט תמיד טוניקה או דומיננטה — שמעליו ההרמוניות ממשיכות להתחלף, גם כשהן מתנגשות בו." /> —
          בס טוניקה או דומיננטה מוחזק, שמעליו ההרמוניה ממשיכה בחייה. שימו לב ל־V השלם שמצלצל מעל
          דו המוחזקת: התנגשות גמורה — ומותרת, כי הפדל הוא רובד נפרד שהאוזן מזהה כעוגן:
        </p>
        <Widget
          title="‏I–IV64–V–I מעל פדל טוניקה — הבס מחזיק גם כשה־V מתנגש בו"
          foot={<PlayButton label="נגנו את הפדל" events={chordSeq(PEDAL, 1.5)} bpm={66} player={pedalPlayer} />}
        >
          <SatbScores chords={PEDAL} marks={PEDAL_MARKS} highlight={pedalPlayer.index} width={340} label="נקודת פדל על הטוניקה" />
        </Widget>
        <Callout label="דקות חשובה">
          פדל חי כמעט תמיד על אחת משתיים: <b>טוניקה</b> (יציבות שמערסלת הכול — סיומי יצירות) או{" "}
          <b>דומיננטה</b> (מתח ארוך שמכין שיבה גדולה — רגע לפני רפריזות). זהו הרישיון השלישי
          מבוסס־התבנית שפגשנו, אחרי הסקוונצה והשרשרת: האוזן סולחת לחיכוך כשההיגיון גלוי.
        </Callout>
      </Section>

      <Section id="minor" num="19.5" title="ובמינור? האנחה אל סול♯">
        <p>
          ההשהיה האהובה של המינור: <Fig n="4" />–<Fig n="3" /> מעל הדומיננטה, שבה לה מתעכבת ונמסה
          אל סול♯ — הצליל המוביל. הדיסוננס נפתר היישר אל הצליל הרגיש בסולם, רגע לפני שהכול חוזר
          הביתה. הברוק בנה על התבנית הזו אלפי סיומים איטיים:
        </p>
        <Widget
          title="‏4–3 מעל מי — לה נאנחת אל סול♯, והבית מגיע"
          foot={
            <PlayButton
              label="נגנו את האנחה"
              events={melSeq(MINOR_SIGH, [])}
              bpm={60}
              player={sighPlayer}
            />
          }
        >
          <Score notes={MINOR_SIGH} clef="bass" width={320} accidentalKey="Am" highlightIndex={sighPlayer.index} ariaLabel="השהיית 4-3 במינור" />
        </Widget>
      </Section>

      <Section id="review" num="19.6" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>השהיה</b>הכנה (קל) ← דיסוננס מוחזק (חזק) ← פתרון צעד מטה.</div>
          <div className="review-chip"><b>המהות</b>לא כניסה של דיסוננס — הישארות של קונסוננס בעולם שהתחלף.</div>
          <div className="review-chip"><b>הקטלוג</b>‏4–3, ‏7–6 (מלכת השרשראות), ‏9–8; והשהיית הבס 2–3.</div>
          <div className="review-chip"><b>אנטיציפציה</b>צליל חדש שמקדים — על החלק הקל, המראָה של ההשהיה.</div>
          <div className="review-chip"><b>פדל</b>בס מוחזק — טוניקה או דומיננטה — וההרמוניה נודדת מעליו.</div>
          <div className="review-chip"><b>הרישיון</b>הפדל רובד נפרד: התנגשות מותרת כשהעוגן גלוי לאוזן.</div>
          <div className="review-chip"><b>במינור</b>‏4–3 מעל V: לה נמסה אל סול♯ — האנחה אל הצליל המוביל.</div>
          <div className="review-chip"><b>התמונה</b>מרחב (יחידה 18) + זמן (יחידה 19) = כל קישוט שקיים.</div>
        </div>
      </Section>

      <Section id="drills" num="19.7" title="תרגול — עד שזה אוטומטי">
        <Drill title="אנטומיית ההשהיה" generate={anatomyQuestion} />
        <Drill title="קריאת הספרות" generate={figureQuestion} />
        <Drill title="זמן ופדל" generate={timeQuestion} />
      </Section>

      <NextUnit current={19}>
        <b>סוף החלק הרביעי.</b> תשע־עשרה יחידות: מסולם ועד מרקם חי — שלד הרמוני, תחביר, טכניקות
        תנועה, וקישוט במרחב ובזמן. הדיאטוניקה בידיכם במלואה. הצעד הבא של הספר חוצה את הגבול:
        כרומטיקה — צלילים מחוץ לסולם, דומיננטות משניות ומודולציה. שם נמשיך.
      </NextUnit>
    </div>
  );
}
