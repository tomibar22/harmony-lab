import * as Tone from "tone";
import { useCallback, useEffect, useRef, useState } from "react";

/** A scheduled event: midi note(s) at `time` beats lasting `dur` beats.
 *  `idx` links the event to a rendered note for highlight sync (omit for accompaniment).
 *  `perc` plays the event as a non-pitched metronome click instead of a tone -
 *  for purely rhythmic material where pitch would only distract. */
export type SeqEvent = {
  midi: number | number[];
  time: number;
  dur: number;
  vel?: number;
  idx?: number;
  perc?: boolean;
};

let synth: Tone.PolySynth<Tone.Synth> | null = null;
let reverb: Tone.Reverb | null = null;
let click: Tone.NoiseSynth | null = null;
let clickFilter: Tone.Filter | null = null;

async function ensureAudio(): Promise<Tone.PolySynth<Tone.Synth>> {
  await Tone.start();
  if (!reverb) reverb = new Tone.Reverb({ decay: 1.7, wet: 0.16 }).toDestination();
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      volume: -9,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.004, decay: 0.28, sustain: 0.18, release: 1.3 },
    }).connect(reverb);
  }
  return synth;
}

/** Non-pitched metronome click: a short filtered noise burst - a "tick",
 *  with accent carried by velocity, no sense of pitch. */
async function ensureClick(): Promise<Tone.NoiseSynth> {
  await Tone.start();
  if (!clickFilter) clickFilter = new Tone.Filter(1500, "highpass").toDestination();
  if (!click) {
    click = new Tone.NoiseSynth({
      volume: -8,
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.02 },
    }).connect(clickFilter);
  }
  return click;
}

/** Fade a voice down over a few ms and dispose just after, so a hard stop
 *  mid-waveform never clicks. Returns nothing; the caller nulls the slot. */
function fadeDispose(node: { volume: Tone.Param<"decibels">; dispose: () => void } | null) {
  if (!node) return;
  try {
    const t = Tone.now();
    node.volume.cancelScheduledValues(t);
    node.volume.rampTo(-Infinity, 0.03, t);
    setTimeout(() => node.dispose(), 70);
  } catch {
    node.dispose();
  }
}

/** Hard stop: events are pre-scheduled on the audio clock, and releaseAll only
 *  frees notes already sounding - disposing the voices is what cancels the rest.
 *  The next play lazily rebuilds them. */
function cancelScheduled() {
  fadeDispose(synth);
  fadeDispose(click);
  synth = null;
  click = null;
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
    cancelScheduled();
    setPlaying(false);
    setIndex(null);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(
    async (events: SeqEvent[], bpm = 100) => {
      stop();
      const s = await ensureAudio();
      const c = events.some((e) => e.perc) ? await ensureClick() : null;
      const spb = 60 / bpm;
      const now = Tone.now() + 0.08;
      let end = 0;
      for (const ev of events) {
        const at = now + ev.time * spb;
        const dur = ev.dur * spb * 0.95;
        end = Math.max(end, ev.time * spb + ev.dur * spb);
        if (ev.perc) {
          // non-pitched tick; a fixed short duration reads cleaner than the note's length
          c?.triggerAttackRelease(0.03, at, ev.vel ?? 0.8);
        } else {
          const midis = Array.isArray(ev.midi) ? ev.midi : [ev.midi];
          midis.forEach((m) =>
            s.triggerAttackRelease(
              Tone.Frequency(m, "midi").toFrequency(),
              dur,
              at,
              (ev.vel ?? 0.8) / Math.sqrt(midis.length)
            )
          );
        }
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
