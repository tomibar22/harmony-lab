import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Fig, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";

/* ---------------- the reusable four-voice chords ----------------
   every adjacent pair in every progression below was checked by hand;
   the sequences use a two-chord pattern, so the checks repeat with it */

/* falling fifths: I-IV-VII-III-VI-II-V-I, soprano descending in pairs */
const FIFTHS: Satb[] = [
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
  { s: ["c/5", 72], a: ["f/4", 65], t: ["a/3", 57], b: ["f/3", 53] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["f/3", 53], b: ["b/2", 47] },
  { s: ["b/4", 71], a: ["e/4", 64], t: ["g/3", 55], b: ["e/3", 52] },
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
  { s: ["a/4", 69], a: ["d/4", 62], t: ["f/3", 53], b: ["d/3", 50] },
  { s: ["g/4", 67], a: ["b/3", 59], t: ["d/3", 50], b: ["g/2", 43] },
  { s: ["g/4", 67], a: ["c/4", 60], t: ["e/3", 52], b: ["c/3", 48] },
];
const FIFTHS_MARKS = ["I", "IV", "VII", "III", "VI", "II", "V", "I"];

/* the 5-6 interval skeletons, as two voices over the bass */
const ASC_SKEL: ScoreNote[] = [
  { keys: ["c/3", "g/3"], midi: [48, 55], fig: "5" },
  { keys: ["c/3", "a/3"], midi: [48, 57], fig: "6" },
  { keys: ["d/3", "a/3"], midi: [50, 57], fig: "5" },
  { keys: ["d/3", "b/3"], midi: [50, 59], fig: "6" },
  { keys: ["e/3", "b/3"], midi: [52, 59], fig: "5" },
  { keys: ["e/3", "c/4"], midi: [52, 60], fig: "6" },
];
const DESC_SKEL: ScoreNote[] = [
  { keys: ["c/3", "g/3"], midi: [48, 55], fig: "5" },
  { keys: ["b/2", "g/3"], midi: [47, 55], fig: "6" },
  { keys: ["a/2", "e/3"], midi: [45, 52], fig: "5" },
  { keys: ["g/2", "e/3"], midi: [43, 52], fig: "6" },
  { keys: ["f/2", "c/3"], midi: [41, 48], fig: "5" },
  { keys: ["e/2", "c/3"], midi: [40, 48], fig: "6" },
];

