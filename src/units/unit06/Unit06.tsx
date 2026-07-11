import { useState } from "react";
import { Score, ScoreNote } from "../../components/Score";
import { Drill, Question, pick, shuffle } from "../../components/Drill";
import { Callout, Deg, PlayButton, Section, Term, Widget, usePlayer } from "../../components/ui";
import { SeqEvent } from "../../engine/audio";

/* ---------------- SATB layout: two staves rendered as two stacked Scores ---------------- */

type Satb = { s: [string, number]; a: [string, number]; t: [string, number]; b: [string, number] };

const chordSeq = (chords: Satb[], durBeats = 1.4): SeqEvent[] =>
  chords.map((c, i) => ({
    midi: [c.b[1], c.t[1], c.a[1], c.s[1]],
    time: i * durBeats,
    dur: durBeats * 1.04,
    idx: i,
  }));

/** Upper staff: soprano + alto. Lower staff: tenor + bass. */
function SatbScores({
  chords,
  marks,
  highlight,
  width,
  label,
}: {
  chords: Satb[];
  marks?: (string | undefined)[];
  highlight: number | null;
  width?: number;
  label: string;
}) {
  const upper: ScoreNote[] = chords.map((c, i) => ({
    keys: [c.a[0], c.s[0]],
    midi: [c.a[1], c.s[1]],
    mark: marks?.[i],
  }));
  const lower: ScoreNote[] = chords.map((c) => ({
    keys: [c.b[0], c.t[0]],
    midi: [c.b[1], c.t[1]],
  }));
  return (
    <div style={{ display: "grid", gap: "0.15rem" }}>
      <Score notes={upper} width={width} highlightIndex={highlight} ariaLabel={`${label} — סופרן ואלט`} />
      <Score notes={lower} clef="bass" width={width} highlightIndex={highlight} ariaLabel={`${label} — טנור ובס`} />
    </div>
  );
}

/* ---------------- the voices and their ranges ---------------- */

const VOICES = [
  { he: "סופרן", en: "Soprano", range: "דו4 – סול5", midi: [60, 79] },
  { he: "אלט", en: "Alto", range: "סול3 – רה5", midi: [55, 74] },
  { he: "טנור", en: "Tenor", range: "דו3 – סול4", midi: [48, 67] },
  { he: "בס", en: "Bass", range: "מי2 – רה4", midi: [40, 62] },
] as const;

/* ---------------- close vs open position of the same I chord ---------------- */

const CLOSE_CHORD: Satb = { s: ["c/5", 72], a: ["g/4", 67], t: ["e/4", 64], b: ["c/3", 48] };
const OPEN_CHORD: Satb = { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] };

const POSITIONS = [
  {
    he: "שכנוּת (close)",
    chord: CLOSE_CHORD,
    note: "שלושת הקולות העליונים צפופים ככל האפשר — הסופרן והטנור בתוך אוקטבה אחת. צליל קומפקטי ומלוכד.",
  },
  {
    he: "פתוחה (open)",
    chord: OPEN_CHORD,
    note: "מרווח גדול יותר בין הקולות העליונים — צליל רחב ומאוורר. שימו לב: בין קולות עליונים שכנים עדיין לא יותר מאוקטבה.",
  },
] as const;

/* ---------------- parallel fifths: the classic error and its fix ---------------- */

const PARALLEL_BAD: ScoreNote[] = [
  { keys: ["c/4", "g/4"], midi: [60, 67], mark: "5", kind: "active" },
  { keys: ["d/4", "a/4"], midi: [62, 69], mark: "5", kind: "active" },
];
const PARALLEL_GOOD: ScoreNote[] = [
  { keys: ["c/4", "g/4"], midi: [60, 67], mark: "5" },
  { keys: ["d/4", "f/4"], midi: [62, 65], mark: "3", kind: "stable" },
];

/* ---------------- the full phrase: I – IV – V7 – I ---------------- */

