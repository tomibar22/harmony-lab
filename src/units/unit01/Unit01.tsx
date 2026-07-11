import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Keyboard } from "../../components/Keyboard";
import { CircleOfFifths } from "../../components/CircleOfFifths";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { SeqEvent } from "../../engine/audio";
import {
  DEGREE_NAMES_HE,
  MAJOR_KEYS,
  MODES,
  SCALE_PATTERNS,
  buildScale,
  signatureLabel,
  whiteKeyScale,
} from "../../engine/theory";

/* ---------------- musical data (public-domain works, re-engraved) ---------------- */

/** Mozart, Piano Sonata K. 545, i — bars 1–2 (melody engraved, Alberti bass in playback). */
const MOZART_MELODY: ScoreNote[] = [
  { keys: ["c/5"], duration: "h", midi: [72] },
  { keys: ["e/5"], duration: "q", midi: [76] },
  { keys: ["g/5"], duration: "q", midi: [79] },
  { keys: ["b/4"], duration: "q", dots: 1, midi: [71] },
  { keys: ["c/5"], duration: "16", midi: [72], beam: "m2" },
  { keys: ["d/5"], duration: "16", midi: [74], beam: "m2" },
  { keys: ["c/5"], duration: "h", midi: [72] },
];
const MOZART_SEQ: SeqEvent[] = [
  { midi: 72, time: 0, dur: 2, idx: 0 },
  { midi: 76, time: 2, dur: 1, idx: 1 },
  { midi: 79, time: 3, dur: 1, idx: 2 },
  { midi: 71, time: 4, dur: 1.5, idx: 3 },
  { midi: 72, time: 5.5, dur: 0.25, idx: 4 },
  { midi: 74, time: 5.75, dur: 0.25, idx: 5 },
  { midi: 72, time: 6, dur: 2, idx: 6 },
  // Alberti figuration: bar 1 tonic; bar 2 dominant seventh resolving back to tonic
  ...[60, 67, 64, 67, 60, 67, 64, 67].map((m, i) => ({ midi: m, time: i * 0.5, dur: 0.5, vel: 0.45 })),
  ...[62, 67, 65, 67].map((m, i) => ({ midi: m, time: 4 + i * 0.5, dur: 0.5, vel: 0.45 })),
  ...[60, 67, 64, 67].map((m, i) => ({ midi: m, time: 6 + i * 0.5, dur: 0.5, vel: 0.45 })),
];

const SKELETON: ScoreNote[] = [
  { keys: ["c/5"], midi: [72], kind: "stable", degree: "1" },
  { keys: ["e/5"], midi: [76], kind: "stable", degree: "3" },
  { keys: ["g/5"], midi: [79], kind: "stable", degree: "5" },
  { keys: ["b/4"], midi: [71], kind: "active", degree: "7" },
  { keys: ["c/5"], midi: [72], kind: "stable", degree: "1" },
];

const C_SCALE_MIDI = buildScale(60, SCALE_PATTERNS.major);
const C_SCALE_KEYS = ["c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4", "c/5"];

const SCALE_NOTES: ScoreNote[] = C_SCALE_MIDI.map((m, i) => ({
  keys: [C_SCALE_KEYS[i]],
  midi: [m],
  degree: String(i + 1 === 8 ? 8 : i + 1),
  sub: DEGREE_NAMES_HE[i],
}));

const STABLE_DEGREES = new Set([1, 3, 5, 8]);
const RESOLUTIONS: Record<number, { to: number; toMidi: number }> = {
  2: { to: 1, toMidi: 60 },
  4: { to: 3, toMidi: 64 },
  6: { to: 5, toMidi: 67 },
  7: { to: 8, toMidi: 72 },
};

