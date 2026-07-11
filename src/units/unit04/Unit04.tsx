import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { SeqEvent } from "../../engine/audio";

/* ---------------- triad qualities on C ---------------- */

const TRIAD_QUALITIES = [
  {
    he: "מז'ורי",
    keys: ["c/4", "e/4", "g/4"],
    midi: [60, 64, 67],
    build: "טרצה גדולה למטה, קטנה מעליה",
    fifth: "קווינטה זכה — קונסוננטי, בהיר",
  },
  {
    he: "מינורי",
    keys: ["c/4", "eb/4", "g/4"],
    midi: [60, 63, 67],
    build: "טרצה קטנה למטה, גדולה מעליה",
    fifth: "קווינטה זכה — קונסוננטי, כהה",
  },
  {
    he: "מוקטן",
    keys: ["c/4", "eb/4", "gb/4"],
    midi: [60, 63, 66],
    build: "שתי טרצות קטנות",
    fifth: "קווינטה מוקטנת — דיסוננטי, דחוס",
  },
  {
    he: "מוגדל",
    keys: ["c/4", "e/4", "g#/4"],
    midi: [60, 64, 68],
    build: "שתי טרצות גדולות",
    fifth: "קווינטה מוגדלת — דיסוננטי, מרחף",
  },
] as const;

/* ---------------- triads on the scale degrees ---------------- */

const MAJOR_TRIADS: ScoreNote[] = [
  { keys: ["c/4", "e/4", "g/4"], midi: [60, 64, 67], mark: "I", sub: "מז'ורי" },
  { keys: ["d/4", "f/4", "a/4"], midi: [62, 65, 69], mark: "ii", sub: "מינורי" },
  { keys: ["e/4", "g/4", "b/4"], midi: [64, 67, 71], mark: "iii", sub: "מינורי" },
  { keys: ["f/4", "a/4", "c/5"], midi: [65, 69, 72], mark: "IV", sub: "מז'ורי" },
  { keys: ["g/4", "b/4", "d/5"], midi: [67, 71, 74], mark: "V", sub: "מז'ורי" },
  { keys: ["a/4", "c/5", "e/5"], midi: [69, 72, 76], mark: "vi", sub: "מינורי" },
  { keys: ["b/4", "d/5", "f/5"], midi: [71, 74, 77], mark: "vii°", sub: "מוקטן" },
];

const MINOR_TRIADS: ScoreNote[] = [
  { keys: ["a/3", "c/4", "e/4"], midi: [57, 60, 64], mark: "i", sub: "מינורי" },
  { keys: ["b/3", "d/4", "f/4"], midi: [59, 62, 65], mark: "ii°", sub: "מוקטן" },
  { keys: ["c/4", "e/4", "g/4"], midi: [60, 64, 67], mark: "III", sub: "מז'ורי" },
  { keys: ["d/4", "f/4", "a/4"], midi: [62, 65, 69], mark: "iv", sub: "מינורי" },
  { keys: ["e/4", "g/4", "b/4"], midi: [64, 67, 71], mark: "v", sub: "מינורי" },
  { keys: ["f/4", "a/4", "c/5"], midi: [65, 69, 72], mark: "VI", sub: "מז'ורי" },
  { keys: ["g/4", "b/4", "d/5"], midi: [67, 71, 74], mark: "VII", sub: "מז'ורי" },
];

const DEGREE_TRIAD_SETS = [
  { he: "דו מז'ור", notes: MAJOR_TRIADS, accidentalKey: "C" },
  { he: "לה מינור (טבעי)", notes: MINOR_TRIADS, accidentalKey: "Am" },
] as const;

/* ---------------- inversions of the C triad ---------------- */

const INVERSIONS: ScoreNote[] = [
  { keys: ["c/4", "e/4", "g/4"], midi: [60, 64, 67], sub: "מצב יסודי · 5/3" },
  { keys: ["e/4", "g/4", "c/5"], midi: [64, 67, 72], sub: "היפוך ראשון · 6" },
  { keys: ["g/4", "c/5", "e/5"], midi: [67, 72, 76], sub: "היפוך שני · 6/4" },
];

/* ---------------- seventh-chord qualities on C ---------------- */