const PHRASE: Satb[] = [
  { s: ["c/5", 72], a: ["e/4", 64], t: ["g/3", 55], b: ["c/3", 48] },
  { s: ["c/5", 72], a: ["f/4", 65], t: ["a/3", 57], b: ["f/3", 53] },
  { s: ["d/5", 74], a: ["f/4", 65], t: ["b/3", 59], b: ["g/3", 55] },
  { s: ["c/5", 72], a: ["e/4", 64], t: ["c/4", 60], b: ["c/3", 48] },
];
const PHRASE_MARKS = ["I", "IV", "V7", "I"];

/* ---------------- drills ---------------- */

function rangeQuestion(): Question {
  const v = pick(VOICES);
  return {
    prompt: <>הטווח <b>{v.range}</b> שייך לאיזה קול?</>,
    options: shuffle(VOICES.map((x) => x.he)),
    answer: v.he,
    explain: <>מהגבוה לנמוך: סופרן, אלט, טנור, בס. הקצוות גמישים מעט — אלה הטווחים הנוחים למקהלה.</>,
  };
}

const TEXTURE_POOL: Question[] = [
  {
    prompt: <>במשולש במצב יסודי, איזה צליל מכפילים בדרך כלל?</>,
    options: ["את היסוד", "את הטרצה", "את הקווינטה", "את הצליל העליון"],
    answer: "את היסוד",
    explain: <>הכפלת היסוד מחזקת את זהות האקורד. הכפלת הטרצה משנה את האיזון, ולעיתים אסורה.</>,
  },
  {
    prompt: <>איזה צליל אסור להכפיל כמעט לעולם?</>,
    options: ["את הצליל המוביל", "את היסוד", "את הקווינטה", "את הטוניקה"],
    answer: "את הצליל המוביל",
    explain: <>לצליל המוביל פתרון מחויב — מעלה אל הטוניקה. שני עותקים שלו יגררו אוקטבות מקבילות (או פתרון שבור).</>,
  },
  {
    prompt: <>מהו המרווח הגדול ביותר המומלץ בין סופרן לאלט (וכן בין אלט לטנור)?</>,
    options: ["אוקטבה", "קווינטה", "דצימה", "אין הגבלה"],
    answer: "אוקטבה",
    explain: <>קולות עליונים שכנים נשמרים בתוך אוקטבה כדי שהמרקם לא ייקרע. רק בין טנור לבס המרווח חופשי.</>,
  },
  {
    prompt: <>בין אילו שני קולות שכנים המרווח חופשי לגמרי?</>,
    options: ["טנור ובס", "סופרן ואלט", "אלט וטנור", "בין כולם"],
    answer: "טנור ובס",
    explain: <>הבס הוא יסוד המרקם, ומרווח גדול מעליו נשמע טבעי — כמו בסדרת העליונים, שדלילה למטה.</>,
  },
];

function textureQuestion(): Question {
  return pick(TEXTURE_POOL);
}

const TENDENCY_POOL: Question[] = [
  {
    prompt: <>לאן חייב ללכת הצליל המוביל בסיום (כשהוא בקול חיצוני)?</>,
    options: ["חצי טון מעלה, אל הטוניקה", "צעד למטה", "קפיצה אל הדומיננטה", "לאן שנוח"],
    answer: "חצי טון מעלה, אל הטוניקה",
    explain: <>המשיכה של חצי הטון מיחידה 1 הופכת כאן לחוק הובלת קולות.</>,
  },
  {
    prompt: (
      <>
        לאן נפתרת הספטימה של <span dir="ltr">V7</span> (הדרגה <Deg n="4" />)?
      </>
    ),
    options: ["צעד למטה, אל הטרצה של הטוניקה", "צעד למעלה", "נשארת במקום", "קפיצה אל היסוד"],
    answer: "צעד למטה, אל הטרצה של הטוניקה",
    explain: <>כמו כל דיסוננס מושהה מהקונטרפונקט: הספטימה יורדת בצעד. 4 אל 3 — המשיכה המוכרת.</>,
  },
];

function tendencyQuestion(): Question {
  return pick(TENDENCY_POOL);
}

