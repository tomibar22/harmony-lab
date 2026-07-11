import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { SeqEvent } from "../../engine/audio";

/* ---------------- Fux's cantus firmus in D (Gradus ad Parnassum, 1725) ---------------- */

const CF_MIDI = [62, 65, 64, 62, 67, 65, 69, 67, 65, 64, 62];
const CF_KEYS = ["d/4", "f/4", "e/4", "d/4", "g/4", "f/4", "a/4", "g/4", "f/4", "e/4", "d/4"];

const CF_NOTES: ScoreNote[] = CF_KEYS.map((k, i) => ({ keys: [k], midi: [CF_MIDI[i]] }));

/* Fux's own first-species counterpoint above the cantus */
const CP_MIDI = [69, 69, 67, 69, 71, 72, 72, 71, 74, 73, 74];
const CP_KEYS = ["a/4", "a/4", "g/4", "a/4", "b/4", "c/5", "c/5", "b/4", "d/5", "c#/5", "d/5"];
const SPECIES1_INTERVALS = ["5", "3", "3", "5", "3", "5", "3", "3", "6", "6", "8"];

const SPECIES1_NOTES: ScoreNote[] = CF_KEYS.map((k, i) => ({
  keys: [k, CP_KEYS[i]],
  midi: [CF_MIDI[i], CP_MIDI[i]],
  mark: SPECIES1_INTERVALS[i],
}));

const SPECIES1_BOTH: SeqEvent[] = CF_MIDI.map((m, i) => ({
  midi: [m, CP_MIDI[i]],
  time: i,
  dur: 0.98,
  idx: i,
}));

/* ---------------- types of relative motion ---------------- */

const MOTIONS = [
  {
    he: "מקבילה",
    desc: "שני הקולות נעים באותו כיוון ושומרים על אותו מרווח בדיוק.",
    chords: [
      { keys: ["c/4", "e/4"], midi: [60, 64] },
      { keys: ["d/4", "f/4"], midi: [62, 65] },
    ],
  },
  {
    he: "ישרה",
    desc: "שני הקולות נעים באותו כיוון, אבל המרווח משתנה.",
    chords: [
      { keys: ["c/4", "e/4"], midi: [60, 64] },
      { keys: ["d/4", "b/4"], midi: [62, 71] },
    ],
  },
  {
    he: "נגדית",
    desc: "הקולות נעים בכיוונים מנוגדים — המלך של הקונטרפונקט.",
    chords: [
      { keys: ["e/4", "g/4"], midi: [64, 67] },
      { keys: ["c/4", "c/5"], midi: [60, 72] },
    ],
  },
  {
    he: "אלכסונית",
    desc: "קול אחד נע והשני עומד במקומו.",
    chords: [
      { keys: ["c/4", "g/4"], midi: [60, 67] },
      { keys: ["e/4", "g/4"], midi: [64, 67] },
    ],
  },
] as const;

/* ---------------- species 2/3 fragments (over a sounding C in the bass) ---------------- */

const SPECIES2_NOTES: ScoreNote[] = [
  { keys: ["e/4"], duration: "h", midi: [64], mark: "3" },
  { keys: ["f/4"], duration: "h", midi: [65], mark: "P", kind: "active" },
  { keys: ["g/4"], duration: "w", midi: [67], mark: "5" },
];
const SPECIES2_SEQ: SeqEvent[] = [
  { midi: 48, time: 0, dur: 2, vel: 0.5 },
  { midi: 48, time: 2, dur: 2, vel: 0.5 },
  { midi: 64, time: 0, dur: 1, idx: 0 },
  { midi: 65, time: 1, dur: 1, idx: 1 },
  { midi: 67, time: 2, dur: 2, idx: 2 },
];

