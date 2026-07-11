import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, Fig, PlayButton, Section, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";

/* ---------------- V7 and its three inversions, side by side ---------------- */

const V7_POSITIONS: ScoreNote[] = [
  { keys: ["g/3", "b/3", "d/4", "f/4"], midi: [55, 59, 62, 65], mark: "V7", fig: "7", sub: "בס: סול" },
  { keys: ["b/3", "d/4", "f/4", "g/4"], midi: [59, 62, 65, 67], mark: "V65", fig: "6/5", sub: "בס: סי" },
  { keys: ["d/4", "f/4", "g/4", "b/4"], midi: [62, 65, 67, 71], mark: "V43", fig: "4/3", sub: "בס: רה" },
  { keys: ["f/4", "g/4", "b/4", "d/5"], midi: [65, 67, 71, 74], mark: "V42", fig: "4/2", sub: "בס: פה" },
];

/* ---------------- the reusable four-voice chords (C major) ----------------
   every adjacent pair in every progression below was checked by hand
   for parallels, resolution duties, ranges and spacing */

const I_CLOSE: Satb = { s: ["e/4", 64], a: ["c/4", 60], t: ["g/3", 55], b: ["c/3", 48] };
const V65: Satb = { s: ["f/4", 65], a: ["d/4", 62], t: ["g/3", 55], b: ["b/2", 47] };
const V43: Satb = { s: ["f/4", 65], a: ["b/3", 59], t: ["g/3", 55], b: ["d/3", 50] };
const I6_CLOSE: Satb = { s: ["e/4", 64], a: ["c/4", 60], t: ["g/3", 55], b: ["e/3", 52] };

/* ---------------- V65: the leading tone in the bass, with the seventh ---------------- */

const V65_MOVE: Satb[] = [I_CLOSE, V65, I_CLOSE];

/* ---------------- V43: the passing dominant ---------------- */

const V43_FORMS = [
  {
    he: "פתרון מלא: 4 יורדת",
    chords: [I_CLOSE, V43, I6_CLOSE] as Satb[],
    marks: ["I", "V43", "I6"],
    note: "הסופרן מצייר שכן עליון 3–4–3: הספטימה (פה) נכנסת ויורדת חזרה אל מי. כל חובות הפתרון מתקיימות — והבס עובר דו–רה–מי.",
  },
  {
    he: "ההקלה: 4 עולה אל 5",
    chords: [
      { s: ["g/4", 67], a: ["c/4", 60], t: ["e/3", 52], b: ["c/3", 48] },
      { s: ["g/4", 67], a: ["b/3", 59], t: ["f/3", 53], b: ["d/3", 50] },
      { s: ["g/4", 67], a: ["c/4", 60], t: ["g/3", 55], b: ["e/3", 52] },
    ] as Satb[],
    marks: ["I", "V43", "I6"],
    note: "כאן הספטימה בטנור — והיא עולה: פה–סול, בטרצות מקבילות עם הבס רה–מי. ההקלה היחידה בדין הספטימה, והיא קיימת רק ב־V43 העובר.",
  },
] as const;

/* ---------------- V42: the seventh itself in the bass ---------------- */

const V42_MOVE: Satb[] = [
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/2", 43] },
  { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["f/2", 41] },
  { s: ["c/5", 72], a: ["c/4", 60], t: ["g/3", 55], b: ["e/2", 40] },
];
const V42_MARKS = ["I", "V", "V42", "I6"];

/* ---------------- the grand bass line: all inversions in one phrase ---------------- */

