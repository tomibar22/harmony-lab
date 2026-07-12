import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
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

/* ---------------- skeleton vs. ornamented melody over I-V-I ---------------- */

const PHRASE_CHORDS: ChordHit[] = [
  { midi: [48, 55, 64], time: 0, dur: 4 },
  { midi: [43, 55, 62], time: 4, dur: 4 },
  { midi: [48, 55, 64], time: 8, dur: 4 },
];

const PHRASE_FORMS = [
  {
    he: "השלד",
    notes: [
      { keys: ["g/4"], midi: [67], duration: "h", degree: "5" },
      { keys: ["e/4"], midi: [64], duration: "h", degree: "3" },
      { bar: true, keys: [], midi: [] },
      { keys: ["d/4"], midi: [62], duration: "w", degree: "2" },
      { bar: true, keys: [], midi: [] },
      { keys: ["c/4"], midi: [60], duration: "w", degree: "1" },
    ] as ScoreNote[],
    note: "ארבעה צלילי אקורד בלבד: 5–3 מעל הטוניקה, 2 מעל הדומיננטה, ובית. נכון — אבל עירום.",
  },
  {
    he: "עם קישוט",
    notes: [
      { keys: ["g/4"], midi: [67], duration: "q", degree: "5" },
      { keys: ["f/4"], midi: [65], duration: "q", mark: "P", kind: "active" },
      { keys: ["e/4"], midi: [64], duration: "h", degree: "3" },
      { bar: true, keys: [], midi: [] },
      { keys: ["d/4"], midi: [62], duration: "q", degree: "2" },
      { keys: ["e/4"], midi: [64], duration: "q", mark: "N", kind: "active" },
      { keys: ["d/4"], midi: [62], duration: "h" },
      { bar: true, keys: [], midi: [] },
      { keys: ["c/4"], midi: [60], duration: "w", degree: "1" },
    ] as ScoreNote[],
    note: "אותו שלד בדיוק — ובין צלילי האקורד נשזרו צליל מעבר (פה) ושכן עליון (מי מעל V). המלודיה נושמת.",
  },
] as const;

/* ---------------- the calm family: passing, neighbor, chordal skip ---------------- */

const CALM: ScoreNote[] = [
  { keys: ["c/4"], midi: [60], duration: "q", sub: "מעבר" },
  { keys: ["d/4"], midi: [62], duration: "q", mark: "P", kind: "active" },
  { keys: ["e/4"], midi: [64], duration: "h" },
  { bar: true, keys: [], midi: [] },
  { keys: ["e/4"], midi: [64], duration: "q", sub: "שכן" },
  { keys: ["f/4"], midi: [65], duration: "q", mark: "N", kind: "active" },
  { keys: ["e/4"], midi: [64], duration: "h" },
  { bar: true, keys: [], midi: [] },
  { keys: ["c/4"], midi: [60], duration: "q", sub: "דילוג אקורדי" },
  { keys: ["e/4"], midi: [64], duration: "q" },
  { keys: ["g/4"], midi: [67], duration: "h" },
];
const CALM_CHORDS: ChordHit[] = [
  { midi: [48, 55], time: 0, dur: 4 },
  { midi: [48, 55], time: 4, dur: 4 },
  { midi: [48, 55], time: 8, dur: 4 },
];

/* ---------------- the bold family: appoggiatura and escape tone ---------------- */

const BOLD: ScoreNote[] = [
  { keys: ["c/4"], midi: [60], duration: "q", sub: "אפוג'טורה" },
  { keys: ["f/4"], midi: [65], duration: "q", mark: "AP", kind: "active" },
  { keys: ["e/4"], midi: [64], duration: "h" },
  { bar: true, keys: [], midi: [] },
  { keys: ["e/4"], midi: [64], duration: "q", sub: "צליל בורח" },
  { keys: ["f/4"], midi: [65], duration: "q", mark: "ESC", kind: "active" },
  { keys: ["d/4"], midi: [62], duration: "h" },
];
const BOLD_CHORDS: ChordHit[] = [
  { midi: [48, 55], time: 0, dur: 4 },
  { midi: [48, 55], time: 4, dur: 4 },
];

