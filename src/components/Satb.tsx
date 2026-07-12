import { useEffect, useRef, useState } from "react";
import { Accidental, Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice } from "vexflow";
import { playNote, SeqEvent } from "../engine/audio";

/** One four-voice chord: [VexFlow key, midi] per voice. */
export type Satb = { s: [string, number]; a: [string, number]; t: [string, number]; b: [string, number] };

export const chordSeq = (chords: Satb[], durBeats = 1.4): SeqEvent[] =>
  chords.map((c, i) => ({
    midi: [c.b[1], c.t[1], c.a[1], c.s[1]],
    time: i * durBeats,
    dur: durBeats * 1.04,
    idx: i,
  }));

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const NOTE_FONT = "IBM Plex Sans Hebrew, sans-serif";

/** Bumps whenever the theme changes so engraved colours refresh. */
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

function elOf(vn: StaveNote): SVGGElement | null {
  return (
    (vn as unknown as { getSVGElement?: () => SVGGElement | undefined }).getSVGElement?.() ??
    (vn as unknown as { attrs?: { el?: SVGGElement } }).attrs?.el ??
    null
  );
}

/** SATB on a joined grand staff: soprano+alto in treble, tenor+bass in bass,
 *  braced together and formatted as one system so the voices line up vertically -
 *  a single keyboard instrument, not two disconnected lines. */
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
  const ref = useRef<HTMLDivElement>(null);
  const upperEls = useRef<(SVGGElement | null)[]>([]);
  const lowerEls = useRef<(SVGGElement | null)[]>([]);
  const themeVersion = useThemeVersion();

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = "";

    const w = width ?? Math.max(300, 90 + chords.length * 58);
    const upperY = 38;
    const lowerY = 112; // brought close: a grand-staff gap, not two separate systems
    const h = 172;

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(w, h);
    const context = renderer.getContext();

    const upper = new Stave(4, upperY, w - 10);
    upper.addClef("treble");
    const lower = new Stave(4, lowerY, w - 10);
    lower.addClef("bass");
    upper.setContext(context).draw();
    lower.setContext(context).draw();

    // brace + single left line join the two staves into one instrument
    new StaveConnector(upper, lower).setType(StaveConnector.type.BRACE).setContext(context).draw();
    new StaveConnector(upper, lower).setType(StaveConnector.type.SINGLE_LEFT).setContext(context).draw();

    const upperNotes = chords.map(
      (c) => new StaveNote({ keys: [c.a[0], c.s[0]], duration: "w", clef: "treble" })
    );
    const lowerNotes = chords.map(
      (c) => new StaveNote({ keys: [c.b[0], c.t[0]], duration: "w", clef: "bass" })
    );

    const key = accidentalKey ?? "C";
    const upperVoice = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT);
    upperVoice.addTickables(upperNotes);
    const lowerVoice = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT);
    lowerVoice.addTickables(lowerNotes);
    Accidental.applyAccidentals([upperVoice], key);
    Accidental.applyAccidentals([lowerVoice], key);

    // one formatter over both voices → identical x-positions, aligned chords
    new Formatter().joinVoices([upperVoice]).joinVoices([lowerVoice]).format([upperVoice, lowerVoice], w - 90);
    upperVoice.draw(context, upper);
    lowerVoice.draw(context, lower);

    const svg = host.querySelector("svg")!;
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
    const notation = cssVar("--notation") || "#2a333e";
    svg.setAttribute("fill", notation);
    svg.setAttribute("stroke", notation);

    const bind = (vn: StaveNote, midi: number[]) => {
      const el = elOf(vn);
      if (el && midi.length) {
        el.style.pointerEvents = "auto";
        el.classList.add("clickable-note");
        el.addEventListener("click", () => void playNote(midi));
      }
      return el;
    };
    upperEls.current = upperNotes.map((vn, i) => bind(vn, [chords[i].a[1], chords[i].s[1]]));
    lowerEls.current = lowerNotes.map((vn, i) => bind(vn, [chords[i].b[1], chords[i].t[1]]));

    // marks (roman numeral + stacked figure) above the upper stave
    const NS = "http://www.w3.org/2000/svg";
    const labelY = upper.getYForLine(0) - 2;
    upperNotes.forEach((vn, i) => {
      const m = marks?.[i];
      if (!m) return;
      const x = vn.getAbsoluteX() + 6;
      const rm = /^([IVXivx]+)(\d)(\d)$/.exec(m);
      const roman = document.createElementNS(NS, "text");
      roman.setAttribute("x", String(rm ? x - 2 : x));
      roman.setAttribute("y", String(labelY - 2));
      roman.setAttribute("text-anchor", rm ? "end" : "middle");
      roman.setAttribute("font-size", "14.5");
      roman.setAttribute("font-style", "italic");
      roman.setAttribute("font-weight", "600");
      roman.setAttribute("font-family", NOTE_FONT);
      roman.setAttribute("fill", cssVar("--ink"));
      roman.textContent = rm ? rm[1] : m;
      svg.appendChild(roman);
      if (rm) {
        [rm[2], rm[3]].forEach((d, row) => {
          const t = document.createElementNS(NS, "text");
          t.setAttribute("x", String(x - 1));
          t.setAttribute("y", String(labelY - 11 + row * 9.5));
          t.setAttribute("text-anchor", "start");
          t.setAttribute("font-size", "10.5");
          t.setAttribute("font-weight", "600");
          t.setAttribute("font-family", NOTE_FONT);
          t.setAttribute("fill", cssVar("--ink"));
          t.textContent = d;
          svg.appendChild(t);
        });
      }
    });

    // fit the SVG to the engraved notes: low bass notes (ledger lines below
    // the lower stave) used to get clipped by the fixed height. Note bounding
    // boxes are used rather than svg.getBBox(), whose font em-boxes overshoot.
    const lowerStaffBottom = lower.getYForLine(4);
    const noteBottom = Math.max(
      lowerStaffBottom,
      ...lowerNotes.map((vn) => {
        const bb = vn.getBoundingBox();
        return bb ? bb.getY() + bb.getH() : lowerStaffBottom;
      })
    );
    const fitH = Math.max(h, Math.ceil(noteBottom) + 10);
    if (fitH > h) renderer.resize(w, fitH);
  }, [chords, marks, width, label, accidentalKey, themeVersion]);

  // playback highlight: gold on the active chord's notes in both staves
  useEffect(() => {
    const gold = cssVar("--gold");
    const paint = (els: (SVGGElement | null)[]) =>
      els.forEach((el, i) => {
        if (!el) return;
        const on = i === highlight;
        el.style.fill = on ? gold : "";
        el.style.stroke = on ? gold : "";
      });
    paint(upperEls.current);
    paint(lowerEls.current);
  }, [highlight]);

  return <div className="score" ref={ref} />;
}