const SPECIES3_NOTES: ScoreNote[] = [
  { keys: ["e/4"], duration: "q", midi: [64], mark: "3" },
  { keys: ["f/4"], duration: "q", midi: [65], mark: "P", kind: "active" },
  { keys: ["g/4"], duration: "q", midi: [67], mark: "5" },
  { keys: ["a/4"], duration: "q", midi: [69], mark: "6" },
  { keys: ["g/4"], duration: "w", midi: [67], mark: "5" },
];
const SPECIES3_SEQ: SeqEvent[] = [
  { midi: 48, time: 0, dur: 2, vel: 0.5 },
  { midi: 48, time: 2, dur: 2, vel: 0.5 },
  ...[64, 65, 67, 69].map((m, i) => ({ midi: m, time: i * 0.5, dur: 0.5, idx: i })),
  { midi: 67, time: 2, dur: 2, idx: 4 },
];

/* species 4: the suspension — preparation, dissonance, resolution */
const SUSPENSION_NOTES: ScoreNote[] = [
  { keys: ["c/4", "c/5"], midi: [60, 72], mark: "8", sub: "הכנה", tie: true },
  { keys: ["g/3", "c/5"], midi: [55, 72], mark: "4", kind: "active", sub: "השהיה" },
  { keys: ["g/3", "b/4"], midi: [55, 71], mark: "3", kind: "stable", sub: "פתרון" },
  { keys: ["c/4", "c/5"], midi: [60, 72], mark: "8", sub: "סיום" },
];
const SUSPENSION_SEQ: SeqEvent[] = SUSPENSION_NOTES.map((n, i) => ({
  midi: n.midi,
  time: i * 1.1,
  dur: 1.15,
  idx: i,
}));

const SPECIES_TABS = [
  {
    he: "מין שני (2:1)",
    notes: SPECIES2_NOTES,
    seq: SPECIES2_SEQ,
    bpm: 76,
    note: "שני חצאים על כל תו של הקאנטוס. הפעמה החזקה חייבת קונסוננס; בחלשה מותר צליל מעבר דיסוננטי (P) — פה חולף בין מי לסול מעל הדו שבבס.",
  },
  {
    he: "מין שלישי (4:1)",
    notes: SPECIES3_NOTES,
    seq: SPECIES3_SEQ,
    bpm: 84,
    note: "ארבעה רבעים על כל תו. הקו זורם בצעדים, והדיסוננסים החולפים נבלעים בתנועה — כל עוד הם בין פעמות.",
  },
  {
    he: "מין רביעי — השהיות",
    notes: SUSPENSION_NOTES,
    seq: SUSPENSION_SEQ,
    bpm: 66,
    note: "הקול העליון 'מאחר': הוא מוחזק (קשת!) בזמן שהבס זז — נוצר דיסוננס על הפעמה החזקה — ואז נפתר צעד למטה. הכנה, השהיה, פתרון: זהו הדיסוננס המבוקר בהתגלמותו.",
  },
] as const;

/* ---------------- drills ---------------- */

const MOTION_POOL = [
  { desc: "שני הקולות עולים, ושומרים על אותו מרווח בדיוק", ans: "מקבילה" },
  { desc: "שני הקולות יורדים, אבל המרווח ביניהם משתנה", ans: "ישרה" },
  { desc: "קול אחד עולה והשני יורד", ans: "נגדית" },
  { desc: "קול אחד נע והשני נשאר במקומו", ans: "אלכסונית" },
] as const;

function motionQuestion(): Question {
  const q = pick(MOTION_POOL);
  return {
    prompt: <>{q.desc} — איזו תנועה זו?</>,
    options: shuffle(MOTION_POOL.map((m) => m.ans)),
    answer: q.ans,
    explain: <>תנועה נגדית ואלכסונית שומרות על עצמאות הקולות; מקבילה וישרה דורשות זהירות.</>,
  };
}

const SPECIES1_POOL = [
  { iv: "טרצה גדולה", ok: true },
  { iv: "סקסטה קטנה", ok: true },
  { iv: "קווינטה זכה", ok: true },
  { iv: "אוקטבה זכה", ok: true },
  { iv: "סקונדה גדולה", ok: false },
  { iv: "ספטימה קטנה", ok: false },
  { iv: "קוורטה זכה (מול הבס)", ok: false },
  { iv: "קוורטה מוגדלת", ok: false },
] as const;