/* ---------------- in minor: the neighbor is raised, the descent is natural ---------------- */

const MINOR_FIG: ScoreNote[] = [
  { keys: ["a/4"], midi: [69], duration: "q", sub: "שכן תחתון: סול♯" },
  { keys: ["g#/4"], midi: [68], duration: "q", mark: "N", kind: "active" },
  { keys: ["a/4"], midi: [69], duration: "h" },
  { bar: true, keys: [], midi: [] },
  { keys: ["a/4"], midi: [69], duration: "q", sub: "מעבר יורד: סול♮" },
  { keys: ["g/4"], midi: [67], duration: "8", beam: "d1", mark: "P", kind: "active" },
  { keys: ["f/4"], midi: [65], duration: "8", beam: "d1", mark: "P", kind: "active" },
  { keys: ["e/4"], midi: [64], duration: "h" },
];
const MINOR_CHORDS: ChordHit[] = [
  { midi: [45, 52, 60], time: 0, dur: 4 },
  { midi: [45, 52, 60], time: 4, dur: 4 },
];

/* ---------------- drills ---------------- */

const TYPE_POOL = [
  { desc: "נכנס בצעד, ממשיך בצעד באותו כיוון — מגשר בין שני צלילי אקורד", ans: "צליל מעבר", why: "הוותיק מכולם, ירושה ישירה מהמין השני בקונטרפונקט." },
  { desc: "יוצא מצליל אקורד בצעד — וחוזר אליו מיד", ans: "שכן", why: "עלה או תחתון: נדנוד קטן שמחייה צליל ארוך." },
  { desc: "נכנס בקפיצה, נפתר בצעד — לרוב על פעמה חזקה", ans: "אפוג'טורה", why: "שכן לא־שלם שנוחת מהאוויר היישר על הדיסוננס. הנרגש שבצלילי הקישוט." },
  { desc: "נכנס בצעד, עוזב בקפיצה", ans: "צליל בורח", why: "שכן לא־שלם במראה הפוכה: מטפס צעד — ובורח בקפיצה אל צליל האקורד הבא." },
  { desc: "נע בין צלילי האקורד עצמו — בלי שום דיסוננס", ans: "דילוג אקורדי", why: "פירוק: המלודיה מטיילת בתוך ההרמוניה. חופשי לגמרי." },
] as const;

function typeQuestion(): Question {
  const q = pick(TYPE_POOL);
  return {
    prompt: <>{q.desc} — איזה צליל קישוט זה?</>,
    options: shuffle(TYPE_POOL.map((t) => t.ans)),
    answer: q.ans,
    explain: <>{q.why}</>,
  };
}