/* minor forms on A (no signature → accidentals are visible where they occur) */
const MINOR_FORMS = {
  natural: {
    he: "מינור טבעי",
    keys: ["a/3", "b/3", "c/4", "d/4", "e/4", "f/4", "g/4", "a/4"],
    midi: buildScale(57, SCALE_PATTERNS.naturalMinor),
    note: "בדיוק לפי סימן ההיתק. הדרגה השביעית — סוּבּטוניקה — במרחק טון שלם מהאוקטבה.",
  },
  harmonic: {
    he: "מינור הרמוני",
    keys: ["a/3", "b/3", "c/4", "d/4", "e/4", "f/4", "g#/4", "a/4"],
    midi: buildScale(57, SCALE_PATTERNS.harmonicMinor),
    note: "מגביהים רק את 7 ומרוויחים צליל מוביל — אבל בין 6 ל־7 נפער מרווח של טון וחצי.",
  },
  melodic: {
    he: "מינור מלודי (בעלייה)",
    keys: ["a/3", "b/3", "c/4", "d/4", "e/4", "f#/4", "g#/4", "a/4"],
    midi: buildScale(57, SCALE_PATTERNS.melodicMinor),
    note: "מגביהים גם את 6 וגם את 7: יש צליל מוביל והקו המלודי חלק. בירידה חוזרים לצורה הטבעית.",
  },
} as const;

/* one original mini-phrase, played in major and in parallel minor */
const MAJOR_PHRASE: SeqEvent[] = [
  { midi: [48, 55, 64], time: 0, dur: 4, vel: 0.5 },
  { midi: 67, time: 0, dur: 1, idx: 0 },
  { midi: 65, time: 1, dur: 1, idx: 1 },
  { midi: 64, time: 2, dur: 1, idx: 2 },
  { midi: 62, time: 3, dur: 1, idx: 3 },
  { midi: [48, 55, 64], time: 4, dur: 2, vel: 0.5 },
  { midi: 60, time: 4, dur: 2, idx: 4 },
];
const MINOR_PHRASE: SeqEvent[] = MAJOR_PHRASE.map((ev) => {
  const lower = (m: number) => (m % 12 === 4 ? m - 1 : m); // E → E♭ (scale degree 3)
  return { ...ev, midi: Array.isArray(ev.midi) ? ev.midi.map(lower) : lower(ev.midi) };
});

/* ---------------- drills ---------------- */

function majorSignatureQuestion(): Question {
  const key = pick(MAJOR_KEYS);
  const distractors = shuffle(MAJOR_KEYS.filter((k) => k.sharps !== key.sharps))
    .slice(0, 3)
    .map((k) => signatureLabel(k.sharps));
  return {
    prompt: <>כמה סימני היתק יש בסולם <b>{key.name} מז'ור</b>?</>,
    options: shuffle([signatureLabel(key.sharps), ...distractors]),
    answer: signatureLabel(key.sharps),
    explain: <>במעגל הקווינטות: כל קווינטה למעלה מוסיפה דיאז, כל קווינטה למטה מוסיפה במול.</>,
  };
}

function relativeMinorQuestion(): Question {
  const key = pick(MAJOR_KEYS.filter((k) => Math.abs(k.sharps) <= 5));
  const wrong = shuffle(MAJOR_KEYS.filter((k) => k.relativeMinor !== key.relativeMinor))
    .slice(0, 3)
    .map((k) => `${k.relativeMinor} מינור`);
  return {
    prompt: <>מהו המינור <b>המקביל</b> (הרלטיבי) של <b>{key.name} מז'ור</b>? (אותו סימן היתק)</>,
    options: shuffle([`${key.relativeMinor} מינור`, ...wrong]),
    answer: `${key.relativeMinor} מינור`,
    explain: <>הטוניקה של המינור המקביל היא הדרגה השישית של המז'ור.</>,
  };
}

function degreeNameQuestion(): Question {
  const i = Math.floor(Math.random() * 7);
  const wrong = shuffle(DEGREE_NAMES_HE.slice(0, 7).filter((n) => n !== DEGREE_NAMES_HE[i])).slice(0, 3);
  return {
    prompt: <>איך נקראת הדרגה ה־<b>{i + 1}</b> של הסולם?</>,
    options: shuffle([DEGREE_NAMES_HE[i], ...wrong]),
    answer: DEGREE_NAMES_HE[i],
    explain: i === 6 ? <>במינור טבעי, כשהיא במרחק טון שלם מהטוניקה, היא נקראת סוּבּטוניקה.</> : undefined,
  };
}

/* ---------------- the lesson ---------------- */