const SEVENTH_QUALITIES = [
  {
    he: "דומיננטי",
    en: "Mm7",
    keys: ["c/4", "e/4", "g/4", "bb/4"],
    midi: [60, 64, 67, 70],
    note: "משולש מז'ורי + ספטימה קטנה. הספטאקורד החשוב מכולם — נפגוש אותו על הדומיננטה.",
  },
  {
    he: "מינורי",
    en: "mm7",
    keys: ["c/4", "eb/4", "g/4", "bb/4"],
    midi: [60, 63, 67, 70],
    note: "משולש מינורי + ספטימה קטנה. רך יחסית; נפוץ על ii במז'ור.",
  },
  {
    he: "מז'ורי גדול",
    en: "MM7",
    keys: ["c/4", "e/4", "g/4", "b/4"],
    midi: [60, 64, 67, 71],
    note: "משולש מז'ורי + ספטימה גדולה. צליל 'פתוח' המוכר מהג'אז; בסגנון הקלאסי נדיר כאקורד עצמאי.",
  },
  {
    he: "חצי מוקטן",
    en: "ø7",
    keys: ["c/4", "eb/4", "gb/4", "bb/4"],
    midi: [60, 63, 66, 70],
    note: "משולש מוקטן + ספטימה קטנה. נבנה על vii במז'ור ועל ii במינור.",
  },
  {
    he: "מוקטן",
    en: "°7",
    keys: ["c/4", "eb/4", "gb/4", "bbb/4"],
    midi: [60, 63, 66, 69],
    note: "משולש מוקטן + ספטימה מוקטנת — כולו טרצות קטנות. המתוח מכולם; יליד המינור ההרמוני.",
  },
] as const;

/* ---------------- V7 in C and its inversions ---------------- */

const V7_INVERSIONS: ScoreNote[] = [
  { keys: ["g/3", "b/3", "d/4", "f/4"], midi: [55, 59, 62, 65], sub: "מצב יסודי · 7" },
  { keys: ["b/3", "d/4", "f/4", "g/4"], midi: [59, 62, 65, 67], sub: "היפוך ראשון · 6/5" },
  { keys: ["d/4", "f/4", "g/4", "b/4"], midi: [62, 65, 67, 71], sub: "היפוך שני · 4/3" },
  { keys: ["f/4", "g/4", "b/4", "d/5"], midi: [65, 67, 71, 74], sub: "היפוך שלישי · 4/2" },
];

const CADENCE_SEQ: SeqEvent[] = [
  { midi: [55, 59, 62, 65], time: 0, dur: 1.6, idx: 0 },
  { midi: [48, 60, 64, 72], time: 1.6, dur: 2.8, idx: 1 },
];
const CADENCE_NOTES: ScoreNote[] = [
  { keys: ["g/3", "b/3", "d/4", "f/4"], midi: [55, 59, 62, 65], kind: "active", mark: "V7" },
  { keys: ["c/3", "c/4", "e/4", "c/5"], midi: [48, 60, 64, 72], kind: "stable", mark: "I" },
];

/* ---------------- drills ---------------- */

function triadQualityQuestion(): Question {
  const q = pick(TRIAD_QUALITIES);
  return {
    prompt: <>משולש הבנוי מ<b>{q.build}</b> — מהי איכותו?</>,
    options: shuffle(TRIAD_QUALITIES.map((t) => t.he)),
    answer: q.he,
    explain: <>{q.fifth}. הטרצה התחתונה קובעת מז'ורי/מינורי; הקווינטה מפרידה בין היציבים לדיסוננטיים.</>,
  };
}

const MAJOR_DEGREE_QUALITIES = ["מז'ורי", "מינורי", "מינורי", "מז'ורי", "מז'ורי", "מינורי", "מוקטן"] as const;
const ROMAN_MAJOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"] as const;

function degreeTriadQuestion(): Question {
  const d = Math.floor(Math.random() * 7);
  const answer = MAJOR_DEGREE_QUALITIES[d];
  return {
    prompt: (
      <>
        בסולם מז'ור, מהי איכות המשולש הנבנה על הדרגה <Deg n={d + 1} />?
      </>
    ),
    options: shuffle(["מז'ורי", "מינורי", "מוקטן", "מוגדל"]),
    answer,
    explain: (
      <>
        הסימון הרומי: <span dir="ltr">{ROMAN_MAJOR[d]}</span>. במז'ור — מז'וריים על 1, 4, 5; מינוריים על
        2, 3, 6; מוקטן על 7.
      </>
    ),
  };
}