const RULE_POOL: Question[] = [
  {
    prompt: <>מה מבדיל צליל קישוט מצליל אקורד?</>,
    options: [
      "הוא זר להרמוניה הרגעית — ומתקיים רק מכוח התנועה המלודית",
      "הוא תמיד קצר יותר",
      "הוא תמיד חזק יותר",
      "אין הבדל",
    ],
    answer: "הוא זר להרמוניה הרגעית — ומתקיים רק מכוח התנועה המלודית",
    explain: <>האנליזה מתחילה כאן: קודם מזהים מה שייך לאקורד, ואז כל השאר חייב הסבר מלודי — מעבר, שכן, אפוג'טורה...</>,
  },
  {
    prompt: <>מה ההבדל המהותי בין צליל מעבר לאפוג'טורה?</>,
    options: [
      "המעבר נבלע בתנועה בפעמה קלה; האפוג'טורה נוחתת בקפיצה על פעמה חזקה ודורשת פתרון",
      "המעבר גבוה יותר",
      "האפוג'טורה אינה דיסוננטית",
      "אין הבדל",
    ],
    answer: "המעבר נבלע בתנועה בפעמה קלה; האפוג'טורה נוחתת בקפיצה על פעמה חזקה ודורשת פתרון",
    explain: <>אותו עיקרון מהקוורט־סקסט הקדנציאלי: מיקום במשקל קובע כמה הדיסוננס מורגש — מקישוט חולף ועד אנחה.</>,
  },
  {
    prompt: <>מדוע ההבחנה \"שלד מול קישוט\" חשובה כל כך לאנליזה?</>,
    options: [
      "היא חושפת את ההרמוניה האמיתית מתחת לשטף הצלילים — לא כל צליל הוא אקורד",
      "היא מייפה את התווים",
      "היא קובעת את הטמפו",
      "היא לא באמת חשובה",
    ],
    answer: "היא חושפת את ההרמוניה האמיתית מתחת לשטף הצלילים — לא כל צליל הוא אקורד",
    explain: <>מי שמנסה לתייג כל צליל כאקורד טובע. מי שמזהה את השלד — קורא דף של באך כמו משפט אחד פשוט.</>,
  },
  {
    prompt: <>מאיפה מוכרים לנו צליל המעבר והשכן?</>,
    options: [
      "מהמין השני והשלישי בקונטרפונקט — יחידה 5",
      "מהקדנצות",
      "מסימני ההיתק",
      "זו פגישה ראשונה",
    ],
    answer: "מהמין השני והשלישי בקונטרפונקט — יחידה 5",
    explain: <>הפיגורציה החופשית היא הקונטרפונקט של המינים, משוחרר אל תוך המרקם ההרמוני. אותם כללים, יותר חופש.</>,
  },
];

function ruleQuestion(): Question {
  return pick(RULE_POOL);
}

const MINOR_POOL: Question[] = [
  {
    prompt: <>במינור, שכן תחתון לטוניקה (לה) משתמש ב־</>,
    options: ["סול♯ — הצליל המוביל, שנמשך חזרה מעלה", "סול טבעי", "פה", "לה במול"],
    answer: "סול♯ — הצליל המוביל, שנמשך חזרה מעלה",
    explain: <>שכן תחתון רוצה להימשך חזרה — וחצי הטון של הצליל המוביל מושך הכי חזק.</>,
  },
  {
    prompt: <>ובמעבר יורד מלה אל מי — סול ופה יהיו:</>,
    options: ["טבעיים — הירידה הולכת בצד הטבעי של המינור", "מוגבהים", "מונמכים כפליים", "מושמטים"],
    answer: "טבעיים — הירידה הולכת בצד הטבעי של המינור",
    explain: <>הכלל מלווה אותנו מיחידה 1 ועד כאן: עלייה אל הטוניקה מגביהה, ירידה משחררת. גם צלילי קישוט מצייתים לו.</>,
  },
];

