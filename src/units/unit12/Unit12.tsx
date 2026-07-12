import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";

/* ---------------- two chords over the sixth degree ---------------- */

const SIXTH_CHORDS: ScoreNote[] = [
  { keys: ["a/4", "c/5", "e/5"], midi: [69, 72, 76], mark: "VI", sub: "6 · 1 · 3" },
  { keys: ["a/4", "c/5", "f/5"], midi: [69, 72, 77], mark: "IV6", fig: "6", sub: "בס: לה" },
];

/* ---------------- the reusable four-voice chords (C major) ----------------
   every adjacent pair in every progression below was checked by hand
   for parallels, resolution duties, ranges and spacing */

const I_OPEN: Satb = { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] };
const V7_FULL: Satb = { s: ["b/4", 71], a: ["d/4", 62], t: ["f/3", 53], b: ["g/2", 43] };

/* ---------------- authentic vs deceptive ---------------- */

const CADENCE_FORMS = [
  {
    he: "אותנטית: V7 ← I",
    chords: [I_OPEN, V7_FULL, { s: ["c/5", 72], a: ["c/4", 60], t: ["e/3", 52], b: ["c/3", 48] }] as Satb[],
    marks: ["I", "V7", "I"],
    note: "הצפוי: הצליל המוביל עולה, הספטימה יורדת, והבס קופץ הביתה. נקודה בסוף המשפט.",
  },
  {
    he: "נמנעת: V7 ← VI",
    chords: [I_OPEN, V7_FULL, { s: ["c/5", 72], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] }] as Satb[],
    marks: ["I", "V7", "VI"],
    note: "הקולות העליונים נפתרים בדיוק כמו קודם - סי אל דו, פה אל מי - אבל הבס עולה צעד אל לה. הבית התחלף ברגע האחרון, והמשפט חייב להמשיך.",
  },
] as const;

/* ---------------- VI as a station: descending thirds ---------------- */