export function Unit01() {
  const mozartPlayer = usePlayer();
  const skeletonPlayer = usePlayer();
  const scalePlayer = usePlayer();
  const resolvePlayer = usePlayer();
  const pnPlayer = usePlayer();
  const minorPlayer = usePlayer();
  const modePlayer = usePlayer();
  const contrastPlayer = usePlayer();
  const [minorForm, setMinorForm] = useState<keyof typeof MINOR_FORMS>("natural");
  const [mode, setMode] = useState(0);

  const stableActiveNotes: ScoreNote[] = C_SCALE_MIDI.map((m, i) => {
    const deg = i + 1;
    const stable = STABLE_DEGREES.has(deg);
    return {
      keys: [C_SCALE_KEYS[i]],
      midi: [m],
      degree: String(deg),
      kind: stable ? "stable" : "active",
      sub: stable ? "יציב" : "פעיל",
    };
  });

  const playResolution = (deg: number) => {
    const r = RESOLUTIONS[deg];
    if (!r) return;
    void resolvePlayer.play(
      [
        { midi: [48, 55, 64], time: 0, dur: 2.4, vel: 0.5 },
        { midi: C_SCALE_MIDI[deg - 1], time: 0, dur: 0.9, idx: deg - 1 },
        { midi: r.toMidi, time: 0.9, dur: 1.4, idx: r.to - 1 },
      ],
      80
    );
  };

  const form = MINOR_FORMS[minorForm];
  const modeScale = whiteKeyScale(MODES[mode].startMidi);

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 1</div>
        <h1>סולמות, דרגות ומודוסים</h1>
        <p className="lede">
          מה הופך אוסף של צלילים למוזיקה "בדוֹ מז'ור"? ביחידה הזאת נבנה את מערכת היחסים שבלב הטונאליות:
          טוניקה, דרגות, משיכות ופתרונות — ובעיקר נקשיב לה.
        </p>
      </header>

      <Section id="key" num="1.1" title="מהו סולם? (Key)">
        <p>
          פתיחת הסונטה בדו מז'ור ק. 545 של מוצרט היא מקום טוב להתחיל בו, כי היא כמעט שקופה: רוב מוחלט של
          הצלילים בה לקוחים משבעה צלילים בלבד, וכולם מסתדרים סביב מרכז אחד — <span className="hl">דו</span>.
          מוזיקה נמצאת "בסולם" — <span dir="ltr">key</span> באנגלית — כאשר צליל אחד משמש מרכז כובד,
          וכל השאר מקבלים את תפקידם מתוך היחס אליו.
        </p>
        <Widget
          title="מוצרט, סונטה ק. 545, פרק א׳ — תיבות 1–2 (לחיצה על תו משמיעה אותו)"
          foot={<PlayButton label="נגנו את הפתיחה" events={MOZART_SEQ} bpm={116} player={mozartPlayer} />}
        >
          <Score notes={MOZART_MELODY} highlightIndex={mozartPlayer.index} ariaLabel="שתי התיבות הראשונות של הסונטה" />
        </Widget>
        <p>
          ההגדרה הזאת נכונה אבל עוד ריקה למדי — כמו להגדיר שחמט כ"משחק לוח לשני שחקנים". החוכמה היא להבין{" "}
          <em className="hl">אילו סוגי יחסים</em> קושרים כל צליל אל המרכז. זה הפרויקט של היחידה הזאת.
        </p>
        <Callout label="הערת מינוח">
          באנגלית יש שתי מילים נפרדות: <b dir="ltr">key</b> — מערכת היחסים סביב צליל מרכזי, ו־
          <b dir="ltr">scale</b> — צלילי המערכת מסודרים בשורה. בעברית לשתיהן קוראים <b>סולם</b>, ולכן
          נצרף את המונח האנגלי בכל מקום שבו חשוב להבדיל. ושימו לב: "מפתח" בעברית שמור למשהו אחר לגמרי —
          ה־<span dir="ltr">clef</span> שבתחילת החמשה (מפתח סול, מפתח פה).
        </Callout>
      </Section>

      <Section id="tonic" num="1.2" title="הטוניקה: נקודת מוצא ויעד">
        <p>
          לצליל המרכזי קוראים <Term he="טוניקה" en="Tonic" def="הצליל המרכזי של הסולם (ה־key): נקודת המוצא של התנועה הטונאלית והיעד שאליו היא שואפת." />.
          היא פועלת בשני כיוונים: ממנה יוצאים, ואליה מכוונים. הקשיבו לשלד של שתי התיבות ששמענו — קו שעולה על
          צלילי המשולש ואז נשען על <Deg n="7" kind="active" /> רגע לפני שהוא נסגר חזרה:
        </p>
        <Widget
          title="השלד המלודי של הפתיחה"
          legend={
            <>
              <span><span className="dot stable" />יציב</span>
              <span><span className="dot active" />פעיל</span>
            </>
          }
          foot={<PlayButton label="נגנו את השלד" events={SKELETON.map((n, i) => ({ midi: n.midi, time: i, dur: 1, idx: i }))} bpm={90} player={skeletonPlayer} />}
        >
          <Score notes={SKELETON} highlightIndex={skeletonPlayer.index} ariaLabel="דו מי סול סי דו" />
        </Widget>
        <Callout label="רעיון מרכזי" insight>
          מלחין יכול <b>לדחות</b> את ההגעה ליעד — לסיים פסוק דווקא על צליל פעיל — וכך להגביר את תחושת הסגירה
          כשהטוניקה סוף־סוף מגיעה. מתח וציפייה הם חומר הגלם של טונאליות.
        </Callout>
      </Section>

      <Section id="scale" num="1.3" title="הסולם ודרגותיו">
        <p>
          כשמסדרים את צלילי הסולם בסדר עולה מטוניקה לטוניקה מתקבל{" "}
          <Term he="סולם" en="Scale" def="צלילי ה־key מסודרים בזה אחר זה, מהטוניקה אל הטוניקה שמעליה. מלטינית scala — סולם, מדרגות." /> —
          הפעם במובן השני של המילה, ה־<span dir="ltr">scale</span>. לכל שלב יש מספר (עם גג קטן מעליו)
          ושם מסורתי:
        </p>
        <Widget
          title="סולם דו מז'ור — לחצו על כל תו"
          foot={<PlayButton label="נגנו את הסולם" events={C_SCALE_MIDI.map((m, i) => ({ midi: m, time: i * 0.45, dur: 0.5, idx: i }))} bpm={100} player={scalePlayer} />}
        >
          <Score notes={SCALE_NOTES} highlightIndex={scalePlayer.index} ariaLabel="סולם דו מז'ור עם שמות הדרגות" />
        </Widget>
        <p>
          שני צלילי הקצה הם שניהם דו, אבל לא אותו דו: מפריד ביניהם מרווח של{" "}
          <Term he="אוקטבה" en="Octave" def="שני צלילים שהיחס ביניהם כה קרוב עד שהם נושאים אותו שם. שקילוּת האוקטבות היא מעמודי התווך של ארגון הגובה במוזיקה." />
          , ובזכות <b>שקילות האוקטבות</b> אנחנו מתייחסים אליהם כאל בני אותה משפחה — <Deg n="8" /> היא שוב <Deg n="1" />.
        </p>
      </Section>

      <Section id="steps" num="1.4" title="טונים שלמים, חצאי טונים — והמבנה המז'ורי">
        <p>
          המרחקים בין שלבי הסולם אינם אחידים: חמישה <b>טונים שלמים</b> ושני <b>חצאי טונים</b>. בסולם המז'ורי
          חצאי הטונים נופלים בדיוק בין <Deg n="3" />–<Deg n="4" /> ובין <Deg n="7" />–<Deg n="8" />. כל יצירה
          שצליליה יוצרים את התבנית הזאת, מהטוניקה שלה — נמצאת בסולם מז'ורי.
        </p>
        <Widget title="איפה אין קליד שחור? שם מסתתר חצי הטון">
          <Keyboard
            fromMidi={60}
            toMidi={72}
            labels={{ 60: "דו C", 62: "רה D", 64: "מי E", 65: "פה F", 67: "סול G", 69: "לה A", 71: "סי B", 72: "דו C" }}
            brackets={[
              { fromMidi: 64, toMidi: 65, label: "חצי טון" },
              { fromMidi: 71, toMidi: 72, label: "חצי טון" },
            ]}
            ariaLabel="מקלדת עם הדגשת חצאי הטונים מי–פה וסי–דו"
          />
        </Widget>
        <p>
          המז'ור הוא בן אחד ממשפחת ה<Term he="סולמות הדיאטוניים" en="Diatonic scales" def="כל סולם עם חמישה טונים שלמים ושני חצאי טונים באוקטבה. מיקום חצאי הטונים הוא שמבדיל מז'ור, מינור ומודוסים." /> —
          לכולם אותם מרכיבים, וההבדל כולו במיקום חצאי הטונים. על ההבדל הזה בנויה מוזיקה מערבית מיוונית העתיקה
          ועד המאה התשע־עשרה.
        </p>
      </Section>

      <Section id="active" num="1.5" title="יציב, פעיל, ומשיכת חצי הטון">
        <p>
          התנועה במוזיקה טונאלית היא תנועה <em className="hl">מכוונת</em>. הדרגות <Deg n="1" kind="stable" />,{" "}
          <Deg n="3" kind="stable" /> ו־<Deg n="5" kind="stable" /> — צלילי משולש הטוניקה — יציבות ויכולות לשמש
          יעד. כל השאר פעילות: הן נוטות לנוע צעד אל היציבה הקרובה. לחצו על צליל פעיל ושמעו את הפתרון:
        </p>
        <Widget
          title="לחצו על צליל פעיל (אדום) — הוא יישמע ואז ייפתר, מעל משולש טוניקה"
          legend={
            <>
              <span><span className="dot stable" />יציב</span>
              <span><span className="dot active" />פעיל</span>
              <span><span className="dot gold" />מתנגן</span>
            </>
          }
        >
          <ScoreWithResolutions
            notes={stableActiveNotes}
            highlightIndex={resolvePlayer.index}
            onDegreeClick={playResolution}
          />
        </Widget>
        <p>
          שימו לב להבדל בעוצמת המשיכה: <Deg n="2" kind="active" /> ו־<Deg n="6" kind="active" /> נעות בנחת של טון
          שלם, אבל <Deg n="4" kind="active" /> ו־<Deg n="7" kind="active" /> יושבות במרחק <b>חצי טון</b> מהיעד —
          והקרבה הזאת פועלת כמו כוח משיכה מוגבר. זו הסיבה ש־<Deg n="7" kind="active" /> זכתה לשם{" "}
          <Term he="צליל מוביל" en="Leading tone" def="הדרגה השביעית כשהיא במרחק חצי טון מתחת לטוניקה: היא 'מובילה' אליה בדחיפות האופיינית לחצי טון." />.
        </p>
        <p>
          שתי הדרכים הבסיסיות שבהן צליל פעיל מתפקד:{" "}
          <Term he="צליל מעבר" en="Passing tone (P)" def="צליל פעיל המגשר בצעדים בין שני צלילים יציבים שונים, למשל 1–2–3." /> שמוליך
          ממקום למקום, ו<Term he="צליל שכן" en="Neighboring tone (N)" def="צליל פעיל שיוצא מצליל יציב וחוזר אליו, מלמעלה (שכן עליון) או מלמטה (שכן תחתון)." /> שמקשט
          את המקום שבו אנחנו כבר נמצאים:
        </p>
        <Widget title="מעבר לעומת שכן — מעל אותו משולש טוניקה">
          <div className="w-foot" style={{ marginTop: 0 }}>
            <PlayButton label="מעבר: 1–2–3" ghost events={overTriad([60, 62, 64])} bpm={92} player={pnPlayer} />
            <PlayButton label="שכן עליון: 3–4–3" ghost events={overTriad([64, 65, 64])} bpm={92} player={pnPlayer} />
            <PlayButton label="שכן תחתון: 3–2–3" ghost events={overTriad([64, 62, 64])} bpm={92} player={pnPlayer} />
          </div>
        </Widget>
      </Section>

      <Section id="signatures" num="1.6" title="טרנספוזיציה, סימני היתק ומעגל הקווינטות">
        <p>
          אפשר לבנות את תבנית המז'ור מכל צליל — זו <Term he="טרנספוזיציה" en="Transposition" def="העברת קטע מוזיקלי לסולם (key) אחר תוך שמירה על תבנית המרווחים." />.
          אבל ברגע שעוזבים את דו, חייבים דיאזים או במולים כדי לשמור את חצאי הטונים במקומם. הסימנים הקבועים
          נאספים ל<Term he="סימן היתק" en="Key signature" def="הדיאזים או הבמולים הקבועים של הסולם, הרשומים בתחילת כל שורה." /> בתחילת
          השורה. חמישה־עשר סולמות מז'וריים מסתדרים על מעגל: קווינטה למעלה — עוד דיאז; קווינטה למטה — עוד במול.
          במעגל תמצאו לצד כל שם עברי גם את האות באנגלית (<span dir="ltr">C, D, E…</span>) — כך נהוג לציין
          סולמות ואקורדים בקהילה המוזיקלית הבינלאומית, וכדאי להתרגל לשתי השפות במקביל.
        </p>
        <Widget title="מעגל הקווינטות — בחרו סולם, ראו את סימן ההיתק, נגנו אותו">
          <CircleOfFifths />
        </Widget>
        <Callout label="כדאי לשנן">
          את סימני ההיתק צריך לדעת <b>מייד ואוטומטית</b> — הם האלף־בית של כל מה שיבוא בהמשך. התרגול בתחתית
          העמוד נבנה בדיוק בשביל זה.
        </Callout>
      </Section>

      <Section id="chromatic" num="1.7" title="כרומטיקה ואנהרמוניה">
        <p>
          לא כל דיאז מודיע על סולם חדש. לרוב הוא בסך הכול <Term he="כרומטיקה" en="Chromaticism" def="שימוש בצלילים שאינם שייכים לסולם, כקישוט או הדגשה של התשתית הדיאטונית. מיוונית chroma — צבע." /> —
          צבע שמודגש בו צעד של חצי טון. כשפה־דיאז מוביל אל סול, נולד סוג חדש של חצי טון:{" "}
          <b>חצי טון כרומטי</b> (פה–פה♯: אותה אות, גובה שונה) לעומת <b>חצי טון דיאטוני</b> (סי–דו: אותיות
          שכנות). והמקלדת מלמדת עוד דבר: אותו קליד יכול לשאת שני שמות — סול♯ הוא גם לה♭. לצמד כזה קוראים{" "}
          <Term he="שקילים אנהרמוניים" en="Enharmonic equivalents" def="שני שמות שונים לאותו גובה צליל בכיוון המושווה, כמו פה♯ וסול♭." />.
        </p>
      </Section>

      <Section id="minor" num="1.8" title="מינור: סולם אחד, שלוש צורות">
        <p>
          מה מבדיל סולם מינורי ממז'ורי? בראש ובראשונה הטרצה שמעל הטוניקה: קטנה במינור, גדולה במז'ור —
          מכאן השמות. אבל למינור יש מורכבות מעניינת: <b>צורתו הבסיסית</b> (הטבעית, זו שסימן ההיתק מתאר) חסרה
          צליל מוביל — הדרגה השביעית שלה רחוקה טון שלם מהטוניקה, ולכן נקראת <b>סוּבּטוניקה</b>. כדי להשיב את
          המשיכה אל הטוניקה מגביהים את 7 — ולפעמים גם את 6, כדי שהדרך אליה תישאר חלקה:
        </p>
        <Widget
          title="שלוש צורות המינור על לה — החליפו והשוו"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {(Object.keys(MINOR_FORMS) as (keyof typeof MINOR_FORMS)[]).map((k) => (
                  <button key={k} role="tab" aria-selected={minorForm === k} onClick={() => setMinorForm(k)}>
                    {MINOR_FORMS[k].he}
                  </button>
                ))}
              </div>
              <PlayButton
                label="נגנו את הצורה"
                events={form.midi.map((m, i) => ({ midi: m, time: i * 0.45, dur: 0.5, idx: i }))}
                bpm={100}
                player={minorPlayer}
              />
            </>
          }
        >
          <Score
            key={minorForm}
            notes={form.keys.map((k, i) => ({
              keys: [k],
              midi: [form.midi[i]],
              degree: String(i + 1 === 8 ? 8 : i + 1),
            }))}
            accidentalKey="Am"
            highlightIndex={minorPlayer.index}
            ariaLabel={`סולם לה ${form.he}`}
          />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.75rem 0 0" }}>
            {form.note}
          </p>
        </Widget>
        <Callout label="חשוב להבין" insight>
          אלה אינם שלושה סולמות נפרדים אלא <b>שלוש צורות של סולם אחד</b>. סימן ההיתק תמיד מתאר את הצורה
          הטבעית, והשינויים מופיעים כסימנים מזדמנים לפי הצורך המלודי: עולים אל הטוניקה — מגביהים; יורדים ממנה —
          חוזרים לטבעי.
        </Callout>
      </Section>

      <Section id="relations" num="1.9" title="קרובי משפחה: מקביל ומקביל־טוניקה">
        <p>
          שני מונחי קרבה שכדאי להפריד היטב: <b>מינור רלטיבי</b> חולק עם המז'ור את <em className="hl">סימן ההיתק</em>{" "}
          (לה מינור ↔ דו מז'ור) אבל לא את הטוניקה — אלה שני סולמות שונים! ולעומתו <b>מינור פרלל</b> חולק את{" "}
          <em className="hl">הטוניקה</em> (דו מינור ↔ דו מז'ור) אבל לא את הסימן. דווקא הפרלל הוא קרוב המשפחה
          האינטימי יותר: התנועה הטונאלית מכוונת לאותו יעד, ומלחינים מערבבים בין השניים בחופשיות —{" "}
          <Term he="מיקסטורה" en="Mixture" def="שאילת צלילים בין סולם מז'ורי למינור הפרלל שלו — נושא שיורחב ביחידה 24." /> שנפגוש
          שוב בהמשך הספר.
        </p>
      </Section>

      <Section id="modes" num="1.10" title="שבעת המודוסים של הסדר הדיאטוני">
        <p>
          אם בונים סולם על כל אחד מהקלידים הלבנים — רק לבנים — מקבלים שבע תבניות שונות, כי חצאי הטונים נוחתים
          כל פעם במקום אחר. אלה ה<Term he="מודוסים" en="Modes" def="שבע הפריסות של הסדר הדיאטוני, כל אחת עם מיקום שונה לחצאי הטונים ולכן אופי טונאלי משלה." /> —
          ושניים מהם כבר מוכרים לכם:
        </p>
        <Widget
          title="בחרו מודוס ונגנו אותו"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {MODES.map((m, i) => (
                  <button key={m.en} role="tab" aria-selected={mode === i} onClick={() => setMode(i)}>
                    {m.he}
                  </button>
                ))}
              </div>
              <PlayButton
                label="נגנו את המודוס"
                events={modeScale.map((m, i) => ({ midi: m, time: i * 0.45, dur: 0.5 }))}
                bpm={100}
                player={modePlayer}
              />
            </>
          }
        >
          <p style={{ direction: "rtl", margin: 0 }}>
            <b>{MODES[mode].he}</b> <span style={{ color: "var(--ink-soft)" }}>({MODES[mode].en})</span> —{" "}
            {MODES[mode].note}.
          </p>
        </Widget>
        <p>
          במוזיקה שבין הבארוק לרומנטיקה — הרפרטואר של הספר — שולטים בפועל רק שניים: מז'ור (יוני) ומינור
          (אאולי, על שלוש צורותיו). השאר מציצים מדי פעם כצבע, והם שער הכרחי למוזיקה מוקדמת ולג'אז.
        </p>
      </Section>

      <Section id="tonality" num="1.11" title="טונאליות — ולמה מינור 'עצוב'?">
        <p>
          העיקרון הכללי — ארגון סביב צליל מרכזי — נקרא{" "}
          <Term he="טונאליות" en="Tonality" def="ארגון מוזיקלי סביב צליל מרכזי. במובן הרחב כולל גם מודוסים ומוזיקה לא־מערבית; בספר זה בעיקר טונאליות מז'ור–מינור." />
          , והמערכת הספציפית שנלמד כאן היא <b>טונאליות מז'ור–מינור</b>. ולשאלה הנצחית: הקשר בין מינור לעצב אינו
          סתם הרגל תרבותי — כבר תאורטיקנים בני המאה השש־עשרה תיארו סולמות עם טרצה גדולה כעליזים ועם טרצה קטנה
          כנוגים. שפטו בעצמכם — אותו משפט בדיוק, פעם עם <Deg n="3" /> גבוהה ופעם עם נמוכה:
        </p>
        <Widget title="אותה נגינה, מצב אחר: 5–4–3–2–1">
          <div className="w-foot" style={{ marginTop: 0 }}>
            <PlayButton label="במז'ור" events={MAJOR_PHRASE} bpm={84} player={contrastPlayer} />
            <PlayButton label="במינור (פרלל)" ghost events={MINOR_PHRASE} bpm={84} player={contrastPlayer} />
          </div>
        </Widget>
      </Section>

      <Section id="review" num="1.12" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>סולם (key)</b>מערכת יחסים סביב צליל מרכזי — הטוניקה.</div>
          <div className="review-chip"><b>סולם (scale)</b>צלילי ה־key מסודרים מטוניקה לטוניקה; לכל דרגה מספר ושם.</div>
          <div className="review-chip"><b>מז'ור</b>חצאי טונים בין 3–4 ובין 7–8.</div>
          <div className="review-chip"><b>יציב / פעיל</b>1, 3, 5 יעדים; השאר נעים אליהם כמעבר או כשכן.</div>
          <div className="review-chip"><b>חצי טון</b>מגביר משיכה: 7 אל 8, 4 אל 3.</div>
          <div className="review-chip"><b>סימן היתק</b>קווינטה למעלה = עוד דיאז; למטה = עוד במול.</div>
          <div className="review-chip"><b>מינור</b>טרצה קטנה מעל הטוניקה; שלוש צורות של סולם אחד.</div>
          <div className="review-chip"><b>רלטיבי / פרלל</b>רלטיבי חולק סימן; פרלל חולק טוניקה.</div>
        </div>
      </Section>

      <Section id="drills" num="1.13" title="תרגול — עד שזה אוטומטי">
        <Drill title="סימני היתק במז'ור" generate={majorSignatureQuestion} />
        <Drill title="המינור הרלטיבי" generate={relativeMinorQuestion} />
        <Drill title="שמות הדרגות" generate={degreeNameQuestion} />
      </Section>

      <div className="next-unit">
        <b>הבא בתור — יחידה 2: מרווחים.</b> איך מודדים את המרחק בין שני צלילים, מה זו סדרת העליות,
        ולמה קונסוננס ודיסוננס הם מנוע התנועה של המוזיקה.
      </div>
    </div>
  );
}

