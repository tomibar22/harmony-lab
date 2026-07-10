import { useEffect, useRef, useState } from "react";
import { Accidental, Barline, Beam, Dot, Formatter, Renderer, Stave, StaveNote, Voice } from "vexflow";
import { playNote } from "../engine/audio";

export type ScoreNote = {
  keys: string[];            // VexFlow keys, e.g. ["c/4"] or ["g/3","b/3","d/4"]
  duration?: string;         // "w" | "h" | "q" | "8" | "16" (default "w")
  dots?: number;
  midi: number[];            // for click-playback + sequencing
  kind?: "stable" | "active" | "plain";
  beam?: string;             // notes sharing a beam id get beamed together
  degree?: string;           // scale-degree number drawn with a caret above
  mark?: string;             // plain marking above (P, N, ½ …)
  sub?: string;              // Hebrew label below
};

type Props = {
  notes: ScoreNote[];
  clef?: "treble" | "bass";
  keySig?: string;           // VexFlow key signature, e.g. "F", "Bb", "Am"
  accidentalKey?: string;    // key context for automatic accidentals (default keySig or "C")
  width?: number;
  clickable?: boolean;
  highlightIndex?: number | null;
  ariaLabel?: string;
};

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const NOTE_FONT = "IBM Plex Sans Hebrew, sans-serif";

/** Bumps whenever the theme changes so engraved colours get refreshed. */
function useThemeVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((x) => x + 1);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", bump);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", bump);
    };
  }, []);
  return v;
}