function species1Question(): Question {
  const q = pick(SPECIES1_POOL);
  return {
    prompt: <>במין הראשון — האם מותר <b>{q.iv}</b> בין הקולות?</>,
    options: ["מותר", "אסור"],
    answer: q.ok ? "מותר" : "אסור",
    explain: <>המין הראשון מתיר קונסוננסים בלבד: פרימה, טרצות, קווינטה זכה, סקסטות ואוקטבה.</>,
  };
}

const PARALLEL_POOL = [
  { from: "קווינטה זכה", to: "קווינטה זכה", ok: false },
  { from: "אוקטבה", to: "אוקטבה", ok: false },
  { from: "טרצה גדולה", to: "טרצה קטנה", ok: true },
  { from: "סקסטה קטנה", to: "סקסטה גדולה", ok: true },
  { from: "קווינטה זכה", to: "סקסטה קטנה", ok: true },
  { from: "טרצה גדולה", to: "קווינטה זכה", ok: true },
] as const;

function parallelQuestion(): Question {
  const q = pick(PARALLEL_POOL);
  return {
    prompt: (
      <>
        שני הקולות נעים באותו כיוון: מ<b>{q.from}</b> אל <b>{q.to}</b>. מותר או אסור?
      </>
    ),
    options: ["מותר", "אסור"],
    answer: q.ok ? "מותר" : "אסור",
    explain: (
      <>
        האיסור חל על מקבילות של הקונסוננסים המושלמים — קווינטות ואוקטבות — כי הן ממוססות את עצמאות
        הקולות. טרצות וסקסטות מקבילות דווקא יפות.
      </>
    ),
  };
}

function suspensionQuestion(): Question {
  const answer = "הכנה — השהיה — פתרון";
  return {
    prompt: <>מהם שלושת שלבי ההשהיה (מין רביעי), לפי הסדר?</>,
    options: shuffle([
      answer,
      "השהיה — הכנה — פתרון",
      "פתרון — השהיה — הכנה",
      "הכנה — פתרון — השהיה",
    ]),
    answer,
    explain: (
      <>
        הדיסוננס מוכן כקונסוננס, מוחזק בזמן שהקול השני זז (ההשהיה), ונפתר בצעד יורד אל קונסוננס.
      </>
    ),
  };
}

/* ---------------- the lesson ---------------- */