const TRIAD_POSITIONS = [
  { member: "היסוד", answer: "מצב יסודי (5/3)" },
  { member: "הטרצה", answer: "היפוך ראשון (6)" },
  { member: "הקווינטה", answer: "היפוך שני (6/4)" },
] as const;

function inversionQuestion(): Question {
  const q = pick(TRIAD_POSITIONS);
  return {
    prompt: <>במשולש, כאשר <b>{q.member}</b> בבס — מהו מצב האקורד?</>,
    options: shuffle([...TRIAD_POSITIONS.map((p) => p.answer), "היפוך שלישי (4/2)"]),
    answer: q.answer,
    explain: <>היפוך שלישי קיים רק בספטאקורד — כשהספטימה בבס. הספרות מציינות מרווחים מעל הבס.</>,
  };
}

const SEVENTH_POSITIONS = [
  { member: "היסוד", fig: "7" },
  { member: "הטרצה", fig: "6/5" },
  { member: "הקווינטה", fig: "4/3" },
  { member: "הספטימה", fig: "4/2" },
] as const;

function seventhFigureQuestion(): Question {
  const q = pick(SEVENTH_POSITIONS);
  return {
    prompt: <>בספטאקורד, כאשר <b>{q.member}</b> בבס — מהו הספרור?</>,
    options: shuffle(SEVENTH_POSITIONS.map((p) => p.fig)),
    answer: q.fig,
    explain: <>סדרת הזיכרון: 7 — 6/5 — 4/3 — 4/2, מהמצב היסודי להיפוך השלישי.</>,
  };
}

/* ---------------- the lesson ---------------- */

