import { Score, ScoreNote } from "./Score";
import { SeqEvent } from "../engine/audio";

/** One four-voice chord: [VexFlow key, midi] per voice. */
export type Satb = { s: [string, number]; a: [string, number]; t: [string, number]; b: [string, number] };

export const chordSeq = (chords: Satb[], durBeats = 1.4): SeqEvent[] =>
  chords.map((c, i) => ({
    midi: [c.b[1], c.t[1], c.a[1], c.s[1]],
    time: i * durBeats,
    dur: durBeats * 1.04,
    idx: i,
  }));

/** SATB on the traditional two staves: soprano+alto in treble, tenor+bass in bass. */
export function SatbScores({
  chords,
  marks,
  highlight,
  width,
  label,
  accidentalKey,
}: {
  chords: Satb[];
  marks?: (string | undefined)[];
  highlight: number | null;
  width?: number;
  label: string;
  accidentalKey?: string;
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
      <Score notes={upper} width={width} accidentalKey={accidentalKey} highlightIndex={highlight} ariaLabel={`${label} — סופרן ואלט`} />
      <Score notes={lower} clef="bass" width={width} accidentalKey={accidentalKey} highlightIndex={highlight} ariaLabel={`${label} — טנור ובס`} />
    </div>
  );
}