function minorQuestion(): Question {
  return pick(MINOR_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit18() {
  const phrasePlayer = usePlayer();
  const calmPlayer = usePlayer();
  const boldPlayer = usePlayer();
  const minorPlayer = usePlayer();
  const [phraseTab, setPhraseTab] = useState(0);

  const phrase = PHRASE_FORMS[phraseTab];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 18 · חלק רביעי</div>
        <h1>פיגורציה מלודית</h1>
        <p className="lede">
          שלושה חלקים בנינו שלדים — אקורדים נכונים, קולות מיושרים. אבל מוזיקה אמיתית אינה נשמעת כמו
          כורל אקורדים: בין צלילי ההרמוניה נשזרים צלילים זרים לה, שקיומם מלודי בלבד. אלה{" "}
          <Term he="צלילי קישוט" en="Figuration tones" def="צלילים שאינם שייכים לאקורד הרגעי ומתקיימים מכוח התנועה המלודית: מעבר, שכן, אפוג'טורה, צליל בורח." /> —
          והם ההבדל בין תרגיל לשיר.
        </p>
      </header>

      <Section id="skeleton" num="18.1" title="שלד וקישוט — אותה מוזיקה, פעמיים">
        <p>
          קחו את המשפט הפשוט בעולם — <Deg n="5" />–<Deg n="3" kind="stable" /> מעל I,{" "}
          <Deg n="2" kind="active" /> מעל V, ובית — והשוו אותו לגרסה שבה נשזרו שני צלילים זרים בלבד.
          ההרמוניה לא השתנתה באות אחת; רק המלודיה למדה ללכת בין האקורדים במקום לקפוץ מעליהם:
        </p>
        <Widget
          title="בחרו גרסה והשוו — הצלילים הצבועים זרים להרמוניה"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {PHRASE_FORMS.map((f, i) => (
                  <button key={f.he} role="tab" aria-selected={phraseTab === i} onClick={() => setPhraseTab(i)}>
                    {f.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את המשפט" events={melSeq([...phrase.notes], PHRASE_CHORDS)} bpm={84} player={phrasePlayer} />
            </>
          }
        >
          <Score
            key={phrase.he}
            notes={[...phrase.notes]}
            timeSig="4/4"
            width={380}
            highlightIndex={phrasePlayer.index}
            ariaLabel={`מלודיה מעל I-V-I: ${phrase.he}`}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {phrase.note}
          </p>
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          זה מפתח האנליזה החשוב ביותר שתקבלו: מול כל מלודיה, שאלו קודם <em className="hl">מה
          השלד</em> — אילו צלילים שייכים לאקורדים — וכל השאר יסתדר כקישוט. לא כל צליל הוא הרמוניה;
          מי שמבין זאת קורא דף שלם של באך כמו משפט אחד.
        </Callout>
      </Section>

      <Section id="calm" num="18.2" title="המשפחה השקטה: מעבר, שכן, דילוג">
        <p>
          שלושת אלה מוכרים לנו עוד מהקונטרפונקט של יחידה 5 — עכשיו הם פועלים בתוך מרקם הרמוני חופשי.{" "}
          <b>צליל מעבר</b> נכנס בצעד וממשיך בצעד באותו כיוון; <b>שכן</b> יוצא בצעד וחוזר מיד;{" "}
          <b>דילוג אקורדי</b> כלל אינו דיסוננס — טיול בתוך צלילי האקורד עצמו:
        </p>
        <Widget
          title="שלוש תבניות מעל אקורד דו — הצבועים הם הזרים"
          foot={<PlayButton label="נגנו את השלוש" events={melSeq(CALM, CALM_CHORDS)} bpm={84} player={calmPlayer} />}
        >
          <Score notes={CALM} timeSig="4/4" width={420} highlightIndex={calmPlayer.index} ariaLabel="מעבר, שכן ודילוג אקורדי" />
        </Widget>
      </Section>

      <Section id="bold" num="18.3" title="המשפחה הנועזת: אפוג'טורה וצליל בורח">
        <p>
          לשכן יש שני בנים חסרי מנוחה, שמוותרים על חצי מהתבנית.{" "}
          <Term he="אפוג'טורה" en="Appoggiatura" def="צליל זר שנכנס בקפיצה ונפתר בצעד, לרוב על פעמה חזקה — 'נשען' על הצליל שאליו הוא נפתר." /> נכנסת
          ב<em className="hl">קפיצה</em> ונפתרת בצעד — דיסוננס שנוחת מהאוויר, לרוב על פעמה חזקה, כמו
          אנחה. <Term he="צליל בורח" en="Escape tone" def="צליל זר שנכנס בצעד ועוזב בקפיצה — מטפס החוצה מהקו ובורח אל צליל האקורד הבא." /> הפוך
          ממנה: נכנס בצעד — ובורח בקפיצה:
        </p>
        <Widget
          title="שתי דרכים לשבור את תבנית השכן — הקשיבו להבדל באופי"
          foot={<PlayButton label="נגנו את השתיים" events={melSeq(BOLD, BOLD_CHORDS)} bpm={76} player={boldPlayer} />}
        >
          <Score notes={BOLD} timeSig="4/4" width={340} highlightIndex={boldPlayer.index} ariaLabel="אפוג'טורה וצליל בורח" />
        </Widget>
        <Callout label="דקות חשובה">
          שוב המשקל קובע משמעות: מעבר ושכן נבלעים בפעמות הקלות; האפוג'טורה חיה דווקא על החזקות —
          הדיסוננס המוטעם הוא כל האפקט שלה. אותו עיקרון בדיוק פגשנו בקוורט־סקסט הקדנציאלי: מתח על
          החזק, פתרון על החלש.
        </Callout>
      </Section>

      <Section id="minor" num="18.4" title="ובמינור? הקישוט מציית לכללי הסולם">
        <p>
          צלילי הקישוט חיים באזור שבו המינור מתפצל — הדרגות 6 ו־7 — ולכן הם מצייתים לכלל הוותיק
          מיחידה 1: <b>שכן תחתון</b> לטוניקה נמשך חזרה מעלה, ולכן משתמש בצליל המוביל המוגבה, סול♯;{" "}
          <b>מעבר יורד</b> הולך עם הקו מטה — סול ופה טבעיים:
        </p>
        <Widget
          title="אותו סול, שני תפקידים — ♯ בשכנות, ♮ בירידה"
          foot={<PlayButton label="נגנו את השתיים" events={melSeq(MINOR_FIG, MINOR_CHORDS)} bpm={76} player={minorPlayer} />}
        >
          <Score
            notes={MINOR_FIG}
            timeSig="4/4"
            width={340}
            accidentalKey="Am"
            highlightIndex={minorPlayer.index}
            ariaLabel="קישוט במינור: שכן מוגבה ומעבר טבעי"
          />
        </Widget>
      </Section>

      <Section id="review" num="18.5" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>העיקרון</b>קודם השלד ההרמוני — כל צליל אחר מוסבר כקישוט מלודי.</div>
          <div className="review-chip"><b>מעבר</b>צעד פנימה, צעד החוצה, אותו כיוון — גשר בין צלילי אקורד.</div>
          <div className="review-chip"><b>שכן</b>צעד החוצה וחזרה מיד — עליון או תחתון.</div>
          <div className="review-chip"><b>דילוג אקורדי</b>תנועה בתוך האקורד — אין דיסוננס, אין חובות.</div>
          <div className="review-chip"><b>אפוג'טורה</b>קפיצה פנימה, צעד החוצה — דיסוננס מוטעם שנפתר.</div>
          <div className="review-chip"><b>צליל בורח</b>צעד פנימה, קפיצה החוצה — שכן שלא חזר הביתה.</div>
          <div className="review-chip"><b>משקל</b>מעבר ושכן על הקל; האפוג'טורה חיה על החזק.</div>
          <div className="review-chip"><b>במינור</b>שכן תחתון לטוניקה — ♯; ירידה — הצד הטבעי.</div>
        </div>
      </Section>

      <Section id="drills" num="18.6" title="תרגול — עד שזה אוטומטי">
        <Drill title="זיהוי הקישוט" generate={typeQuestion} />
        <Drill title="שלד מול קישוט" generate={ruleQuestion} />
        <Drill title="קישוט במינור" generate={minorQuestion} />
      </Section>

      <NextUnit current={18}>
        <b>הבא בתור — יחידה 19: פיגורציה ריתמית.</b> אם ביחידה הזו הזזנו צלילים במרחב, בבאה נזיז
        אותם בזמן: השהיות בארבעה קולות, אנטיציפציה, ונקודת הפדל — הקישוט שהופך את המקצב עצמו לכלי
        ביטוי.
      </NextUnit>
    </div>
  );
}