const THIRDS_LINE: Satb[] = [
  I_OPEN,
  { s: ["c/5", 72], a: ["e/4", 64], t: ["a/3", 57], b: ["a/2", 45] },
  { s: ["c/5", 72], a: ["f/4", 65], t: ["a/3", 57], b: ["f/2", 41] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/2", 43] },
  I_OPEN,
];
const THIRDS_MARKS = ["I", "VI", "IV", "V", "I"];

/* ---------------- IV6: the bass slides 6-5 ---------------- */

const IV6_MOVE: Satb[] = [
  I_OPEN,
  { s: ["c/5", 72], a: ["f/4", 65], t: ["f/3", 53], b: ["a/2", 45] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/2", 43] },
  I_OPEN,
];
const IV6_MARKS = ["I", "IV6", "V", "I"];

/* ---------------- in minor: two famous colors ---------------- */

const MINOR_FORMS = [
  {
    he: "נמנעת במינור: VI מז'ורי",
    chords: [
      { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
      { s: ["g#/4", 68], a: ["b/3", 59], t: ["d/3", 50], b: ["e/2", 40] },
      { s: ["a/4", 69], a: ["a/3", 57], t: ["c/3", 48], b: ["f/2", 41] },
    ] as Satb[],
    marks: ["i", "V7", "VI"],
    note: "במינור ההפתעה כפולה: אחרי דומיננטה חדה מגיע פתאום אקורד מז'ורי - פה מז'ור בלה מינור. אחד הרגעים האהובים על המלחינים, משוברט ועד היום.",
  },
  {
    he: "חצי קדנצה פריגית: IV6 ← V",
    chords: [
      { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
      { s: ["a/4", 69], a: ["d/4", 62], t: ["d/3", 50], b: ["f/2", 41] },
      { s: ["g#/4", 68], a: ["b/3", 59], t: ["e/3", 52], b: ["e/2", 40] },
    ] as Satb[],
    marks: ["i", "IV6", "V"],
    note: "הבס יורד חצי טון - פה אל מי - והסופרן עולה כנגדו אל הצליל המוביל. נוסחת חצי הקדנצה העתיקה והמפוארת של המינור, ירושה מהמודוס הפריגי.",
  },
] as const;

/* ---------------- drills ---------------- */

const CADENCE_POOL = [
  { desc: "‏V7 נפתר אל I, הסופרן על הטוניקה", ans: "אותנטית שלמה" },
  { desc: "המשפט נעצר על V בלי פתרון", ans: "חצי קדנצה" },
  { desc: "‏V7 מוליך אל VI במקום אל I", ans: "נמנעת" },
  { desc: "במינור: הבס יורד חצי טון אל V", ans: "חצי קדנצה פריגית" },
] as const;

function cadenceQuestion(): Question {
  const q = pick(CADENCE_POOL);
  return {
    prompt: <>{q.desc} - איזו קדנצה זו?</>,
    options: shuffle(CADENCE_POOL.map((c) => c.ans)),
    answer: q.ans,
    explain: <>ההבטחה מיחידה 7 קוימה: הקדנצה הנמנעת הצטרפה למשפחה.</>,
  };
}

const VI_POOL: Question[] = [
  {
    prompt: <>איזה צליל מכפילים ב־VI כשהוא מגיע אחרי V7?</>,
    options: ["את הטרצה - שהיא הטוניקה", "את היסוד", "את הקווינטה", "את הצליל המוביל"],
    answer: "את הטרצה - שהיא הטוניקה",
    explain: <>הצליל המוביל חייב לעלות אל דו, והספטימה יורדת אל מי - שני הפתרונות נוחתים על טרצת VI, והכפלתה מצילה מהמקבילות.</>,
  },
  {
    prompt: <>כמה צלילים משותפים יש ל־VI ול־I?</>,
    options: ["שניים - הטוניקה והמדיאנטה", "אחד", "שלושה", "אף לא אחד"],
    answer: "שניים - הטוניקה והמדיאנטה",
    explain: <>לכן VI מתחזה כל כך בקלות לטוניקה: הוא חולק איתה שני שלישים מצלצולה.</>,
  },
  {
    prompt: <>מדוע הקדנצה הנמנעת \"חייבת להמשיך\"?</>,
    options: [
      "‏VI איננו בית אמיתי - המתח של V לא נפרק, רק נדחה",
      "כי היא מהירה מדי",
      "כי הבס עלה במקום לרדת",
      "היא לא חייבת",
    ],
    answer: "‏VI איננו בית אמיתי - המתח של V לא נפרק, רק נדחה",
    explain: <>ההפתעה קונה למשפט עוד סיבוב: אחרי הנמנעת תבוא כמעט תמיד קדנצה אמיתית.</>,
  },
  {
    prompt: <>בקו בס של טרצות יורדות - דו, לה, פה - אילו אקורדים נשמע?</>,
    options: ["I – VI – IV", "I – V – I", "I – II – V", "I – VII6 – I6"],
    answer: "I – VI – IV",
    explain: <>כל אקורד חולק שני צלילים עם קודמו - ירידה רכה שצוברת צבע בדרך אל ההכנה והדומיננטה.</>,
  },
];

function viQuestion(): Question {
  return pick(VI_POOL);
}

const MINOR_POOL: Question[] = [
  {
    prompt: <>מה איכותו של VI במינור?</>,
    options: ["מז'ורי", "מינורי", "מוקטן", "מוגדל"],
    answer: "מז'ורי",
    explain: <>בלה מינור: פה–לה–דו. לכן הקדנצה הנמנעת במינור מפתיעה כפליים - צבע מז'ורי במקום שציפינו לבית מינורי.</>,
  },
  {
    prompt: <>מה מייחד את חצי הקדנצה הפריגית?</>,
    options: [
      "הבס יורד חצי טון אל V - ‏IV6 ← V במינור",
      "הבס עולה חצי טון",
      "היא מסתיימת על הטוניקה",
      "היא קיימת רק במז'ור",
    ],
    answer: "הבס יורד חצי טון אל V - ‏IV6 ← V במינור",
    explain: <>צעד חצי הטון פה–מי בבס, מול עליית הסופרן אל סול♯ - תנועה נגדית שחותמת אינספור משפטים בבארוק.</>,
  },
];

function minorQuestion(): Question {
  return pick(MINOR_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit12() {
  const cmpPlayer = usePlayer();
  const cadPlayer = usePlayer();
  const thirdsPlayer = usePlayer();
  const iv6Player = usePlayer();
  const minorPlayer = usePlayer();
  const [cadTab, setCadTab] = useState(0);
  const [minTab, setMinTab] = useState(0);

  const cadForm = CADENCE_FORMS[cadTab];
  const minForm = MINOR_FORMS[minTab];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 12 · חלק שני</div>
        <h1>‏VI ו־IV6: ההפתעה וההרחבה</h1>
        <p className="lede">
          ביחידה 7 הבטחנו הפתעה שדוחה את הפתרון - הגיע זמנה. הסובמדיאנטה VI היא אמן ההתחזות של
          הסולם: קרובה מספיק לטוניקה כדי לתפוס את מקומה לרגע, שונה מספיק כדי שנרגיש שמשהו קרה. לצידה
          נכיר את IV6, שחולק איתה בס - ודרך אחרת בתכלית.
        </p>
      </header>

      <Section id="sixth" num="12.1" title="שני אקורדים על הדרגה השישית">
        <p>
          משולש הסובמדיאנטה <b>VI</b> בנוי על <Deg n="6" kind="active" /> ומכיל את <Deg n="1" kind="stable" /> ואת{" "}
          <Deg n="3" kind="stable" /> - שני צלילים משותפים עם הטוניקה, יותר מכל אקורד אחר. זו מהות
          אופיו: קרוב משפחה של הבית. ומעל אותו בס בדיוק - לה - יושב גם <b>IV6</b>, ההיפוך הראשון של
          הסובדומיננטה: אותה נקודת מוצא בבס, תפקיד אחר לגמרי:
        </p>
        <Widget
          title="‏VI ו־IV6 - אותו בס, שני עולמות. לחצו והשוו"
          foot={
            <PlayButton
              label="נגנו את השניים"
              events={SIXTH_CHORDS.map((n, i) => ({ midi: n.midi, time: i * 1.2, dur: 1.25, idx: i }))}
              bpm={80}
              player={cmpPlayer}
            />
          }
        >
          <Score notes={SIXTH_CHORDS} width={280} highlightIndex={cmpPlayer.index} ariaLabel="הסובמדיאנטה ו־IV6 על אותו בס" />
        </Widget>
      </Section>

      <Section id="deceptive" num="12.2" title="הקדנצה הנמנעת">
        <p>
          <Term he="קדנצה נמנעת" en="Deceptive cadence" def="‏V(7) שממשיך אל VI במקום אל I: הקולות העליונים נפתרים כרגיל, אך הבס עולה צעד - והבית מתחלף במפתיע." /> היא
          התעלול היפה של הדקדוק: הדומיננטה מבטיחה בית, הקולות העליונים אכן נפתרים - הצליל המוביל עולה,
          הספטימה יורדת - אבל הבס, במקום לקפוץ אל דו, עולה צעד אל לה. שימו לב לכלל ההכפלה שנולד מכך:
          שני הפתרונות נוחתים על דו, ולכן ב־VI שאחרי הדומיננטה מכפילים את <b>הטרצה</b> - היא הטוניקה:
        </p>
        <Widget
          title="אותו מהלך, שתי נחיתות - בחרו והשוו באוזניים"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {CADENCE_FORMS.map((f, i) => (
                  <button key={f.he} role="tab" aria-selected={cadTab === i} onClick={() => setCadTab(i)}>
                    {f.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את הקדנצה" events={chordSeq([...cadForm.chords], 1.5)} bpm={66} player={cadPlayer} />
            </>
          }
        >
          <SatbScores
            key={cadForm.he}
            chords={[...cadForm.chords]}
            marks={[...cadForm.marks]}
            highlight={cadPlayer.index}
            width={320}
            label={`קדנצה ${cadForm.he}`}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {cadForm.note}
          </p>
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          הקדנצה הנמנעת עובדת דווקא מפני שהכול חוץ מהבס מתנהג למופת. ההפתעה איננה שבירת הכללים אלא
          קיומם המדויק - במקום הלא צפוי. ומכיוון ש־VI איננו בית אמיתי, המתח רק נדחה: אחרי נמנעת
          יבוא כמעט תמיד סיבוב נוסף אל קדנצה אמיתית.
        </Callout>
      </Section>

      <Section id="thirds" num="12.3" title="‏VI כתחנה: טרצות יורדות">
        <p>
          התפקיד השני של VI שקט יותר: תחנת ביניים בדרך מהטוניקה אל ההכנה. כשהבס יורד בטרצות - דו,
          לה, פה - כל אקורד חולק שני צלילים עם קודמו, והמעבר חלק כמשי: הקולות העליונים כמעט אינם
          זזים, והצבע מתחלף מתחתיהם. הקשיבו לסופרן שמחזיק דו אחת לאורך שלושה אקורדים שלמים:
        </p>
        <Widget
          title="‏I–VI–IV–V–I: הבס יורד בטרצות, הקולות העליונים נחים"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(THIRDS_LINE, 1.5)} bpm={72} player={thirdsPlayer} />}
        >
          <SatbScores chords={THIRDS_LINE} marks={THIRDS_MARKS} highlight={thirdsPlayer.index} width={400} label="מהלך טרצות יורדות" />
        </Widget>
      </Section>

      <Section id="iv6" num="12.4" title="‏IV6 - הבס גולש 6–5">
        <p>
          ‏IV6 מניח את <Deg n="6" kind="active" /> בבס ומשם דרכו סלולה: גלישה בצעד אל <Deg n="5" kind="stable" /> של הדומיננטה.
          זו דרך רכה יותר להגיע אל V מאשר הקפיצה של IV במצב יסודי - הבס שר במקום לצעוד. ההכפלה,
          כרגיל בסקסט־אקורדים, לפי נוחות ההובלה - כאן הכפלנו את היסוד:
        </p>
        <Widget
          title="‏I–IV6–V–I: לה בבס גולש אל סול"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(IV6_MOVE, 1.5)} bpm={72} player={iv6Player} />}
        >
          <SatbScores chords={IV6_MOVE} marks={IV6_MARKS} highlight={iv6Player.index} width={340} label="מהלך I–IV6–V–I" />
        </Widget>
      </Section>

      <Section id="minor" num="12.5" title="ובמינור? שני הצבעים הגדולים">
        <p>
          במינור שני האקורדים של היחידה מקבלים את רגעיהם המפורסמים ביותר. ‏VI הופך <b>מז'ורי</b> -
          ולכן הקדנצה הנמנעת במינור מפתיעה כפליים: ציפינו לבית אפל, קיבלנו אור. ו־IV6 יורד אל V בחצי
          טון - פה אל מי - בנוסחה עתיקה שירשנו מהמודוס הפריגי של יחידה 1:
        </p>
        <Widget
          title="שני רגעים מינוריים - בחרו והקשיבו"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {MINOR_FORMS.map((f, i) => (
                  <button key={f.he} role="tab" aria-selected={minTab === i} onClick={() => setMinTab(i)}>
                    {f.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את המהלך" events={chordSeq([...minForm.chords], 1.5)} bpm={66} player={minorPlayer} />
            </>
          }
        >
          <SatbScores
            key={minForm.he}
            chords={[...minForm.chords]}
            marks={[...minForm.marks]}
            highlight={minorPlayer.index}
            width={320}
            label={minForm.he}
            accidentalKey="Am"
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {minForm.note}
          </p>
        </Widget>
      </Section>

      <Section id="review" num="12.6" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>VI</b>בנוי על 6; חולק עם I שני צלילים - קרוב המשפחה של הבית.</div>
          <div className="review-chip"><b>נמנעת</b>‏V(7) ← VI: הקולות נפתרים כרגיל, הבס עולה צעד - והמשפט נמשך.</div>
          <div className="review-chip"><b>הכפלה ב־VI</b>אחרי הדומיננטה - את הטרצה (הטוניקה), לא את היסוד.</div>
          <div className="review-chip"><b>טרצות יורדות</b>‏I–VI–IV: שני צלילים משותפים בכל מעבר, עליונים נחים.</div>
          <div className="review-chip"><b>IV6</b>‏6 בבס גולש אל 5 - דרך רכה אל הדומיננטה.</div>
          <div className="review-chip"><b>במינור: VI מז'ורי</b>הנמנעת מפתיעה כפליים - אור במקום בית אפל.</div>
          <div className="review-chip"><b>פריגית</b>‏IV6 ← V: הבס יורד חצי טון, הסופרן עולה כנגדו.</div>
          <div className="review-chip"><b>אחרי ההפתעה</b>‏VI איננו בית - המתח נדחה, וקדנצה אמיתית תבוא.</div>
        </div>
      </Section>

      <Section id="drills" num="12.7" title="תרגול - עד שזה אוטומטי">
        <Drill title="זיהוי הקדנצה" generate={cadenceQuestion} />
        <Drill title="הסובמדיאנטה" generate={viQuestion} />
        <Drill title="הצבעים של המינור" generate={minorQuestion} />
      </Section>

      <NextUnit current={12}>
        <b>הבא בתור - יחידה 13: ספטאקורדים של II ו־IV.</b> הצלע האחרונה של החלק: מוסיפים ספטימה גם
        לאקורדי ההכנה - ‏II7 על גלגוליו, ‏IV7 ומלכודת המקבילות שלו, וצליל חצי־מוקטן שממיס לבבות.
      </NextUnit>
    </div>
  );
}