/* the ascending 5-6 sequence in four voices, closing with a cadence */
const ASCENT: Satb[] = [
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
  { s: ["c/5", 72], a: ["e/4", 64], t: ["a/3", 57], b: ["c/3", 48] },
  { s: ["a/4", 69], a: ["d/4", 62], t: ["f/3", 53], b: ["d/3", 50] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["f/3", 53], b: ["d/3", 50] },
  { s: ["b/4", 71], a: ["b/3", 59], t: ["g/3", 55], b: ["e/3", 52] },
  { s: ["a/4", 69], a: ["d/4", 62], t: ["a/3", 57], b: ["f/3", 53] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/3", 55] },
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
];
const ASCENT_MARKS = ["I", "VI6", "II", "VII6", "III", "II6", "V", "I"];

/* the circle in minor: natural forms inside, the raise only at V */
const MINOR_FIFTHS: Satb[] = [
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
  { s: ["a/4", 69], a: ["d/4", 62], t: ["f/3", 53], b: ["d/3", 50] },
  { s: ["g/4", 67], a: ["b/3", 59], t: ["d/3", 50], b: ["g/2", 43] },
  { s: ["g/4", 67], a: ["c/4", 60], t: ["e/3", 52], b: ["c/3", 48] },
  { s: ["f/4", 65], a: ["a/3", 57], t: ["c/3", 48], b: ["f/2", 41] },
  { s: ["f/4", 65], a: ["b/3", 59], t: ["d/3", 50], b: ["b/2", 47] },
  { s: ["e/4", 64], a: ["g#/3", 56], t: ["b/2", 47], b: ["e/2", 40] },
  { s: ["e/4", 64], a: ["a/3", 57], t: ["c/3", 48], b: ["a/2", 45] },
];
const MINOR_FIFTHS_MARKS = ["i", "IV", "VII", "III", "VI", "II", "V", "i"];

/* ---------------- drills ---------------- */

const CHAIN_POOL = [
  { after: "IV", next: "VII", why: "פה יורד קווינטה אל סי — התחנה המפתיעה של המעגל." },
  { after: "VII", next: "III", why: "סי אל מי: המעגל ממשיך לרדת בקווינטות." },
  { after: "III", next: "VI", why: "מי אל לה — בדיוק באמצע הדרך הביתה." },
  { after: "VI", next: "II", why: "לה אל רה: מכאן כבר מריחים את הקדנצה." },
  { after: "II", next: "V", why: "רה אל סול — והבית במרחק קווינטה אחת." },
] as const;

function chainQuestion(): Question {
  const q = pick(CHAIN_POOL);
  return {
    prompt: (
      <>
        במעגל הקווינטות היורדות, איזה אקורד בא אחרי <span dir="ltr">{q.after}</span>?
      </>
    ),
    options: shuffle(["VII", "III", "VI", "II", "V"]),
    answer: q.next,
    explain: <>{q.why}</>,
  };
}

const LICENSE_POOL: Question[] = [
  {
    prompt: <>מדוע VII מופיע במצב יסודי בתוך שרשרת הקווינטות — בניגוד לכלל מיחידה 8?</>,
    options: [
      "בתוך סקוונצה ההיגיון של התבנית גובר על דקדוק האקורד הבודד",
      "הכלל מיחידה 8 היה שגוי",
      "כי מכפילים את הצליל המוביל",
      "זה מותר רק במינור",
    ],
    answer: "בתוך סקוונצה ההיגיון של התבנית גובר על דקדוק האקורד הבודד",
    explain: <>האוזן עוקבת אחרי המודל החוזר, לא אחרי כל אקורד לגופו. הסקוונצה היא רישיון — בתחומה בלבד.</>,
  },
  {
    prompt: <>מהי סקוונצה הרמונית?</>,
    options: [
      "מודל של אקורדים שחוזר שוב ושוב בגובה אחר, לאורך הסולם",
      "כל רצף אקורדים שיורד",
      "חזרה על אותו אקורד",
      "סולם מנוגן באקורדים",
    ],
    answer: "מודל של אקורדים שחוזר שוב ושוב בגובה אחר, לאורך הסולם",
    explain: <>מודל + העתקים = סקוונצה. ברגע שהאוזן קלטה את המודל, היא יודעת לנבא את ההמשך — וזה הקסם.</>,
  },
  {
    prompt: <>בסקוונצה עולה בצעדים, מדוע משלבים אקורד 6/3 בין המצבים היסודיים?</>,
    options: [
      "ה־6 שובר את שרשרת הקווינטות המקבילות שהייתה נוצרת מעליות מקבילות",
      "כי זה נשמע עצוב יותר",
      "כדי להכפיל את הבס",
      "אין סיבה",
    ],
    answer: "ה־6 שובר את שרשרת הקווינטות המקבילות שהייתה נוצרת מעליות מקבילות",
    explain: <>‏5–6–5–6: בכל פעם שהקווינטה מאיימת להימשך במקביל, היא מתחלפת בסקסטה — קונסוננס שמותר לו לנוע במקביל.</>,
  },
  {
    prompt: <>איפה מותר לסקוונצה \"לעצור\"?</>,
    options: [
      "בכל חוליה — ובדרך כלל עוצרים כשמגיעים לאקורד שמוביל לקדנצה",
      "רק אחרי שהשלימה מעגל שלם",
      "רק על הטוניקה",
      "אסור לעצור",
    ],
    answer: "בכל חוליה — ובדרך כלל עוצרים כשמגיעים לאקורד שמוביל לקדנצה",
    explain: <>הסקוונצה היא מסלול, לא כלוב: יורדים ממנה בתחנה הנוחה — לרוב II או IV — וסוגרים בקדנצה רגילה.</>,
  },
];

function licenseQuestion(): Question {
  return pick(LICENSE_POOL);
}

const MINOR_POOL: Question[] = [
  {
    prompt: <>בשרשרת קווינטות במינור, אילו צורות של האקורדים משמשות בפנים?</>,
    options: [
      "הטבעיות — בלי הגבהות; ♯ מופיע רק ב־V שבסוף",
      "הכול עם צליל מוביל מוגבה",
      "רק אקורדים מז'וריים",
      "המלודיות בלבד",
    ],
    answer: "הטבעיות — בלי הגבהות; ♯ מופיע רק ב־V שבסוף",
    explain: <>בתוך התבנית אין פונקציה דומיננטית — ולכן אין מה להגביה. ההגבהה חוזרת ברגע שהמעגל נוגע בקדנצה.</>,
  },
  {
    prompt: <>מה מקבל המינור \"במתנה\" כשהמעגל עובר דרך III ו־VII הטבעיים?</>,
    options: [
      "צבע של הסולם המקביל המז'ורי באמצע המהלך",
      "שום דבר מיוחד",
      "דיסוננסים חדשים",
      "קדנצה נמנעת",
    ],
    answer: "צבע של הסולם המקביל המז'ורי באמצע המהלך",
    explain: <>‏VII הטבעי (סול–סי–רה) ו־III (דו–מי–סול) הם אקורדי המז'ור המקביל — לרגע, לה מינור נשמע כמו דו מז'ור.</>,
  },
];

function minorQuestion(): Question {
  return pick(MINOR_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit15() {
  const fifthsPlayer = usePlayer();
  const ascSkelPlayer = usePlayer();
  const descSkelPlayer = usePlayer();
  const ascentPlayer = usePlayer();
  const minorPlayer = usePlayer();

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 15 · חלק שלישי</div>
        <h1>סקוונצות דיאטוניות</h1>
        <p className="lede">
          קחו תנועת יסודות אחת מיחידה 14 — והפעילו אותה שוב ושוב, קומה אחרי קומה. קיבלתם{" "}
          <Term he="סקוונצה" en="Sequence" def="מודל הרמוני או מלודי החוזר בגבהים עוקבים לאורך הסולם. האוזן עוקבת אחרי התבנית — והיא שקובעת את החוקים." /> —
          המכונה המוזיקלית היפה של הבארוק, ומקור לכמה מהרגעים המרגשים ביותר אצל באך, ויוואלדי וקורלי.
          וכשהתבנית משתלטת, מתברר שגם החוקים משתנים.
        </p>
      </header>

      <Section id="fifths" num="15.1" title="המלכה: שרשרת הקווינטות היורדות">
        <p>
          התנועה החזקה של יחידה 14 — קווינטה יורדת — בשרשרת אחת מלאה:{" "}
          <span dir="ltr">I–IV–VII–III–VI–II–V–I</span>. הבס מסרג קווינטה מטה, קוורטה מעלה; הסופרן
          יורד בצעד כל שני אקורדים; ובכל מעבר צליל אחד משותף נשאר במקומו. שימו לב שהמעגל נוגע בכל
          שבעת האקורדים של הסולם — פעם אחת כל אחד — וחוזר הביתה:
        </p>
        <Widget
          title="מעגל הקווינטות המלא — הקשיבו לסופרן היורד מדרגה לדרגה"
          foot={<PlayButton label="נגנו את המעגל" events={chordSeq(FIFTHS, 1.35)} bpm={76} player={fifthsPlayer} />}
        >
          <SatbScores chords={FIFTHS} marks={FIFTHS_MARKS} highlight={fifthsPlayer.index} width={560} label="שרשרת קווינטות יורדות בדו מז'ור" />
        </Widget>
        <Callout label="הרישיון של הסקוונצה" insight>
          הבטנו בתדהמה: VII במצב יסודי, עם קווינטה מוקטנת גלויה מעל הבס — בדיוק מה שיחידה 8 אסרה!
          אבל בתוך סקוונצה האוזן שומעת את התבנית, לא את האקורד הבודד: המודל החוזר מכשיר את מה
          שבמשפט רגיל היה צורם. הרישיון תקף בתחומי הסקוונצה — ופג ברגע שהיא נגמרת.
        </Callout>
      </Section>

      <Section id="skeleton" num="15.2" title="הסוד ההנדסי: תבנית 5–6">
        <p>
          איך מעלים אקורדים בצעדים בלי לגרור שרשרת קווינטות מקבילות? התשובה בת מאות השנים: מחליפים.
          מעל כל צליל בס, הקווינטה מתחלפת בסקסטה לפני שהבס זז — <Fig n="5" /> הופך ל־<Fig n="6" /> —
          וכך אף קווינטה אינה נמשכת אל שכנתה. הנה השלד החשוף, שני קולות בלבד:
        </p>
        <Widget
          title="‏5–6 עולה: הקול העליון מטפס לפני הבס"
          foot={
            <PlayButton
              label="נגנו את השלד"
              events={ASC_SKEL.map((n, i) => ({ midi: [...n.midi], time: i * 1, dur: 1.05, idx: i }))}
              bpm={80}
              player={ascSkelPlayer}
            />
          }
        >
          <Score notes={ASC_SKEL} clef="bass" width={380} highlightIndex={ascSkelPlayer.index} ariaLabel="שלד 5-6 עולה" />
        </Widget>
        <Widget
          title="‏5–6 יורד: הבס גולש מתחת לקול עליון מחכה"
          foot={
            <PlayButton
              label="נגנו את השלד"
              events={DESC_SKEL.map((n, i) => ({ midi: [...n.midi], time: i * 1, dur: 1.05, idx: i }))}
              bpm={80}
              player={descSkelPlayer}
            />
          }
        >
          <Score notes={DESC_SKEL} clef="bass" width={380} highlightIndex={descSkelPlayer.index} ariaLabel="שלד 5-6 יורד" />
        </Widget>
      </Section>

      <Section id="ascent" num="15.3" title="הסקוונצה העולה — ‏5–6 בארבעה קולות">
        <p>
          וכך נשמע השלד כשמלבישים אותו: הבס עולה דו–דו–רה–רה–מי, ומעל כל צליל בס האקורד מתחלף ממצב
          יסודי לסקסט־אקורד — <span dir="ltr">I–VI6, II–VII6, III</span> — טיפוס מדורג שאין בו אף
          מקבילה. מ־III יורדים מהרכבת אל II6 המוכר, והקדנצה סוגרת:
        </p>
        <Widget
          title="‏I–VI6–II–VII6–III ואז II6–V–I: טיפוס, ירידה בתחנה, קדנצה"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(ASCENT, 1.35)} bpm={76} player={ascentPlayer} />}
        >
          <SatbScores chords={ASCENT} marks={ASCENT_MARKS} highlight={ascentPlayer.index} width={560} label="סקוונצה עולה 5-6 עם קדנצה" />
        </Widget>
        <Callout label="דקות חשובה">
          סקוונצה היא מסלול, לא כלוב. יוצאים ממנה בכל חוליה שנוחה — כאן עצרנו על III, החלפנו ל־II6,
          וסגרנו בקדנצה רגילה. היכולת לזהות איפה סקוונצה מתחילה ואיפה היא נמסרת חזרה לדקדוק הרגיל
          היא מיומנות אנליטית ממדרגה ראשונה.
        </Callout>
      </Section>

      <Section id="minor" num="15.4" title="ובמינור? המעגל הולך בצד הטבעי">
        <p>
          שרשרת הקווינטות במינור היא גילוי: בתוך התבנית אין פונקציה דומיננטית, ולכן{" "}
          <em className="hl">אין הגבהות</em> — המעגל צועד בצורות הטבעיות, ובדרכו עובר דרך VII ו־III
          הטבעיים, אקורדי הסולם המקביל. לרגע, לה מינור נשמע כמו דו מז'ור — ואז החוליה האחרונה נוגעת
          ב־V, סול♯ חוזר, והבית מתייצב:
        </p>
        <Widget
          title="המעגל בלה מינור — ♯ אחד בלבד, בדיוק ברגע הנכון"
          foot={<PlayButton label="נגנו את המעגל" events={chordSeq(MINOR_FIFTHS, 1.35)} bpm={76} player={minorPlayer} />}
        >
          <SatbScores
            chords={MINOR_FIFTHS}
            marks={MINOR_FIFTHS_MARKS}
            highlight={minorPlayer.index}
            width={560}
            label="שרשרת קווינטות יורדות בלה מינור"
            accidentalKey="Am"
          />
        </Widget>
      </Section>

      <Section id="review" num="15.5" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>סקוונצה</b>מודל + העתקים בגבהים עוקבים. האוזן עוקבת אחרי התבנית.</div>
          <div className="review-chip"><b>קווינטות יורדות</b>‏I–IV–VII–III–VI–II–V–I: כל הסולם, וחזרה הביתה.</div>
          <div className="review-chip"><b>הרישיון</b>בתוך סקוונצה גם VII יסודי כשר — התבנית גוברת על האקורד.</div>
          <div className="review-chip"><b>תבנית 5–6</b>הקווינטה מתחלפת בסקסטה לפני שהבס זז — ואין מקבילות.</div>
          <div className="review-chip"><b>עולה</b>‏I–VI6–II–VII6–III: מצב יסודי וסקסט־אקורד לסירוגין.</div>
          <div className="review-chip"><b>יציאה</b>עוצרים בכל חוליה נוחה — ומוסרים חזרה לדקדוק ולקדנצה.</div>
          <div className="review-chip"><b>במינור</b>הצורות הטבעיות בפנים; ♯ רק ב־V שבסוף המעגל.</div>
          <div className="review-chip"><b>המתנה</b>‏VII ו־III הטבעיים = הצצה אל הסולם המקביל באמצע הדרך.</div>
        </div>
      </Section>

      <Section id="drills" num="15.6" title="תרגול — עד שזה אוטומטי">
        <Drill title="מעגל הקווינטות" generate={chainQuestion} />
        <Drill title="חוקי הסקוונצה" generate={licenseQuestion} />
        <Drill title="המעגל במינור" generate={minorQuestion} />
      </Section>

      <NextUnit current={15}>
        <b>הבא בתור — יחידה 16: טכניקות 6/3.</b> מה קורה כשמצעידים סקסט־אקורדים ברצף מקביל? המרקם
        הזורם ביותר של הסגנון — והקול האחד שצריך תושייה כדי לא להתנגש.
      </NextUnit>
    </div>
  );
}
