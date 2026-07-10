import { playNote } from "../engine/audio";

type Bracket = { fromMidi: number; toMidi: number; label: string };

type Props = {
  fromMidi?: number;         // first white key (must be a white key)
  toMidi?: number;           // last white key
  highlight?: Record<number, "stable" | "active" | "gold">;
  labels?: Record<number, string>;
  brackets?: Bracket[];
  ariaLabel?: string;
};

const WHITE_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);
const KW = 42;
const KH = 108;

function whiteKeysBetween(from: number, to: number): number[] {
  const out: number[] = [];
  for (let m = from; m <= to; m++) if (WHITE_PCS.has(m % 12)) out.push(m);
  return out;
}

export function Keyboard({ fromMidi = 60, toMidi = 72, highlight = {}, labels = {}, brackets = [], ariaLabel }: Props) {
  const whites = whiteKeysBetween(fromMidi, toMidi);
  const hasBrackets = brackets.length > 0;
  const height = KH + 22 + (hasBrackets ? 34 : 0);
  const width = whites.length * KW + 2;

  const xOfWhite = (midi: number) => whites.indexOf(midi) * KW + 1;

  const fillOf = (midi: number): string => {
    const h = highlight[midi];
    if (h === "stable") return "color-mix(in srgb, var(--stable) 22%, var(--card))";
    if (h === "active") return "color-mix(in srgb, var(--accent) 22%, var(--card))";
    if (h === "gold") return "color-mix(in srgb, var(--gold) 30%, var(--card))";
    return "var(--card)";
  };

  return (
    <div className="kbd-widget">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} role="img" aria-label={ariaLabel ?? "מקלדת פסנתר"}>
        {whites.map((m) => (
          <g key={m}>
            <rect
              className="white-key"
              x={xOfWhite(m)}
              y={1}
              width={KW - 2}
              height={KH}
              rx={3}
              fill={fillOf(m)}
              stroke="var(--notation)"
              strokeWidth={1.1}
              tabIndex={0}
              role="button"
              aria-label={`קליד ${labels[m] ?? m}`}
              onClick={() => void playNote(m)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void playNote(m);
                }
              }}
            />
            {labels[m] && (
              <text
                x={xOfWhite(m) + (KW - 2) / 2}
                y={KH - 9}
                textAnchor="middle"
                fontSize={12.5}
                fontWeight={700}
                fill="var(--ink)"
              >
                {labels[m]}
              </text>
            )}
          </g>
        ))}
        {/* black keys */}
        {whites.slice(0, -1).map((m) => {
          const black = m + 1;
          if (WHITE_PCS.has(black % 12) || black > toMidi) return null;
          const x = xOfWhite(m) + KW * 0.66;
          return (
            <rect
              key={black}
              className="black-key"
              x={x}
              y={1}
              width={KW * 0.6}
              height={KH * 0.62}
              rx={2}
              fill="var(--ink)"
              role="button"
              tabIndex={0}
              aria-label={`קליד שחור`}
              onClick={() => void playNote(black)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void playNote(black);
                }
              }}
            />
          );
        })}
        {brackets.map((b, i) => {
          const x1 = xOfWhite(b.fromMidi) + (KW - 2) / 2;
          const x2 = xOfWhite(b.toMidi) + (KW - 2) / 2;
          const y = KH + 12;
          return (
            <g key={i}>
              <path d={`M ${x1} ${y} v 6 H ${x2} v -6`} stroke="var(--accent)" strokeWidth={2} fill="none" />
              <text x={(x1 + x2) / 2} y={y + 24} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--accent)">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