const MOTION_CHECK_POOL = [
  { desc: "סופרן ובס נעים מקווינטה זכה לקווינטה זכה", ok: false },
  { desc: "טנור ואלט נעים מאוקטבה לאוקטבה", ok: false },
  { desc: "סופרן ואלט נעים מטרצה לטרצה", ok: true },
  { desc: "סופרן ובס נעים בתנועה נגדית מקווינטה לאוקטבה", ok: true },
  { desc: "שני קולות מחליפים מקומות (הצלבה)", ok: false },
  { desc: "סופרן ובס נעים מסקסטה לסקסטה", ok: true },
] as const;

function motionCheckQuestion(): Question {
  const q = pick(MOTION_CHECK_POOL);
  return {
    prompt: <>{q.desc} — תקין או שגיאה?</>,
    options: ["תקין", "שגיאה"],
    answer: q.ok ? "תקין" : "שגיאה",
    explain: (
      <>
        האסורים: קווינטות ואוקטבות מקבילות, והצלבת קולות. מקבילות של טרצות וסקסטות — רצויות; תנועה
        נגדית אל מרווח מושלם — מצוינת.
      </>
    ),
  };
}

/* ---------------- the lesson ---------------- */

export function Unit06() {
  const satbPlayer = usePlayer();
  const posPlayer = usePlayer();
  const parallelPlayer = usePlayer();
  const phrasePlayer = usePlayer();
  const [posTab, setPosTab] = useState(0);

  const position = POSITIONS[posTab];

  return (
    <div className="lesson">
      <header className="lesson-hero">
        <div className="unit-label">יחידה 6</div>
        <h1>כתיבה בארבעה קולות</h1>
        <p className="lede">
          כאן הכול מתחבר: האקורדים מיחידה 4 והקונטרפונקט מיחידה 5 נפגשים במרקם המקהלתי — סופרן, אלט,
          טנור ובס — שהוא המעבדה שבה נלמד את כל ההרמוניה מכאן והלאה.
        </p>
      </header>

      <Section id="satb" num="6.1" title="המקהלה שבתווים">
        <p>
          מסורת הכתיבה בארבעה קולות יורשת את המקהלה:{" "}
          <Term he="סופרן, אלט, טנור ובס" en="SATB" def="ארבעת קולות המקהלה, מהגבוה לנמוך. רושמים אותם על שתי חמשות: הנשים במפתח סול, הגברים במפתח פה." /> על
          שתי חמשות — סופרן ואלט במפתח סול, טנור ובס במפתח פה. כל אקורד שנכתוב הוא בו־זמנית ארבעה קווים
          מלודיים, וכל קו כפוף לכללי הקונטרפונקט:
        </p>
        <Widget
          title="משולש הטוניקה בפריסה מקהלתית — ארבעה קולות, שתי חמשות"
          foot={
            <PlayButton
              label="נגנו: קול־קול ואז יחד"
              events={[
                ...[CLOSE_CHORD.b, CLOSE_CHORD.t, CLOSE_CHORD.a, CLOSE_CHORD.s].map((v, i) => ({
                  midi: v[1],
                  time: i * 0.7,
                  dur: 0.75,
                })),
                { midi: [48, 64, 67, 72], time: 3, dur: 2.4, idx: 0 },
              ]}
              bpm={84}
              player={satbPlayer}
            />
          }
        >
          <SatbScores chords={[CLOSE_CHORD]} highlight={satbPlayer.index} width={240} label="משולש דו מז'ור" />
        </Widget>
        <p>הטווחים הנוחים של ארבעת הקולות — כדאי להכיר, כי חריגה מהם נשמעת (ומזייפת) מיד:</p>
        <div className="review-grid">
          {VOICES.map((v) => (
            <div key={v.he} className="review-chip">
              <b>{v.he}</b>
              {v.range}
            </div>
          ))}
        </div>
      </Section>

      <Section id="spacing" num="6.2" title="שכנוּת, פתוחה, ומרווחי הקולות">
        <p>
          את אותו אקורד אפשר לפרוס צפוף או מאוורר. בפריסת <b>שכנוּת</b> שלושת העליונים דחוסים יחד; בפריסה
          <b> פתוחה</b> הם נושמים. כלל הזהב אחד: בין קולות עליונים שכנים (סופרן–אלט, אלט–טנור) —{" "}
          <em className="hl">לא יותר מאוקטבה</em>. רק מעל הבס המרווח חופשי, בדיוק כמו שסדרת העליונים
          מיחידה 2 דלילה למטה וצפופה למעלה:
        </p>
        <Widget
          title="אותו אקורד, שתי פריסות — הקשיבו להבדל הצבע"
          foot={
            <>
              <div className="tabs" role="tablist" style={{ direction: "rtl" }}>
                {POSITIONS.map((p, i) => (
                  <button key={p.he} role="tab" aria-selected={posTab === i} onClick={() => setPosTab(i)}>
                    {p.he}
                  </button>
                ))}
              </div>
              <PlayButton
                label="נגנו את הפריסה"
                events={chordSeq([position.chord], 2.4)}
                bpm={80}
                player={posPlayer}
              />
            </>
          }
        >
          <SatbScores key={position.he} chords={[position.chord]} highlight={posPlayer.index} width={240} label={position.he} />
          <p style={{ direction: "rtl", color: "var(--ink-soft)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
            {position.note}
          </p>
        </Widget>
      </Section>

      <Section id="doubling" num="6.3" title="הכפלה: ארבעה קולות, שלושה צלילים">
        <p>
          במשולש שלושה צלילים ובמקהלה ארבעה קולות — מישהו חייב להישיר פעמיים. ברירת המחדל:{" "}
          <b>מכפילים את היסוד</b>, שמחזק את זהות האקורד. ואיסור אחד חד:{" "}
          <em className="hl">לעולם לא מכפילים את הצליל המוביל</em> — יש לו כתובת אחת (הטוניקה), ושני
          עותקים שלו ייצרו בהכרח אוקטבות מקבילות או פתרון שבור.
        </p>
        <Callout label="סדר העדיפויות">
          יסוד — תמיד טוב; קווינטה — בסדר גמור; טרצה — אפשרי כשנוח, אבל בזהירות (ולעולם לא כשהיא צליל
          מוביל). ספטימה — לעולם לא: גם לה פתרון מחויב.
        </Callout>
      </Section>

      <Section id="parallels" num="6.4" title="החוק החשוב מכולם: בלי מקבילות">
        <p>
          הירושה המרכזית מהקונטרפונקט: שני קולות לא ינועו במקביל בקווינטה זכה או באוקטבה. למה? כי מרווחים
          מושלמים "מתמזגים" — ושני קולות שנעים בהם במקביל מתמוססים לקול אחד, והמרקם מאבד רגל. הקשיבו
          להבדל — ותקנו בדיוק כמו שמתקנים תמיד: <b>תנועה נגדית</b>:
        </p>
        <Widget
          title="קווינטות מקבילות — השגיאה ותיקונה"
          legend={
            <>
              <span><span className="dot active" />מקבילות</span>
              <span><span className="dot stable" />מתוקן</span>
            </>
          }
          foot={
            <>
              <PlayButton
                label="השגיאה: 5→5"
                events={PARALLEL_BAD.map((n, i) => ({ midi: n.midi, time: i * 1.1, dur: 1.15, idx: i }))}
                bpm={76}
                player={parallelPlayer}
              />
              <PlayButton
                label="התיקון: 5→3 בתנועה נגדית"
                ghost
                events={PARALLEL_GOOD.map((n, i) => ({ midi: n.midi, time: i * 1.1, dur: 1.15, idx: i }))}
                bpm={76}
                player={parallelPlayer}
              />
            </>
          }
        >
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <Score notes={PARALLEL_BAD} width={260} clickable={false} ariaLabel="קווינטות מקבילות אסורות" />
            <Score notes={PARALLEL_GOOD} width={260} clickable={false} ariaLabel="התיקון בתנועה נגדית" />
          </div>
        </Widget>
        <p>
          ולצידו עוד שני איסורים קטנים: <b>הצלבת קולות</b> (אלט מעל סופרן וכדומה) שמבלבלת את האוזן, ו
          <b>חפיפה</b> — קול שנע אל מעבר למקומו הקודם של שכנו. שניהם פוגעים באותו דבר: היכולת לעקוב אחרי
          כל קו בנפרד.
        </p>
      </Section>

      <Section id="tendency" num="6.5" title="צלילים עם כתובת">
        <p>
          בתוך האקורדים ממשיכים לפעול הכוחות מיחידה 1: הצליל המוביל שואף מעלה אל הטוניקה, והספטימה של{" "}
          <span dir="ltr">V7</span> — הדרגה <Deg n="4" kind="active" /> — יורדת בצעד אל <Deg n="3" kind="stable" />,
          בדיוק כמו השהיה מהמין הרביעי. שני אלה אינם המלצה אלא חובה, והם שקובעים את מבנה אקורד הטוניקה
          שאחרי הדומיננטה.
        </p>
      </Section>

      <Section id="phrase" num="6.6" title="הכול יחד: I–IV–V7–I">
        <p>
          הנה משפט שלם בארבעה קולות, ובו כל מה שלמדנו: הכפלות יסוד, מרווחים תקינים, אף לא מקבילה אחת,
          הצליל המוביל (סי בטנור) עולה אל דו, והספטימה (פה באלט) יורדת אל מי. עקבו אחרי כל קול בנפרד —
          כל אחד מהם קו מלודי פשוט וטוב:
        </p>
        <Widget
          title="קדנצה שלמה בדו מז'ור — ארבעה קולות על שתי חמשות"
          foot={<PlayButton label="נגנו את המשפט" events={chordSeq(PHRASE, 1.5)} bpm={72} player={phrasePlayer} />}
        >
          <SatbScores chords={PHRASE} marks={PHRASE_MARKS} highlight={phrasePlayer.index} width={380} label="קדנצה בדו מז'ור" />
        </Widget>
        <Callout label="לאן ממשיכים מכאן?" insight>
          מכאן נפתח לב הספר: הפרוגרסיות. איך I ו־V מגדירים סולם, מה תפקידם של IV ו־ii בדרך אל הדומיננטה,
          ואיך בונים משפטים שלמים — יחידה אחר יחידה, עם אותם כלים בדיוק.
        </Callout>
      </Section>

      <Section id="review" num="6.7" title="נקודות לחזרה">
        <div className="review-grid">
          <div className="review-chip"><b>SATB</b>ארבעה קולות, שתי חמשות; כל קול — קו מלודי.</div>
          <div className="review-chip"><b>טווחים</b>סופרן דו4–סול5; אלט סול3–רה5; טנור דו3–סול4; בס מי2–רה4.</div>
          <div className="review-chip"><b>מרווחי קולות</b>עד אוקטבה בין עליונים שכנים; מעל הבס — חופשי.</div>
          <div className="review-chip"><b>הכפלה</b>יסוד כברירת מחדל; צליל מוביל וספטימה — לעולם לא.</div>
          <div className="review-chip"><b>מקבילות</b>קווינטות ואוקטבות — אסורות; טרצות וסקסטות — רצויות.</div>
          <div className="review-chip"><b>הצלבה וחפיפה</b>כל קול נשאר במרחב שלו.</div>
          <div className="review-chip"><b>צלילים מחויבים</b>מוביל ↑ לטוניקה; ספטימה ↓ בצעד.</div>
          <div className="review-chip"><b>העיקרון</b>הרמוניה טובה = ארבעה קווים טובים בו־זמנית.</div>
        </div>
      </Section>

      <Section id="drills" num="6.8" title="תרגול — עד שזה אוטומטי">
        <Drill title="טווחי הקולות" generate={rangeQuestion} />
        <Drill title="הכפלות ומרווחים" generate={textureQuestion} />
        <Drill title="תקין או שגיאה?" generate={motionCheckQuestion} />
        <Drill title="צלילים מחויבים" generate={tendencyQuestion} />
      </Section>

      <div className="next-unit">
        <b>סיימתם את שש יחידות היסוד!</b> מכאן נפתח לב הספר — הפרוגרסיות ההרמוניות, החל ב־I–V–I. יחידות
        נוספות יתווספו בהמשך.
      </div>
    </div>
  );
}