export function Unit05() {
  const cfPlayer = usePlayer();
  const motionPlayer = usePlayer();
  const species1Player = usePlayer();
  const speciesPlayer = usePlayer();
  const [motionTab, setMotionTab] = useState(2); // default: contrary
  const [speciesTab, setSpeciesTab] = useState(0);

  const motion = MOTIONS[motionTab];
  const species = SPECIES_TABS[speciesTab];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 5</div>
        <h1>מבוא לקונטרפונקט</h1>
        <p className="lede">
          לפני שנחבר אקורד לאקורד, נלמד לחבר קול לקול. הקונטרפונקט — אמנות שילובם של קווים מלודיים
          עצמאיים — הוא חדר הכושר של הובלת הקולות, וכל מה שנתרגל בו יפעל בתוך כל אקורד שנכתוב בהמשך.
        </p>
      </header>

      <Section id="what" num="5.1" title="נקודה כנגד נקודה">
        <p>
          <Term he="קונטרפונקט" en="Counterpoint" def="שילוב של שני קווים מלודיים עצמאיים או יותר הנשמעים יחד. מלטינית punctus contra punctum — תו כנגד תו." /> הוא
          המלאכה של שני קווים שמתקיימים יחד: כל אחד מלודיה טובה בפני עצמו, ושניהם יוצרים יחד רצף מרווחים
          מבוקר. המסורת הלימודית — שיטת חמשת <b>המינים</b> של פוקס (1725), שבה למדו מוצרט, בטהובן וברהמס —
          מוסיפה קושי אחד בכל שלב: קודם רק קונסוננסים, אחר כך צלילי מעבר, ולבסוף הדיסוננס המושהה.
        </p>
        <Callout label="למה זה שייך לספר הרמוניה?" insight>
          כי אקורדים אינם לבנים מתות: כשארבעה קולות שרים I–V–I, כל קול הוא קו מלודי, וכללי הקונטרפונקט —
          עצמאות, צעדים, טיפול בדיסוננס — הם שהופכים רצף אקורדים למוזיקה. יחידה 6 תבנה על כל מה שכאן.
        </Callout>
      </Section>

      <Section id="cantus" num="5.2" title="קאנטוס פירמוס: המלודיה הנתונה">
        <p>
          מתרגלים תמיד מול <Term he="קאנטוס פירמוס" en="Cantus firmus" def="'לחן קבוע' — מלודיה נתונה בתווים שלמים שמעליה או מתחתיה כותבים את קול הקונטרפונקט." /> —
          לחן נתון בתווים שלמים. הנה הקאנטוס המפורסם של פוקס ברֶה, וכדאי לשים לב למה שעושה אותו טוב:
          תנועה בצעדים כמעט תמיד, שיא אחד (לָה), קפיצות מעטות שמתאזנות מיד בכיוון ההפוך, וסיום בירידת
          צעד אל צליל הפתיחה:
        </p>
        <Widget
          title="פוקס, Gradus ad Parnassum — קאנטוס פירמוס ברה"
          foot={
            <PlayButton
              label="נגנו את הקאנטוס"
              events={CF_MIDI.map((m, i) => ({ midi: m, time: i, dur: 1, idx: i }))}
              bpm={104}
              player={cfPlayer}
            />
          }
        >
          <Score notes={CF_NOTES} width={700} highlightIndex={cfPlayer.index} ariaLabel="הקאנטוס פירמוס של פוקס ברה" />
        </Widget>
      </Section>

      <Section id="motion" num="5.3" title="ארבע דרכים לנוע יחד">
        <p>
          כששני קולות נעים, היחס בין כיווניהם קובע כמה עצמאיים הם נשמעים. אלה ארבע התנועות — והעדפת
          ה<em className="hl">נגדית</em> היא אולי הכלל החשוב ביותר בכל הובלת קולות:
        </p>
        <Widget
          title="בחרו תנועה והקשיבו לשני הקולות"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {MOTIONS.map((m, i) => (
                  <button key={m.he} role="tab" aria-selected={motionTab === i} onClick={() => setMotionTab(i)}>
                    {m.he}
                  </button>
                ))}
              </div>
              <PlayButton
                label="נגנו את התנועה"
                events={motion.chords.map((c, i) => ({ midi: [...c.midi], time: i * 1.1, dur: 1.15, idx: i }))}
                bpm={80}
                player={motionPlayer}
              />
            </>
          }
        >
          <Score
            key={motion.he}
            notes={motion.chords.map((c) => ({ keys: [...c.keys], midi: [...c.midi] }))}
            width={280}
            highlightIndex={motionPlayer.index}
            ariaLabel={`תנועה ${motion.he} בין שני קולות`}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {motion.desc}
          </p>
        </Widget>
      </Section>

      <Section id="species1" num="5.4" title="המין הראשון: תו כנגד תו">
        <p>
          במין הראשון כותבים תו אחד מול כל תו של הקאנטוס, וכל המרווחים חייבים להיות{" "}
          <b>קונסוננסים</b>. הכללים המרכזיים: פתיחה וסיום בקונסוננס מושלם; העדפת טרצות וסקסטות באמצע
          (מושלמים רבים מדי נשמעים חלולים); שום מקבילות של קווינטות או אוקטבות; והרבה תנועה נגדית. הנה
          הפתרון של פוקס עצמו מעל הקאנטוס — המספרים מציינים את המרווח בכל נקודה:
        </p>
        <Widget
          title="מין ראשון מעל הקאנטוס (פוקס) — לחצו על כל צמד"
          foot={
            <>
              <PlayButton label="נגנו את שני הקולות" events={SPECIES1_BOTH} bpm={72} player={species1Player} />
              <PlayButton
                label="הקול העליון בלבד"
                ghost
                events={CP_MIDI.map((m, i) => ({ midi: m, time: i, dur: 1, idx: i }))}
                bpm={72}
                player={species1Player}
              />
            </>
          }
        >
          <Score notes={SPECIES1_NOTES} width={720} highlightIndex={species1Player.index} ariaLabel="קונטרפונקט מין ראשון של פוקס מעל הקאנטוס" />
        </Widget>
        <p>
          שימו לב לסיום: סקסטה גדולה (עם דו♯ — צליל מוביל מושאל) שנפתחת בתנועה נגדית אל האוקטבה. נוסחת
          הסיום הזאת — <span dir="ltr">6→8</span> — היא סבתא של כל הקדנצות שנפגוש.
        </p>
      </Section>

      <Section id="species" num="5.5" title="המינים הבאים: תנועה, ריצה והשהיה">
        <p>
          מכאן ואילך כל מין משחרר עוד קושי. המין השני מציב שני תווים מול כל תו ומכניס לראשונה{" "}
          <b>דיסוננס חולף</b> בפעמה החלשה; השלישי מריץ ארבעה; והרביעי — החשוב מכולם להרמוניה — מלמד את
          ה<Term he="השהיה" en="Suspension" def="דיסוננס שנוצר כשקול מוחזק בזמן שהקול השני זז, ונפתר בצעד יורד: הכנה — השהיה — פתרון." />,
          שבה הדיסוננס נוצר דווקא על הפעמה החזקה ונפתר בצעד. המין החמישי משלב את הכול לקו פורח:
        </p>
        <Widget
          title="בחרו מין — הקטעים נשמעים מעל דו בבס"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {SPECIES_TABS.map((s, i) => (
                  <button key={s.he} role="tab" aria-selected={speciesTab === i} onClick={() => setSpeciesTab(i)}>
                    {s.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את הקטע" events={[...species.seq]} bpm={species.bpm} player={speciesPlayer} />
            </>
          }
        >
          <Score
            key={species.he}
            notes={[...species.notes]}
            width={420}
            highlightIndex={speciesPlayer.index}
            ariaLabel={species.he}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {species.note}
          </p>
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          חמשת המינים הם בעצם קטלוג של <b>כל דרכי הטיפול בדיסוננס</b>: אין בכלל (מין 1), חולף בפעמה חלשה
          (2–3), מושהה ונפתר (4). כשנפגוש צלילי מעבר, שכנים והשהיות בתוך אקורדים — אלה בדיוק אותם
          מנגנונים.
        </Callout>
      </Section>

      <Section id="review" num="5.6" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>קונטרפונקט</b>קווים עצמאיים הנשמעים יחד; תו כנגד תו.</div>
          <div className="review-chip"><b>קאנטוס פירמוס</b>לחן נתון: צעדים, שיא אחד, קפיצות מאוזנות.</div>
          <div className="review-chip"><b>ארבע תנועות</b>מקבילה, ישרה, נגדית (המועדפת), אלכסונית.</div>
          <div className="review-chip"><b>מין ראשון</b>קונסוננסים בלבד; פתיחה וסיום מושלמים.</div>
          <div className="review-chip"><b>מקבילות אסורות</b>קווינטות ואוקטבות — לעולם לא ברצף.</div>
          <div className="review-chip"><b>מין שני ושלישי</b>דיסוננס רק כצליל מעבר בפעמה חלשה.</div>
          <div className="review-chip"><b>מין רביעי</b>השהיה: הכנה — דיסוננס מוטעם — פתרון בצעד יורד.</div>
          <div className="review-chip"><b>מין חמישי</b>שילוב חופשי של כל האמצעים — קו פורח.</div>
        </div>
      </Section>

      <Section id="drills" num="5.7" title="תרגול — עד שזה אוטומטי">
        <Drill title="זיהוי סוג התנועה" generate={motionQuestion} />
        <Drill title="מותר במין הראשון?" generate={species1Question} />
        <Drill title="מקבילות — מותר או אסור?" generate={parallelQuestion} />
        <Drill title="שלבי ההשהיה" generate={suspensionQuestion} />
      </Section>

      <NextUnit current={5}>
        <b>הבא בתור — יחידה 6: כתיבה בארבעה קולות.</b> הקונטרפונקט פוגש את האקורדים: מקהלת סופרן–אלט–טנור–בס,
        טווחים ומרווחים, הכפלות, והחוקים שהופכים רצף אקורדים להובלת קולות.
      </NextUnit>
    </div>
  );
}
