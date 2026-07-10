import { useState } from "react";
import { MAJOR_KEYS, MajorKey, SCALE_PATTERNS, buildScale, signatureLabel } from "../engine/theory";
import { useSequencePlayer } from "../engine/audio";
import { Score } from "./Score";

/** Clock positions: index 0 = C at 12 o'clock, moving clockwise by fifths.
 *  Positions 5–7 carry the enharmonic pairs, completing the fifteen keys. */
const POSITIONS: { majors: MajorKey[]; minorLabel: string }[] = [
  { majors: [MAJOR_KEYS[0]], minorLabel: "לה" },        // C
  { majors: [MAJOR_KEYS[1]], minorLabel: "מי" },        // G
  { majors: [MAJOR_KEYS[2]], minorLabel: "סי" },        // D
  { majors: [MAJOR_KEYS[3]], minorLabel: "פה♯" },       // A
  { majors: [MAJOR_KEYS[4]], minorLabel: "דו♯" },       // E
  { majors: [MAJOR_KEYS[5], MAJOR_KEYS[14]], minorLabel: "סול♯" },  // B / Cb
  { majors: [MAJOR_KEYS[6], MAJOR_KEYS[13]], minorLabel: "רה♯/מי♭" }, // F# / Gb
  { majors: [MAJOR_KEYS[7], MAJOR_KEYS[12]], minorLabel: "סי♭" },   // C# / Db
  { majors: [MAJOR_KEYS[11]], minorLabel: "פה" },       // Ab
  { majors: [MAJOR_KEYS[10]], minorLabel: "דו" },       // Eb
  { majors: [MAJOR_KEYS[9]], minorLabel: "סול" },       // Bb
  { majors: [MAJOR_KEYS[8]], minorLabel: "רה" },        // F
];

export function CircleOfFifths() {
  const [selected, setSelected] = useState<MajorKey>(MAJOR_KEYS[0]);
  const player = useSequencePlayer();

  const R = 148;
  const cx = 186;
  const cy = 186;

  const playScale = () => {
    const scale = buildScale(selected.tonicMidi, SCALE_PATTERNS.major);
    void player.play(
      scale.map((m, i) => ({ midi: m, time: i * 0.45, dur: 0.5 })),
      100
    );
  };

  return (
    <div className="cof">
      <svg viewBox="0 0 372 372" aria-label="מעגל הקווינטות">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line)" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={R - 52} fill="none" stroke="var(--line)" strokeDasharray="3 5" strokeWidth={1} />
        {POSITIONS.map((pos, i) => {
          const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const x = cx + R * Math.cos(angle);
          const y = cy + R * Math.sin(angle);
          const xm = cx + (R - 52) * Math.cos(angle);
          const ym = cy + (R - 52) * Math.sin(angle);
          const isSel = pos.majors.some((k) => k.vex === selected.vex);
          const label = pos.majors.map((k) => k.name).join(" / ");
          return (
            <g
              key={i}
              className="key-node"
              role="button"
              tabIndex={0}
              aria-label={`מפתח ${label} מז'ור`}
              onClick={() => setSelected(pos.majors[0])}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(pos.majors[0]);
                }
              }}
            >
              <circle
                cx={x}
                cy={y}
                r={22}
                fill={isSel ? "var(--gold-soft)" : "var(--card)"}
                stroke={isSel ? "var(--gold)" : "var(--card-line)"}
                strokeWidth={isSel ? 2.5 : 1.2}
                style={{ transition: "all .25s" }}
              />
              <text x={x} y={y + 4.5} textAnchor="middle" fontSize={pos.majors.length > 1 ? 9.5 : 13} fontWeight={700} fill="var(--ink)">
                {label}
              </text>
              <text x={xm} y={ym + 3.5} textAnchor="middle" fontSize={10} fill="var(--ink-soft)">
                {pos.minorLabel}
              </text>
            </g>
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fill="var(--ink-soft)">
          בחוץ: מז'ור
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={11} fill="var(--ink-soft)">
          בפנים: המינור המקביל
        </text>
      </svg>
      <div className="panel">
        <h4>{selected.name} מז'ור</h4>
        <div className="row">
          סימני היתק: <b>{signatureLabel(selected.sharps)}</b>
        </div>
        <div className="row">
          מינור מקביל (רלטיבי): <b>{selected.relativeMinor} מינור</b>
        </div>
        <div style={{ margin: "0.6rem 0", direction: "ltr" }}>
          <Score
            key={selected.vex}
            notes={[]}
            keySig={selected.vex}
            width={216}
            ariaLabel={`סימן ההיתק של ${selected.name} מז'ור`}
          />
        </div>
        <button className="play-btn" onClick={playScale}>
          <span aria-hidden>▶</span> נגנו את הסולם
        </button>
      </div>
    </div>
  );
}