/* helper: melody over a sustained tonic triad */
function overTriad(melody: number[]): SeqEvent[] {
  return [
    { midi: [48, 55, 64], time: 0, dur: melody.length * 0.9 + 0.6, vel: 0.5 },
    ...melody.map((m, i) => ({ midi: m, time: i * 0.9, dur: 0.95, idx: i })),
  ];
}

/* Score wrapper that maps note clicks to resolution playback for section 1.5 */
function ScoreWithResolutions({
  notes,
  highlightIndex,
  onDegreeClick,
}: {
  notes: ScoreNote[];
  highlightIndex: number | null;
  onDegreeClick: (deg: number) => void;
}) {
  // Clicking an active note plays its resolution; stable notes just sound (Score's default click).
  return (
    <div
      onClickCapture={(e) => {
        const g = (e.target as Element).closest(".clickable-note");
        if (!g) return;
        const host = (e.currentTarget as HTMLElement).querySelectorAll(".clickable-note");
        const idx = Array.from(host).indexOf(g);
        const deg = idx + 1;
        if (idx >= 0 && !STABLE_DEGREES.has(deg)) {
          e.stopPropagation();
          onDegreeClick(deg);
        }
      }}
    >
      <Score notes={notes} highlightIndex={highlightIndex} ariaLabel="צלילים יציבים ופעילים עם פתרונות" />
    </div>
  );
}
