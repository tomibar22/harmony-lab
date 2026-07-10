import * as Tone from "tone";
import { useCallback, useEffect, useRef, useState } from "react";

/** A scheduled event: midi note(s) at `time` beats lasting `dur` beats.
 *  `idx` links the event to a rendered note for highlight sync (omit for accompaniment). */
export type SeqEvent = {
  midi: number | number[];
  time: number;
  dur: number;
  vel?: number;
  idx?: number;
};

let synth: Tone.PolySynth<Tone.Synth> | null = null;

async function ensureAudio(): Promise<Tone.PolySynth<Tone.Synth>> {
  await Tone.start();
  if (!synth) {
    const reverb = new Tone.Reverb({ decay: 1.7, wet: 0.16 }).toDestination();
    synth = new Tone.PolySynth(Tone.Synth, {
      volume: -9,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.004, decay: 0.28, sustain: 0.18, release: 1.3 },
    }).connect(reverb);
  }
  return synth;
}

export async function playNote(midi: number | number[], durSec = 0.9, vel = 0.8) {
  const s = await ensureAudio();
  const midis = Array.isArray(midi) ? midi : [midi];
  const now = Tone.now();
  midis.forEach((m) =>
    s.triggerAttackRelease(Tone.Frequency(m, "midi").toFrequency(), durSec, now, vel / Math.sqrt(midis.length))
  );
}

/** Hook: play a sequence with per-event highlight callbacks. */
export function useSequencePlayer() {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    synth?.releaseAll();
    setPlaying(false);
    setIndex(null);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(
    async (events: SeqEvent[], bpm = 100) => {
      stop();
      const s = await ensureAudio();
      const spb = 60 / bpm;
      const now = Tone.now() + 0.08;
      let end = 0;
      for (const ev of events) {
        const at = now + ev.time * spb;
        const dur = ev.dur * spb * 0.95;
        end = Math.max(end, ev.time * spb + ev.dur * spb);
        const midis = Array.isArray(ev.midi) ? ev.midi : [ev.midi];
        midis.forEach((m) =>
          s.triggerAttackRelease(
            Tone.Frequency(m, "midi").toFrequency(),
            dur,
            at,
            (ev.vel ?? 0.8) / Math.sqrt(midis.length)
          )
        );
        if (ev.idx !== undefined) {
          const i = ev.idx;
          timeouts.current.push(setTimeout(() => setIndex(i), ev.time * spb * 1000 + 80));
        }
      }
      setPlaying(true);
      timeouts.current.push(
        setTimeout(() => {
          setPlaying(false);
          setIndex(null);
        }, end * 1000 + 250)
      );
    },
    [stop]
  );

  return { playing, index, play, stop };
}