export function Unit04() {
  const buildPlayer = usePlayer();
  const qualityPlayer = usePlayer();
  const degreesPlayer = usePlayer();
  const invPlayer = usePlayer();
  const seventhPlayer = usePlayer();
  const v7Player = usePlayer();
  const cadencePlayer = usePlayer();
  const [qualTab, setQualTab] = useState(0);
  const [setTab, setSetTab] = useState(0);
  const [sevTab, setSevTab] = useState(0);

  const quality = TRIAD_QUALITIES[qualTab];
  const triadSet = DEGREE_TRIAD_SETS[setTab];
  const seventh = SEVENTH_QUALITIES[sevTab];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 4</div>
        <h1>משולשים וספטאקורדים</h1>
        <p className="lede">
          מרווחים היו זוגות; עכשיו נערום אותם. המשולש — שלושה צלילים בטרצות — הוא אבן הבניין של כל
          ההרמוניה הטונאלית, והספטאקורד מוסיף לו את קומת המתח. כאן לומדים לבנות, לזהות ולסמן אותם.
        </p>
      </header>

      <Section id="triad" num="4.1" title="מהו אקורד? המשולש ואבריו">
        <p>
          <Term he="אקורד" en="Chord" def="שלושה צלילים או יותר הפועלים כיחידה הרמונית אחת — בין שהם נשמעים יחד ובין שהם פרוסים בזמן." /> הוא
          קבוצת צלילים הפועלת כיחידה אחת, והחשוב שבאקורדים הוא ה<Term he="משולש" en="Triad" def="אקורד בן שלושה צלילים הבנוי מטרצה על גבי טרצה: יסוד, טרצה וקווינטה." /> —
          שתי טרצות זו על גבי זו. לצליל התחתון בערימה קוראים{" "}
          <Term he="יסוד" en="Root" def="הצליל שממנו נבנה המשולש בטרצות, ושעל שמו האקורד נקרא — גם כשהוא אינו בבס." />, ומעליו{" "}
          <b>טרצה</b> ו<b>קווינטה</b>. האקורד נשאר אותו אקורד גם כשפורסים אותו בזמן —{" "}
          <Term he="ארפג'ו" en="Arpeggio / Broken chord" def="אקורד שצליליו מנוגנים בזה אחר זה במקום יחד. מהמילה האיטלקית arpa — נבל." /> —
          כמו בליווי האלברטי של מוצרט מיחידה 1:
        </p>
        <Widget
          title="משולש דו מז'ור — כבלוק וכארפג'ו (לחצו גם על התווים)"
          foot={
            <PlayButton
              label="בלוק, ואז ארפג'ו"
              events={[
                { midi: [60, 64, 67], time: 0, dur: 1.8, idx: 0 },
                ...[60, 64, 67, 72, 67, 64].map((m, i) => ({ midi: m, time: 2 + i * 0.4, dur: 0.45 })),
                { midi: [60, 64, 67], time: 4.6, dur: 2, idx: 0 },
              ]}
              bpm={92}
              player={buildPlayer}
            />
          }
        >
          <Score
            notes={[{ keys: ["c/4", "e/4", "g/4"], midi: [60, 64, 67], sub: "קווינטה · טרצה · יסוד" }]}
            width={260}
            highlightIndex={buildPlayer.index}
            ariaLabel="משולש דו מז'ור"
          />
        </Widget>
      </Section>

      <Section id="qualities" num="4.2" title="ארבע איכויות">
        <p>
          שתי הטרצות של המשולש יכולות להיות גדולות או קטנות — ארבעה צירופים, ארבע איכויות. שתיים מהן
          קונסוננטיות לגמרי (קווינטה זכה בקצוות) ושתיים דיסוננטיות, כי הקווינטה שלהן מוקטנת או מוגדלת:
        </p>
        <Widget
          title="בחרו איכות והשוו — אותו יסוד, אופי אחר"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {TRIAD_QUALITIES.map((t, i) => (
                  <button key={t.he} role="tab" aria-selected={qualTab === i} onClick={() => setQualTab(i)}>
                    {t.he}
                  </button>
                ))}
              </div>
              <PlayButton
                label="נגנו: פרוס ואז יחד"
                events={[
                  ...quality.midi.map((m, i) => ({ midi: m, time: i * 0.55, dur: 0.6 })),
                  { midi: [...quality.midi], time: 1.9, dur: 2.2, idx: 0 },
                ]}
                bpm={92}
                player={qualityPlayer}
              />
            </>
          }
        >
          <Score
            key={quality.he}
            notes={[{ keys: [...quality.keys], midi: [...quality.midi] }]}
            width={260}
            highlightIndex={qualityPlayer.index}
            ariaLabel={`משולש ${quality.he} על דו`}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            <b>{quality.he}:</b> {quality.build}; {quality.fifth}.
          </p>
        </Widget>
      </Section>

      <Section id="degrees" num="4.3" title="משולש על כל דרגה — והספרות הרומיות">
        <p>
          בונים משולש דיאטוני על כל דרגה בסולם — ומסמנים אותו ב
          <Term he="ספרה רומית" en="Roman numeral" def="סימון האקורד לפי דרגת היסוד שלו בסולם: I עד VII. אות גדולה — מז'ורי; קטנה — מינורי; ° — מוקטן." /> לפי
          דרגת היסוד. הסימון מקודד גם את האיכות: אות גדולה למז'ורי (<span dir="ltr">I</span>), קטנה
          למינורי (<span dir="ltr">ii</span>), ועיגול קטן למוקטן (<span dir="ltr">vii°</span>). התבנית
          קבועה לכל הסולמות מאותו המין — לכן שווה לשנן אותה פעם אחת:
        </p>
        <Widget
          title="שבעת המשולשים הדיאטוניים — לחצו על כל אקורד"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {DEGREE_TRIAD_SETS.map((s, i) => (
                  <button key={s.he} role="tab" aria-selected={setTab === i} onClick={() => setSetTab(i)}>
                    {s.he}
                  </button>
                ))}
              </div>
              <PlayButton
                label="נגנו את כולם"
                events={triadSet.notes.map((n, i) => ({ midi: n.midi, time: i * 0.8, dur: 0.85, idx: i }))}
                bpm={100}
                player={degreesPlayer}
              />
            </>
          }
        >
          <Score
            key={triadSet.he}
            notes={triadSet.notes}
            accidentalKey={triadSet.accidentalKey}
            width={620}
            highlightIndex={degreesPlayer.index}
            ariaLabel={`המשולשים הדיאטוניים ב${triadSet.he}`}
          />
        </Widget>
        <Callout label="והמינור ההרמוני?" insight>
          הטבלה של המינור הטבעי מסתירה את העיקר: ברגע שמגביהים את <Deg n="7" /> לצליל מוביל, הדרגה
          החמישית הופכת ל<b>מז'ורית</b> (<span dir="ltr">V</span>) והשביעית למשולש <b>מוקטן</b>{" "}
          (<span dir="ltr">vii°</span>) — בדיוק כמו במז'ור. אלה הצורות שישלטו בפרקי ההרמוניה הבאים.
        </Callout>
      </Section>

      <Section id="inversions" num="4.4" title="מצבים והיפוכים — ומהו בס ממוספר">
        <p>
          המשולש שומר על זהותו גם כשמסדרים את צליליו אחרת. השאלה המכרעת היא <em className="hl">מי בבס</em>:
          היסוד — <b>מצב יסודי</b>; הטרצה — <b>היפוך ראשון</b>; הקווינטה — <b>היפוך שני</b>. הספרות שליד כל
          מצב הן שיטת ה<Term he="בס ממוספר" en="Figured bass" def="סימון בארוקי: ספרות מתחת לתו הבס המציינות את המרווחים שמעליו. 5/3 מקוצר לכלום, 6/3 ל־6, ו־6/4 נשאר כפי שהוא." /> —
          הן מונות את המרווחים שמעל הבס (ובקיצור המקובל: מצב יסודי בלי ספרות כלל, היפוך ראשון —{" "}
          <span dir="ltr">6</span>, היפוך שני — <span dir="ltr">6/4</span>):
        </p>
        <Widget
          title="אותו משולש, שלושה מצבים — הקשיבו איך הצבע משתנה"
          foot={
            <PlayButton
              label="נגנו את השלושה"
              events={INVERSIONS.map((n, i) => ({ midi: n.midi, time: i * 1.2, dur: 1.25, idx: i }))}
              bpm={84}
              player={invPlayer}
            />
          }
        >
          <Score notes={INVERSIONS} width={420} highlightIndex={invPlayer.index} ariaLabel="משולש דו מז'ור בשלושת מצביו" />
        </Widget>
        <Callout label="חשוב להבין" insight>
          היפוך אינו אקורד חדש: היסוד נשאר דו גם כשמי בבס. אבל המצבים אינם שווי ערך — המצב היסודי יציב,
          ההיפוך הראשון קליל וזורם, וההיפוך השני מיוחד ומוגבל, כי הקוורטה שמעל הבס נחשבת דיסוננס. לכל
          אחד תפקיד משלו בהובלת הקולות — הרבה מהמשך הספר עוסק בדיוק בזה.
        </Callout>
      </Section>

      <Section id="sevenths" num="4.5" title="ספטאקורדים: קומת המתח">
        <p>
          מוסיפים למשולש עוד טרצה — והתוצאה היא{" "}
          <Term he="ספטאקורד" en="Seventh chord" def="אקורד בן ארבעה צלילים: משולש ועליו ספטימה מעל היסוד. הספטימה הדיסוננטית הופכת כל ספטאקורד לאקורד הדורש פתרון." /> בן
          ארבעה צלילים. הצליל הרביעי יוצר <b>ספטימה</b> מול היסוד — דיסוננס! — ולכן, בניגוד למשולש, ספטאקורד
          לעולם אינו נקודת מנוחה: הוא תמיד רוצה להמשיך הלאה. חמש האיכויות הנפוצות:
        </p>
        <Widget
          title="חמש איכויות הספטאקורד — על אותו יסוד"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {SEVENTH_QUALITIES.map((s, i) => (
                  <button key={s.en} role="tab" aria-selected={sevTab === i} onClick={() => setSevTab(i)}>
                    {s.he}
                  </button>
                ))}
              </div>
              <PlayButton
                label="נגנו: פרוס ואז יחד"
                events={[
                  ...seventh.midi.map((m, i) => ({ midi: m, time: i * 0.55, dur: 0.6 })),
                  { midi: [...seventh.midi], time: 2.5, dur: 2.2, idx: 0 },
                ]}
                bpm={92}
                player={seventhPlayer}
              />
            </>
          }
        >
          <Score
            key={seventh.en}
            notes={[{ keys: [...seventh.keys], midi: [...seventh.midi] }]}
            width={260}
            highlightIndex={seventhPlayer.index}
            ariaLabel={`ספטאקורד ${seventh.he} על דו`}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            <b>{seventh.he}</b> <span dir="ltr">({seventh.en})</span> — {seventh.note}
          </p>
        </Widget>
      </Section>

      <Section id="v7" num="4.6" title="ספטאקורד הדומיננטה והיפוכיו">
        <p>
          מדוע דווקא הספטאקורד הדומיננטי חשוב כל כך? בנו אותו על <Deg n="5" /> במז'ור ותראו: הוא מכיל את
          הצליל המוביל <em>וגם</em> את <Deg n="4" /> — כלומר את הטריטון מיחידה 2 — ועוד ספטימה מול היסוד.
          כל המתחים האלה מצביעים לאותו כיוון: הטוניקה. לספטאקורד ארבעה מצבים, והספרורים שלהם ילוו אותנו
          מעתה בכל ניתוח:
        </p>
        <Widget
          title="V7 בדו מז'ור — ארבעת המצבים"
          foot={
            <PlayButton
              label="נגנו את הארבעה"
              events={V7_INVERSIONS.map((n, i) => ({ midi: n.midi, time: i * 1.2, dur: 1.25, idx: i }))}
              bpm={84}
              player={v7Player}
            />
          }
        >
          <Score notes={V7_INVERSIONS} width={520} highlightIndex={v7Player.index} ariaLabel="ספטאקורד הדומיננטה בארבעת מצביו" />
        </Widget>
        <p>וכך נשמע המנוע בפעולה — המתח של הדומיננטה נפתר אל הטוניקה:</p>
        <Widget
          title="V7 ← I: הדיסוננס מוצא את ביתו"
          legend={
            <>
              <span><span className="dot active" />מתח</span>
              <span><span className="dot stable" />פתרון</span>
            </>
          }
          foot={<PlayButton label="נגנו את הפתרון" events={CADENCE_SEQ} bpm={72} player={cadencePlayer} />}
        >
          <Score notes={CADENCE_NOTES} width={300} highlightIndex={cadencePlayer.index} ariaLabel="ספטאקורד דומיננטה נפתר לטוניקה" />
        </Widget>
      </Section>

      <Section id="review" num="4.7" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>משולש</b>טרצה על טרצה: יסוד, טרצה, קווינטה.</div>
          <div className="review-chip"><b>ארבע איכויות</b>מז'ורי, מינורי (קונסוננטיים); מוקטן, מוגדל (דיסוננטיים).</div>
          <div className="review-chip"><b>במז'ור</b>מז'וריים: I, IV, V; מינוריים: ii, iii, vi; מוקטן: vii°.</div>
          <div className="review-chip"><b>ספרות רומיות</b>גדולה = מז'ורי, קטנה = מינורי, ° = מוקטן.</div>
          <div className="review-chip"><b>מצבי המשולש</b>יסוד בבס — 5/3; טרצה — 6; קווינטה — 6/4.</div>
          <div className="review-chip"><b>ספטאקורד</b>משולש + ספטימה; תמיד דיסוננטי, תמיד ממשיך הלאה.</div>
          <div className="review-chip"><b>מצבי הספטאקורד</b>7 — 6/5 — 4/3 — 4/2.</div>
          <div className="review-chip"><b>V7</b>צליל מוביל + טריטון + ספטימה — כולם מצביעים אל הטוניקה.</div>
        </div>
      </Section>

      <Section id="drills" num="4.8" title="תרגול — עד שזה אוטומטי">
        <Drill title="איכות המשולש לפי מבנהו" generate={triadQualityQuestion} />
        <Drill title="האיכות על כל דרגה במז'ור" generate={degreeTriadQuestion} />
        <Drill title="מצבי המשולש" generate={inversionQuestion} />
        <Drill title="ספרורי הספטאקורד" generate={seventhFigureQuestion} />
      </Section>

      <div className="next-unit">
        <b>הבא בתור — יחידה 5: מבוא לקונטרפונקט.</b> לפני שנחבר אקורדים בזה אחר זה, נלמד לחבר שני קווים
        מלודיים — קול מול קול, על חמשת המינים הקלאסיים של הקונטרפונקט.
      </div>
    </div>
  );
}