const GRAND_LINE: Satb[] = [
  I_CLOSE,
  V65,
  I_CLOSE,
  V43,
  I6_CLOSE,
  { s: ["g/4", 67], a: ["d/4", 62], t: ["b/3", 59], b: ["f/3", 53] },
  { s: ["g/4", 67], a: ["e/4", 64], t: ["c/4", 60], b: ["e/3", 52] },
  { s: ["g/4", 67], a: ["d/4", 62], t: ["b/3", 59], b: ["g/2", 43] },
  { s: ["g/4", 67], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
];
const GRAND_MARKS = ["I", "V65", "I", "V43", "I6", "V42", "I6", "V", "I"];

/* ---------------- in minor: V65 with the raised 7 in the bass ---------------- */

const MINOR_V65: Satb[] = [
  { s: ["c/4", 60], a: ["a/3", 57], t: ["e/3", 52], b: ["a/2", 45] },
  { s: ["d/4", 62], a: ["b/3", 59], t: ["e/3", 52], b: ["g#/2", 44] },
  { s: ["c/4", 60], a: ["a/3", 57], t: ["e/3", 52], b: ["a/2", 45] },
];

/* ---------------- drills ---------------- */

const BASS_POOL = [
  { chord: "V7", deg: "5", why: "מצב יסודי: היסוד — הדומיננטה — בבס." },
  { chord: "V65", deg: "7", why: "היפוך ראשון: הטרצה, כלומר הצליל המוביל, בבס — כמו V6, בתוספת ספטימה." },
  { chord: "V43", deg: "2", why: "היפוך שני: הקווינטה — הסופרטוניקה — בבס, בדיוק כמו הבס של VII6." },
  { chord: "V42", deg: "4", why: "היפוך שלישי: הספטימה עצמה בבס — ולכן הבס חייב לרדת בצעד." },
] as const;

function bassQuestion(): Question {
  const q = pick(BASS_POOL);
  return {
    prompt: (
      <>
        איזו דרגה יושבת בבס של <span dir="ltr">{q.chord}</span>?
      </>
    ),
    options: shuffle(["2", "4", "5", "7"]),
    answer: q.deg,
    explain: <>{q.why}</>,
  };
}

const RESOLVE_POOL: Question[] = [
  {
    prompt: <>לאן נפתר V42 — ומדוע?</>,
    options: ["אל I6, כי הבס (הספטימה) חייב לרדת אל 3", "אל I במצב יסודי", "אל V6", "לאן שנרצה"],
    answer: "אל I6, כי הבס (הספטימה) חייב לרדת אל 3",
    explain: <>הדיסוננס יושב בבס עצמו — פה יורדת אל מי, ולכן הטוניקה מגיעה בהכרח בהיפוך ראשון.</>,
  },
  {
    prompt: <>מה היתרון של היפוכי V7 על פני V7 במצב יסודי?</>,
    options: ["שני האקורדים נשארים שלמים — אין צורך להשמיט קווינטה", "הם חזקים יותר בקדנצה", "אין בהם טריטון", "הספטימה לא חייבת לרדת"],
    answer: "שני האקורדים נשארים שלמים — אין צורך להשמיט קווינטה",
    explain: <>הבס נפתר בצעד, החשבון יוצא חלק — הפשרה של \"שלם מול חסר\" מיחידה 7 נחוצה רק במצב היסודי.</>,
  },
  {
    prompt: <>מתי הספטימה של V7 רשאית לעלות אל 5 במקום לרדת אל 3?</>,
    options: ["ב־V43 עובר, כשהיא נעה בטרצות מקבילות עם הבס", "תמיד", "אף פעם", "רק בקדנצה"],
    answer: "ב־V43 עובר, כשהיא נעה בטרצות מקבילות עם הבס",
    explain: <>אותה הקלה שפגשנו ב־VII6: תנועת מעבר צעדית עם הבס מרככת את דין הדיסוננס.</>,
  },
  {
    prompt: <>‏V43 ו־VII6 חולקים את אותו תפקיד. מהו?</>,
    options: ["אקורד מעבר בין I ל־I6, עם 2 בבס", "סיום קדנצה", "שכן עליון ל־V", "תחליף לסובדומיננטה"],
    answer: "אקורד מעבר בין I ל־I6, עם 2 בבס",
    explain: <>‏V43 הוא למעשה VII6 בתוספת סול — דומיננטה מלאה שמגשרת בין שני מצבי הטוניקה.</>,
  },
  {
    prompt: <>הבס מנגן סול–פה–מי מתחת לדומיננטה מתמשכת. אילו אקורדים אלה?</>,
    options: ["V–V42–I6", "V–IV–I", "V7–V6–I", "V–V43–I"],
    answer: "V–V42–I6",
    explain: <>הבס צועד מהיסוד אל הספטימה ונפתר אל 3 — הקולות העליונים בקושי זזים. תבנית נפוצה מאין כמוה.</>,
  },
];

function resolveQuestion(): Question {
  return pick(RESOLVE_POOL);
}

const FIGURE_POOL = [
  { desc: "הצליל המוביל בבס, והספטימה באחד הקולות", fig: "6/5" },
  { desc: "הסופרטוניקה בבס — אקורד המעבר של הדומיננטה", fig: "4/3" },
  { desc: "הספטימה עצמה בבס", fig: "4/2" },
  { desc: "היסוד בבס — המצב היחיד שבו לפעמים משמיטים את הקווינטה", fig: "7" },
] as const;

function figureQuestion(): Question {
  const q = pick(FIGURE_POOL);
  return {
    prompt: <>{q.desc} — איזה ספרור מתאים?</>,
    options: shuffle(
      FIGURE_POOL.map((f) => ({ value: f.fig, label: <Fig n={f.fig} /> }))
    ),
    answer: q.fig,
    answerLabel: <Fig n={q.fig} />,
    explain: <>הספרות מונות את המרווחים שמעל הבס: 7 — מצב יסודי; 6/5 — טרצה בבס; 4/3 — קווינטה בבס; 4/2 — ספטימה בבס.</>,
  };
}

/* ---------------- the lesson ---------------- */

export function Unit09() {
  const posPlayer = usePlayer();
  const v65Player = usePlayer();
  const v43Player = usePlayer();
  const v42Player = usePlayer();
  const grandPlayer = usePlayer();
  const minorPlayer = usePlayer();
  const [v43Tab, setV43Tab] = useState(0);

  const v43Form = V43_FORMS[v43Tab];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 9 · חלק שני</div>
        <h1>היפוכי V7: ‏6/5, ‏4/3 ו־4/2</h1>
        <p className="lede">
          מה שעשינו ביחידה 8 למשולשים נעשה עכשיו לספטאקורד הדומיננטה. לְ־V7 ארבעה צלילים — ולכן שלושה
          היפוכים, וכל אחד שם בבס דרגה פעילה אחרת: הצליל המוביל, הסופרטוניקה או הסובדומיננטה. הבס מקבל
          עוד שלוש דרכים לנוע — וכולן בצעדים.
        </p>
      </header>

      <Section id="positions" num="9.1" title="ארבעה מצבים לאקורד אחד">
        <p>
          הספרורים באים היישר משיטת הבס הממוספר של יחידה 4: <Fig n="6/5" /> — הטרצה בבס, <Fig n="4/3" /> —
          הקווינטה בבס, <Fig n="4/2" /> — הספטימה בבס. ומאחורי החשבון עומד עיקרון אחד: בכל היפוך, הבס
          הוא דרגה פעילה שכבר יודעת לאן היא הולכת. <Deg n="7" kind="active" /> תעלה אל הטוניקה,{" "}
          <Deg n="2" kind="active" /> תצעד אל 1 או אל 3, ו־<Deg n="4" kind="active" /> — הספטימה — תרד
          בצעד. לחצו והשוו:
        </p>
        <Widget
          title="‏V7 ושלושת היפוכיו — הקשיבו איך הצבע משתנה עם הבס"
          foot={
            <PlayButton
              label="נגנו את הארבעה"
              events={V7_POSITIONS.map((n, i) => ({ midi: n.midi, time: i * 1.1, dur: 1.15, idx: i }))}
              bpm={84}
              player={posPlayer}
            />
          }
        >
          <Score notes={V7_POSITIONS} width={400} highlightIndex={posPlayer.index} ariaLabel="ספטאקורד הדומיננטה בארבעת מצביו" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          ביחידה 7 נאלצנו לבחור: V7 שלם או טוניקה שלמה. ההיפוכים מבטלים את הדילמה — כשהבס נפתר בצעד,
          כל ארבעת הצלילים נשארים במקומם הטבעי, ושני האקורדים שלמים תמיד. זה הטעם העמוק לאהוב
          היפוכים: הם משיגים את אותו דקדוק במחיר אפס.
        </Callout>
      </Section>

      <Section id="v65" num="9.2" title="‏V65 — כמו V6, עם עוד עוקץ">
        <p>
          ‏V65 הוא אחיו החריף של V6: אותו צליל מוביל בבס, אותה משיכה מעלה אל הטוניקה — ובנוסף הספטימה{" "}
          <Deg n="4" kind="active" /> באחד הקולות העליונים, שיורדת בצעד אל <Deg n="3" kind="stable" />.
          שתי חובות פתרון, שתיהן מתקיימות, והכול נשאר שלם. כמו V6, גם V65 חי צמוד ל־I — שכן תחתון של
          הבס:
        </p>
        <Widget
          title="‏I–V65–I: סי בבס עולה, פה בסופרן יורדת"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(V65_MOVE, 1.5)} bpm={72} player={v65Player} />}
        >
          <SatbScores chords={V65_MOVE} marks={["I", "V65", "I"]} highlight={v65Player.index} width={320} label="מהלך I–V65–I" />
        </Widget>
      </Section>

      <Section id="v43" num="9.3" title="‏V43 — אקורד המעבר, גרסת הדומיננטה המלאה">
        <p>
          הבס של V43 הוא <Deg n="2" kind="active" /> — בדיוק הבס של VII6 מיחידה 8, ובדיוק אותו תפקיד:
          לגשר בין I ל־I6 בקו דו–רה–מי. ההבדל? V43 מוסיף את סול, כך שהמעבר נעשה עם דומיננטה מלאה.
          ולספטימה שלו יש כאן זכות מיוחדת — שתי הדרכים:
        </p>
        <Widget
          title="‏I–V43–I6 — בחרו מה עושה הספטימה"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {V43_FORMS.map((f, i) => (
                  <button key={f.he} role="tab" aria-selected={v43Tab === i} onClick={() => setV43Tab(i)}>
                    {f.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את המהלך" events={chordSeq([...v43Form.chords], 1.5)} bpm={72} player={v43Player} />
            </>
          }
        >
          <SatbScores
            key={v43Form.he}
            chords={[...v43Form.chords]}
            marks={[...v43Form.marks]}
            highlight={v43Player.index}
            width={320}
            label={`מעבר I–V43–I6: ${v43Form.he}`}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {v43Form.note}
          </p>
        </Widget>
      </Section>

      <Section id="v42" num="9.4" title="‏V42 — הדיסוננס יורד לבס">
        <p>
          בהיפוך השלישי הספטימה עצמה יושבת בבס — ומכאן נגזר הכול: הבס <em className="hl">חייב</em> לרדת
          בצעד אל <Deg n="3" kind="stable" />, ולכן V42 נפתר תמיד אל <b>I6</b>, לעולם לא אל I במצב
          יסודי. התבנית האהובה: הבס צועד סול–פה–מי, מהיסוד של V אל הספטימה ואל הפתרון, בעוד הקולות
          העליונים כמעט עומדים:
        </p>
        <Widget
          title="‏I–V–V42–I6: הבס יורד 5–4–3, והקולות העליונים מחזיקים"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(V42_MOVE, 1.5)} bpm={72} player={v42Player} />}
        >
          <SatbScores chords={V42_MOVE} marks={V42_MARKS} highlight={v42Player.index} width={360} label="מהלך I–V–V42–I6" />
        </Widget>
        <Callout label="דקות חשובה">
          שימו לב מה קרה בין V ל־V42: רק הבס זז. הוספת ספטימה מתחת לאקורד קיים היא דרך שכיחה להצית
          תנועה — הדומיננטה הייתה יציבה־יחסית, ופתאום הבס עצמו דיסוננטי וחייב להמשיך. V42 הוא מנוע
          קטן של \"עוד לא נגמר\".
        </Callout>
      </Section>

      <Section id="line" num="9.5" title="קו הבס הגדול — כל ההיפוכים במשפט אחד">
        <p>
          כשמצרפים את הכול, הדומיננטה יכולה ללוות את הבס כמעט בכל צעד שירצה: דו–סי–דו–רה–מי–פה–מי —
          שכן תחתון, טיפוס, שכן עליון — ולסיום קפיצת הקדנצה. תשעה אקורדים, ורק שניים מהם אינם טוניקה
          או דומיננטה... רגע, בעצם כולם טוניקה או דומיננטה. זה כל הסוד:
        </p>
        <Widget
          title="‏I–V65–I–V43–I6–V42–I6–V–I: הבס משוטט, הדקדוק אחד"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(GRAND_LINE, 1.4)} bpm={76} player={grandPlayer} />}
        >
          <SatbScores chords={GRAND_LINE} marks={GRAND_MARKS} highlight={grandPlayer.index} width={560} label="מהלך שלם עם כל היפוכי הדומיננטה" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          יחידות 7–9 בנו יחד מערכת אחת: ציר I–V שבו הבס חופשי לנוע בצעדים לכל כיוון, וכל צעד מקבל
          אקורד משלו. מעכשיו, כשתראו בס צעדי בכורל של באך — נסו קודם לפרש אותו כטוניקה ודומיננטה
          בהיפוכים. לרוב זה כל מה שיש שם.
        </Callout>
      </Section>

      <Section id="minor" num="9.6" title="ובמינור? ההגבהה יורדת לבס">
        <p>
          כרגיל, המינור דורש את הצליל המוביל — אלא שעכשיו, ב־V65, ההגבהה יושבת בבס עצמו: בלה מינור
          הבס מנגן סול♯ ונפתר אל לה. סימן ההיתק לא יעזור כאן — הדיאז נכתב כסימן מזדמן לפני תו הבס,
          והעין לומדת לזהות בו מיד את הדומיננטה:
        </p>
        <Widget
          title="‏i–V65–i בלה מינור — סול♯ בבס"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(MINOR_V65, 1.5)} bpm={72} player={minorPlayer} />}
        >
          <SatbScores
            chords={MINOR_V65}
            marks={["i", "V65", "i"]}
            highlight={minorPlayer.index}
            width={320}
            label="מהלך i–V65–i בלה מינור"
            accidentalKey="Am"
          />
        </Widget>
      </Section>

      <Section id="review" num="9.7" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>שלושה היפוכים</b>‏6/5 — צליל מוביל בבס; 4/3 — סופרטוניקה; 4/2 — הספטימה עצמה.</div>
          <div className="review-chip"><b>הכול שלם</b>בהיפוכים אין השמטות ואין הכפלות — ארבעה צלילים, ארבעה קולות.</div>
          <div className="review-chip"><b>V65</b>שכן תחתון ל־I: הבס עולה אל 1, הספטימה יורדת אל 3.</div>
          <div className="review-chip"><b>V43</b>אקורד מעבר בין I ל־I6 — ‏VII6 בתוספת היסוד.</div>
          <div className="review-chip"><b>ההקלה</b>רק ב־V43 עובר: הספטימה רשאית לעלות אל 5 בטרצות עם הבס.</div>
          <div className="review-chip"><b>V42</b>הבס חייב לרדת בצעד — הפתרון תמיד I6, לעולם לא I.</div>
          <div className="review-chip"><b>סול–פה–מי</b>‏V–V42–I6: הבס צועד אל הספטימה, הקולות העליונים מחזיקים.</div>
          <div className="review-chip"><b>במינור</b>ההגבהה של 7 מגיעה לבס עצמו — דיאז לפני תו הבס של V65.</div>
        </div>
      </Section>

      <Section id="drills" num="9.8" title="תרגול — עד שזה אוטומטי">
        <Drill title="מי בבס?" generate={bassQuestion} />
        <Drill title="פתרונות ותפקידים" generate={resolveQuestion} />
        <Drill title="קריאת ספרורים" generate={figureQuestion} />
      </Section>

      <NextUnit current={9}>
        <b>הבא בתור — יחידה 10: בדרך אל V.</b> עד עכשיו הגענו לדומיננטה ישירות מהטוניקה. ‏IV, ‏II
        ו־II6 הם אקורדי ההכנה — התחנה שבין הבית לדרמה, והצלע השלישית של המשפט הטונאלי.
      </NextUnit>
    </div>
  );
}
