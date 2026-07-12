import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { NextUnit } from "../../components/NextUnit";
import { Satb, SatbScores, chordSeq } from "../../components/Satb";
import { SeqEvent } from "../../engine/audio";

/* ---------------- the two chords, side by side ---------------- */

const I_V_NOTES: ScoreNote[] = [
  { keys: ["c/4", "e/4", "g/4"], midi: [60, 64, 67], mark: "I", kind: "stable", sub: "1 · 3 · 5" },
  { keys: ["g/3", "b/3", "d/4"], midi: [55, 59, 62], mark: "V", kind: "active", sub: "5 · 7 · 2" },
  { keys: ["g/3", "b/3", "d/4", "f/4"], midi: [55, 59, 62, 65], mark: "V7", kind: "active", sub: "5 · 7 · 2 · 4" },
];

/* ---------------- I–V–I in four voices ---------------- */

const I_CHORD: Satb = { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] };
const V_CHORD: Satb = { s: ["b/4", 71], a: ["d/4", 62], t: ["g/3", 55], b: ["g/2", 43] };
const IVI: Satb[] = [I_CHORD, V_CHORD, I_CHORD];

/* ---------------- V7: complete vs incomplete ---------------- */

const V7_FORMS = [
  {
    he: "V7 שלם ← I חסר",
    chords: [
      I_CHORD,
      { s: ["d/5", 74], a: ["f/4", 65], t: ["b/3", 59], b: ["g/2", 43] },
      { s: ["c/5", 72], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
    ] as Satb[],
    marks: ["I", "V7", "I"],
    note: "כשה־V7 שלם (כל ארבעת הצלילים), הפתרונות המחויבים - סי מעלה, פה מטה - משאירים את אקורד הטוניקה בלי קווינטה: שלושה שורשים וטרצה. זה המחיר, והוא מקובל לגמרי.",
  },
  {
    he: "V7 חסר ← I שלם",
    chords: [
      I_CHORD,
      { s: ["b/4", 71], a: ["f/4", 65], t: ["g/3", 55], b: ["g/2", 43] },
      I_CHORD,
    ] as Satb[],
    marks: ["I", "V7", "I"],
    note: "משמיטים את הקווינטה (רה) ומכפילים את היסוד - וכל הפתרונות מתקיימים בלי לוותר על אקורד טוניקה מלא. שתי הדרכים תקינות; בוחרים לפי מה שחשוב יותר באותו רגע.",
  },
] as const;

/* ---------------- the first cadences ---------------- */

const CADENCES = [
  {
    he: "אותנטית שלמה",
    en: "PAC",
    chords: [
      I_CHORD,
      { s: ["d/5", 74], a: ["f/4", 65], t: ["b/3", 59], b: ["g/2", 43] },
      { s: ["c/5", 72], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
    ] as Satb[],
    marks: ["I", "V7", "I"],
    note: "‏V (או V7) במצב יסודי נפתר אל I, והסופרן נוחת על הטוניקה. הסיום החזק והסופי ביותר - הנקודה של המשפט המוזיקלי.",
  },
  {
    he: "אותנטית לא שלמה",
    en: "IAC",
    chords: [
      { s: ["g/4", 67], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
      { s: ["g/4", 67], a: ["d/4", 62], t: ["b/3", 59], b: ["g/2", 43] },
      { s: ["g/4", 67], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
    ] as Satb[],
    marks: ["I", "V", "I"],
    note: "אותו מהלך, אבל הסופרן מסיים על 3 או על 5 במקום על הטוניקה. סגירה אמיתית - אך רכה יותר, כמו פסיק־וחצי.",
  },
  {
    he: "חצי קדנצה",
    en: "HC",
    chords: [I_CHORD, V_CHORD] as Satb[],
    marks: ["I", "V"],
    note: "המשפט נעצר על V עצמו - סימן שאלה מוזיקלי. המתח לא נפתר, והאוזן מחכה להמשך. כך בנויים אינספור משפטים ראשונים בזוגות שאלה–תשובה.",
  },
] as const;

/* ---------------- soprano patterns over I–V–I ---------------- */

const PATTERNS = [
  {
    he: "3–2–1",
    melody: [
      { keys: ["e/5"], midi: [76], degree: "3", kind: "stable" as const },
      { keys: ["d/5"], midi: [74], degree: "2", kind: "active" as const },
      { keys: ["c/5"], midi: [72], degree: "1", kind: "stable" as const },
    ],
    chords: [[48, 55, 64], [43, 55, 62], [48, 55, 64]],
    note: "הירידה הקלאסית אל הטוניקה: 2 שייכת ל־V ומתווכת בין 3 ל־1.",
  },
  {
    he: "8–7–8",
    melody: [
      { keys: ["c/5"], midi: [72], degree: "8", kind: "stable" as const },
      { keys: ["b/4"], midi: [71], degree: "7", kind: "active" as const },
      { keys: ["c/5"], midi: [72], degree: "8", kind: "stable" as const },
    ],
    chords: [[48, 55, 64], [43, 55, 62], [48, 55, 64]],
    note: "הצליל המוביל כשכן תחתון: יוצא מהטוניקה וחוזר אליה, בדחיפות של חצי הטון.",
  },
  {
    he: "5–4–3",
    melody: [
      { keys: ["g/4"], midi: [67], degree: "5", kind: "stable" as const },
      { keys: ["f/4"], midi: [65], degree: "4", kind: "active" as const },
      { keys: ["e/4"], midi: [64], degree: "3", kind: "stable" as const },
    ],
    chords: [[48, 55, 64], [43, 55, 59, 62], [48, 55, 64]],
    note: "כאן ה־4 היא הספטימה של V7 - דיסוננס שיורד בצעד אל 3, בדיוק כמו השהיה מהקונטרפונקט.",
  },
] as const;

const patternSeq = (p: (typeof PATTERNS)[number]): SeqEvent[] => [
  ...p.chords.map((c, i) => ({ midi: [...c], time: i * 1.3, dur: 1.35, vel: 0.45 })),
  ...p.melody.map((m, i) => ({ midi: m.midi[0], time: i * 1.3, dur: 1.35, idx: i })),
];

/* ---------------- i–V–i in minor ---------------- */

const MINOR_IVI: Satb[] = [
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
  { s: ["g#/4", 68], a: ["b/3", 59], t: ["e/3", 52], b: ["e/2", 40] },
  { s: ["a/4", 69], a: ["c/4", 60], t: ["e/3", 52], b: ["a/2", 45] },
];

/* ---------------- drills ---------------- */

const CHORD_TONES = [
  { chord: "I", tones: "1, 3, 5" },
  { chord: "V", tones: "5, 7, 2" },
  { chord: "V7", tones: "5, 7, 2, 4" },
] as const;

function chordToneQuestion(): Question {
  const q = pick(CHORD_TONES);
  const wrong = ["1, 4, 6", ...CHORD_TONES.filter((c) => c.chord !== q.chord).map((c) => c.tones)];
  return {
    prompt: (
      <>
        אילו דרגות בונות את <span dir="ltr">{q.chord}</span>?
      </>
    ),
    options: shuffle([q.tones, ...wrong]),
    answer: q.tones,
    explain: (
      <>
        ‏I: טוניקה, מדיאנטה, דומיננטה. ‏V: דומיננטה, צליל מוביל, סופרטוניקה. ‏V7 מוסיף את הסובדומיננטה -
        וכך שני האקורדים יחד מכסים שש משבע הדרגות.
      </>
    ),
  };
}

const CADENCE_POOL = [
  { desc: "‏V7 ← I, והסופרן מסיים על הטוניקה", ans: "אותנטית שלמה" },
  { desc: "‏V ← I, והסופרן מסיים על 3 או על 5", ans: "אותנטית לא שלמה" },
  { desc: "המשפט נעצר על V בלי פתרון", ans: "חצי קדנצה" },
] as const;

function cadenceQuestion(): Question {
  const q = pick(CADENCE_POOL);
  return {
    prompt: <>{q.desc} - איזו קדנצה זו?</>,
    options: shuffle([...CADENCE_POOL.map((c) => c.ans), "קדנצה נמנעת"]),
    answer: q.ans,
    explain: <>קדנצה נמנעת (V ← VI) תגיע ביחידה 12 - הפתעה שדוחה את הפתרון.</>,
  };
}

const RESOLUTION_POOL: Question[] = [
  {
    prompt: <>בדו מז'ור, לאן הולך סי (הצליל המוביל) בפתרון V7 ← I?</>,
    options: ["מעלה אל דו", "מטה אל לה", "נשאר במקום", "קפיצה אל סול"],
    answer: "מעלה אל דו",
    explain: <>חצי הטון שמתחת לטוניקה מושך מעלה - תמיד, כשהוא בקול חיצוני.</>,
  },
  {
    prompt: <>בדו מז'ור, לאן הולכת פה (הספטימה של V7) בפתרון אל I?</>,
    options: ["מטה אל מי", "מעלה אל סול", "נשארת במקום", "קפיצה אל דו"],
    answer: "מטה אל מי",
    explain: <>הספטימה היא דיסוננס - והיא יורדת בצעד, כמו השהיה מהמין הרביעי.</>,
  },
  {
    prompt: <>איזה צליל משותף ל־I ול־V בדו מז'ור?</>,
    options: ["סול", "דו", "מי", "סי"],
    answer: "סול",
    explain: <>הדרגה החמישית היא הקווינטה של I והיסוד של V - עוגן נוח לקול פנימי.</>,
  },
  {
    prompt: <>מה משמיטים בדרך כלל ב־V7 לא שלם?</>,
    options: ["את הקווינטה", "את היסוד", "את הטרצה", "את הספטימה"],
    answer: "את הקווינטה",
    explain: <>הקווינטה אינה מגדירה את האקורד; היסוד, הטרצה (צליל מוביל) והספטימה - חיוניים.</>,
  },
];

function resolutionQuestion(): Question {
  return pick(RESOLUTION_POOL);
}

const MINOR_POOL: Question[] = [
  {
    prompt: <>מה נדרש כדי לקבל V מז'ורי במינור?</>,
    options: ["להגביה את הדרגה השביעית", "להנמיך את השלישית", "להגביה את השישית", "שום דבר"],
    answer: "להגביה את הדרגה השביעית",
    explain: <>המינור הטבעי חסר צליל מוביל; ההגבהה (המינור ההרמוני) מחזירה ל־V את כוח המשיכה שלו.</>,
  },
  {
    prompt: <>בלה מינור, מהו הצליל המוביל שבתוך V?</>,
    options: ["סול דיאז", "סול", "פה דיאז", "דו דיאז"],
    answer: "סול דיאז",
    explain: <>סול המוגבה יושב חצי טון מתחת ללה - ונפתר אליו, בדיוק כמו סי אל דו במז'ור.</>,
  },
];

function minorQuestion(): Question {
  return pick(MINOR_POOL);
}

/* ---------------- the lesson ---------------- */

export function Unit07() {
  const ivPlayer = usePlayer();
  const iviPlayer = usePlayer();
  const v7Player = usePlayer();
  const cadPlayer = usePlayer();
  const patPlayer = usePlayer();
  const minorPlayer = usePlayer();
  const [v7Tab, setV7Tab] = useState(0);
  const [cadTab, setCadTab] = useState(0);
  const [patTab, setPatTab] = useState(0);

  const v7Form = V7_FORMS[v7Tab];
  const cadence = CADENCES[cadTab];
  const pattern = PATTERNS[patTab];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 7 · חלק שני</div>
        <h1>הטוניקה והדומיננטה: I, V ו־V7</h1>
        <p className="lede">
          מכאן מתחיל הדקדוק ההרמוני עצמו. שני אקורדים - הטוניקה והדומיננטה - מספיקים כדי להגדיר סולם,
          לבנות משפט ולסגור אותו. כל השאר, יחידות שלמות קדימה, יהיה הרחבה של הציר הזה.
        </p>
      </header>

      <Section id="axis" num="7.1" title="שני אקורדים שמגדירים סולם">
        <p>
          משולש הטוניקה מכיל את היציבוֹת - <Deg n="1" kind="stable" />, <Deg n="3" kind="stable" />,{" "}
          <Deg n="5" kind="stable" /> - ומשולש הדומיננטה אוסף את הפעילוֹת: <Deg n="5" kind="stable" />,{" "}
          <Deg n="7" kind="active" />, <Deg n="2" kind="active" />. הוספת הספטימה ל־V מצרפת גם את{" "}
          <Deg n="4" kind="active" /> - וכך <span dir="ltr">V7</span> מחזיק בתוכו את הטריטון, ששני צליליו
          מצביעים היישר אל צלילי הטוניקה. שני האקורדים יחד מכסים שש משבע דרגות הסולם:
        </p>
        <Widget
          title="הטוניקה, הדומיננטה, והדומיננטה עם ספטימה - לחצו והשוו"
          legend={
            <>
              <span><span className="dot stable" />יציבות</span>
              <span><span className="dot active" />מתח</span>
            </>
          }
          foot={
            <PlayButton
              label="נגנו את השלושה"
              events={I_V_NOTES.map((n, i) => ({ midi: n.midi, time: i * 1.2, dur: 1.25, idx: i }))}
              bpm={80}
              player={ivPlayer}
            />
          }
        >
          <Score notes={I_V_NOTES} width={360} highlightIndex={ivPlayer.index} ariaLabel="אקורדי הטוניקה והדומיננטה ודרגותיהם" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          ‏I ↔ V איננו סתם "מעבר בין אקורדים": זה מנגנון של יציאה מהבית ושיבה אליו. V אוגר את כל המשיכות
          של הסולם, ו־I מקבל אותן. לכן מהלך I–V–I לבדו כבר נשמע כמו מוזיקה - והוא היחידה התחבירית
          הקטנה ביותר של הטונאליות.
        </Callout>
      </Section>

      <Section id="connect" num="7.2" title="לחבר I–V–I בארבעה קולות">
        <p>
          החיבור החלק ביותר נשען על שני עקרונות מיחידה 6: <b>הצליל המשותף</b> - <Deg n="5" kind="stable" /> שייך לשני
          האקורדים ויכול פשוט להישאר במקומו - ו<b>תנועת צעד</b> בכל שאר הקולות. שימו לב לטנור שאינו זז,
          ולסופרן ולאלט שנעים צעד אחד בלבד לכל כיוון:
        </p>
        <Widget
          title="‏I–V–I בדו מז'ור - הטנור מחזיק את הצליל המשותף"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(IVI, 1.5)} bpm={72} player={iviPlayer} />}
        >
          <SatbScores chords={IVI} marks={["I", "V", "I"]} highlight={iviPlayer.index} width={320} label="מהלך I–V–I" />
        </Widget>
      </Section>

      <Section id="v7" num="7.3" title="מוסיפים ספטימה: שלם מול חסר">
        <p>
          כשמצרפים ל־V את הספטימה נכנסות לתוקף שתי חובות בבת אחת: הצליל המוביל עולה, הספטימה יורדת. אבל
          בארבעה קולות נוצרת דילמה חשבונאית - אם מקיימים את שתי החובות מתוך V7 שלם, לטוניקה לא נשארת
          קווינטה. שני הפתרונות המקובלים:
        </p>
        <Widget
          title="שתי דרכים לנגן V7 ← I - בחרו והשוו"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {V7_FORMS.map((f, i) => (
                  <button key={f.he} role="tab" aria-selected={v7Tab === i} onClick={() => setV7Tab(i)}>
                    {f.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את המהלך" events={chordSeq([...v7Form.chords], 1.5)} bpm={72} player={v7Player} />
            </>
          }
        >
          <SatbScores
            key={v7Form.he}
            chords={[...v7Form.chords]}
            marks={[...v7Form.marks]}
            highlight={v7Player.index}
            width={320}
            label={v7Form.he}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {v7Form.note}
          </p>
        </Widget>
      </Section>

      <Section id="cadences" num="7.4" title="הקדנצות הראשונות">
        <p>
          <Term he="קדנצה" en="Cadence" def="נוסחת סיום של משפט מוזיקלי. סוג הקדנצה קובע כמה סופית נשמעת הסגירה - מנקודה ועד סימן שאלה." /> היא
          סימן הפיסוק של המוזיקה, וכל סוגיה בנויים מהציר שלנו. שלוש הראשונות שכל מוזיקאי מזהה באוזן:
        </p>
        <Widget
          title="שלוש קדנצות - בחרו והקשיבו לרמת הסגירה"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {CADENCES.map((c, i) => (
                  <button key={c.en} role="tab" aria-selected={cadTab === i} onClick={() => setCadTab(i)}>
                    {c.he}
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את הקדנצה" events={chordSeq([...cadence.chords], 1.5)} bpm={72} player={cadPlayer} />
            </>
          }
        >
          <SatbScores
            key={cadence.en}
            chords={[...cadence.chords]}
            marks={[...cadence.marks]}
            highlight={cadPlayer.index}
            width={320}
            label={`קדנצה ${cadence.he}`}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            <b>{cadence.he}</b> <span dir="ltr">({cadence.en})</span> - {cadence.note}
          </p>
        </Widget>
      </Section>

      <Section id="patterns" num="7.5" title="תבניות הסופרן: המלודיה שמעל הציר">
        <p>
          מעל I–V–I הסופרן אינו חופשי לגמרי - הוא נע בתבניות אופייניות שממלאות את חובות הפתרון. שלוש
          הבסיסיות שוות שינון, כי הן שלד של אינספור מנגינות:
        </p>
        <Widget
          title="בחרו תבנית - המספרים הם דרגות הסופרן, הליווי I–V–I"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {PATTERNS.map((p, i) => (
                  <button key={p.he} role="tab" aria-selected={patTab === i} onClick={() => setPatTab(i)}>
                    <span dir="ltr">{p.he}</span>
                  </button>
                ))}
              </div>
              <PlayButton label="נגנו את התבנית" events={patternSeq(pattern)} bpm={66} player={patPlayer} />
            </>
          }
        >
          <Score
            key={pattern.he}
            notes={pattern.melody.map((m) => ({ ...m, keys: [...m.keys], midi: [...m.midi] }))}
            width={300}
            highlightIndex={patPlayer.index}
            ariaLabel={`תבנית סופרן ${pattern.he}`}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {pattern.note}
          </p>
        </Widget>
      </Section>

      <Section id="minor" num="7.6" title="ובמינור? מגביהים את 7">
        <p>
          במינור הטבעי V הוא משולש מינורי - בלי צליל מוביל, בלי דחיפות. לכן בהרמוניה המעשית{" "}
          <em className="hl">תמיד</em> מגביהים את <Deg n="7" kind="active" /> בתוך הדומיננטה: בלה מינור, סול הופך
          לסול♯ הנפתר אל לה. ההגבהה נרשמת כסימן מזדמן - סימן ההיתק נשאר של המינור הטבעי, בדיוק כפי
          שלמדנו ביחידה 1:
        </p>
        <Widget
          title="‏i–V–i בלה מינור - שימו לב לסול הדיאז"
          foot={<PlayButton label="נגנו את המהלך" events={chordSeq(MINOR_IVI, 1.5)} bpm={72} player={minorPlayer} />}
        >
          <SatbScores
            chords={MINOR_IVI}
            marks={["i", "V", "i"]}
            highlight={minorPlayer.index}
            width={320}
            label="מהלך i–V–i בלה מינור"
            accidentalKey="Am"
          />
        </Widget>
      </Section>

      <Section id="review" num="7.7" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>הציר</b>‏I אוסף את היציבות, V את המשיכות; יחד - שש משבע דרגות.</div>
          <div className="review-chip"><b>חיבור חלק</b>צליל משותף (5) נשאר; שאר הקולות בצעדים.</div>
          <div className="review-chip"><b>חובות V7</b>צליל מוביל ↑ לטוניקה; ספטימה ↓ בצעד.</div>
          <div className="review-chip"><b>שלם / חסר</b>‏V7 שלם ← I בלי קווינטה; V7 בלי קווינטה ← I שלם.</div>
          <div className="review-chip"><b>אותנטית שלמה</b>‏V(7) ← I, סופרן על הטוניקה - נקודה.</div>
          <div className="review-chip"><b>אותנטית לא שלמה</b>סופרן על 3 או 5 - סגירה רכה.</div>
          <div className="review-chip"><b>חצי קדנצה</b>עצירה על V - סימן שאלה.</div>
          <div className="review-chip"><b>במינור</b>מגביהים את 7 בתוך V; ההגבהה - סימן מזדמן.</div>
        </div>
      </Section>

      <Section id="drills" num="7.8" title="תרגול - עד שזה אוטומטי">
        <Drill title="צלילי האקורדים" generate={chordToneQuestion} />
        <Drill title="זיהוי הקדנצה" generate={cadenceQuestion} />
        <Drill title="חובות הפתרון" generate={resolutionQuestion} />
        <Drill title="הדומיננטה במינור" generate={minorQuestion} />
      </Section>

      <NextUnit current={7}>
        <b>הבא בתור - יחידה 8: סקסט־אקורדים.</b> ‏I6, V6 ו־VII6 משחררים את קו הבס: איך היפוכים ראשונים
        הופכים את הציר I–V–I ממהלך קפיצות לקו זורם.
      </NextUnit>
    </div>
  );
}