export function Score({
  notes,
  clef = "treble",
  keySig,
  accidentalKey,
  width,
  clickable = true,
  highlightIndex = null,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const noteEls = useRef<(SVGGElement | null)[]>([]);
  const themeVersion = useThemeVersion();

  // engrave
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = "";

    const w = width ?? Math.max(300, 90 + notes.length * 58);
    const hasBelow = notes.some((n) => n.sub);
    const h = 150 + (hasBelow ? 26 : 0);

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(w, h);
    const context = renderer.getContext();

    const stave = new Stave(4, 32, w - 10);
    stave.addClef(clef);
    if (keySig) stave.addKeySignature(keySig);
    // these staves are diagrams, not measures — no enclosing barlines
    stave.setBegBarType(Barline.type.NONE);
    stave.setEndBarType(Barline.type.NONE);
    stave.setContext(context).draw();

    if (notes.length === 0) {
      // signature-only staff (e.g. circle-of-fifths panel)
      const svg = host.querySelector("svg")!;
      const notation0 = cssVar("--notation") || "#2a333e";
      svg.setAttribute("fill", notation0);
      svg.setAttribute("stroke", notation0);
      if (ariaLabel) svg.setAttribute("aria-label", ariaLabel);
      noteEls.current = [];
      return;
    }

    const vexNotes = notes.map((n) => {
      const sn = new StaveNote({ keys: n.keys, duration: n.duration ?? "w", clef });
      if (n.dots) Dot.buildAndAttach([sn], { all: true });
      return sn;
    });

    const voice = new Voice({ numBeats: 4, beatValue: 4 });
    voice.setMode(Voice.Mode.SOFT);
    voice.addTickables(vexNotes);
    Accidental.applyAccidentals([voice], accidentalKey ?? keySig ?? "C");

    const beams: Beam[] = [];
    let group: StaveNote[] = [];
    let groupId: string | undefined;
    const flushBeam = () => {
      if (group.length > 1) beams.push(new Beam(group));
      group = [];
      groupId = undefined;
    };
    notes.forEach((n, i) => {
      if (n.beam && n.beam === groupId) group.push(vexNotes[i]);
      else {
        flushBeam();
        if (n.beam) {
          groupId = n.beam;
          group = [vexNotes[i]];
        }
      }
    });
    flushBeam();

    new Formatter().joinVoices([voice]).format([voice], w - 90);
    voice.draw(context, stave);
    beams.forEach((b) => b.setContext(context).draw());

    const svg = host.querySelector("svg")!;
    svg.setAttribute("role", "img");
    if (ariaLabel) svg.setAttribute("aria-label", ariaLabel);

    // theme recolor: VexFlow paints via fill/stroke inherited from the svg root
    const notation = cssVar("--notation") || "#2a333e";
    svg.setAttribute("fill", notation);
    svg.setAttribute("stroke", notation);

    const colorOf = (kind?: ScoreNote["kind"]) =>
      kind === "stable" ? cssVar("--stable") : kind === "active" ? cssVar("--accent") : notation;

    noteEls.current = vexNotes.map((vn, i) => {
      const el =
        (vn as unknown as { getSVGElement?: () => SVGGElement | undefined }).getSVGElement?.() ??
        (vn as unknown as { attrs?: { el?: SVGGElement } }).attrs?.el ??
        null;
      const n = notes[i];
      if (el) {
        if (n.kind && n.kind !== "plain") {
          el.style.fill = colorOf(n.kind);
          el.style.stroke = colorOf(n.kind);
        }
        if (clickable && n.midi.length) {
          // the svg root ships with pointer-events="none" — re-enable on the note group
          el.style.pointerEvents = "auto";
          el.classList.add("clickable-note");
          el.addEventListener("click", () => void playNote(n.midi));
        }
      }
      return el;
    });

    // labels drawn inside the SVG so responsive scaling keeps alignment
    const NS = "http://www.w3.org/2000/svg";
    vexNotes.forEach((vn, i) => {
      const n = notes[i];
      const x = vn.getAbsoluteX() + 6;
      if (n.degree) {
        const y = 20;
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", String(x));
        t.setAttribute("y", String(y));
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("font-size", "14");
        t.setAttribute("font-weight", "700");
        t.setAttribute("font-family", NOTE_FONT);
        t.setAttribute("fill", colorOf(n.kind));
        t.textContent = n.degree;
        svg.appendChild(t);
        // caret drawn as a path above the number — never a combining character
        const c = document.createElementNS(NS, "path");
        c.setAttribute("d", `M ${x - 4} ${y - 12} L ${x} ${y - 17} L ${x + 4} ${y - 12}`);
        c.setAttribute("stroke", colorOf(n.kind));
        c.setAttribute("stroke-width", "1.6");
        c.setAttribute("fill", "none");
        c.setAttribute("stroke-linecap", "round");
        svg.appendChild(c);
      }
      if (n.mark) {
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", String(x));
        t.setAttribute("y", "18");
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("font-size", "13");
        t.setAttribute("font-style", "italic");
        t.setAttribute("font-weight", "600");
        t.setAttribute("font-family", NOTE_FONT);
        t.setAttribute("fill", colorOf(n.kind));
        t.textContent = n.mark;
        svg.appendChild(t);
      }
      if (n.sub) {
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", String(x));
        t.setAttribute("y", String(h - 10));
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("font-size", "12");
        t.setAttribute("font-family", NOTE_FONT);
        t.setAttribute("fill", cssVar("--ink-soft"));
        t.textContent = n.sub;
        svg.appendChild(t);
      }
    });
  }, [notes, clef, keySig, accidentalKey, width, clickable, ariaLabel, themeVersion]);

  // playback highlight (group-level fill/stroke override, restoring the kind colour)
  useEffect(() => {
    const gold = cssVar("--gold");
    const colorOf = (kind?: ScoreNote["kind"]) =>
      kind === "stable" ? cssVar("--stable") : kind === "active" ? cssVar("--accent") : "";
    noteEls.current.forEach((el, i) => {
      if (!el) return;
      if (i === highlightIndex) {
        el.style.fill = gold;
        el.style.stroke = gold;
      } else {
        el.style.fill = colorOf(notes[i]?.kind);
        el.style.stroke = colorOf(notes[i]?.kind);
      }
    });
  }, [highlightIndex, notes]);

  return <div className="score" ref={ref} />;
}
