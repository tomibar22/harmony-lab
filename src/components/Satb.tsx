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
  keySig,
}: {
  chords: Satb[];
  marks?: (string | undefined)[];
  highlight: number | null;
  width?: number;
  label: string;
  accidentalKey?: string;
  keySig?: string;
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
    // staves start at x=16 so the brace (drawn to their left) isn't clipped
    const engrave = (lowerY: number) => {
      host.innerHTML = "";
      const renderer = new Renderer(host, Renderer.Backends.SVG);
      renderer.resize(w, lowerY + 90);
      const context = renderer.getContext();

      const upper = new Stave(16, upperY, w - 22);
      upper.addClef("treble");
      if (keySig) upper.addKeySignature(keySig);
      const lower = new Stave(16, lowerY, w - 22);
      lower.addClef("bass");
      if (keySig) lower.addKeySignature(keySig);
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

      const key = accidentalKey ?? keySig ?? "C";
      const upperVoice = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT);
      upperVoice.addTickables(upperNotes);
      const lowerVoice = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT);
      lowerVoice.addTickables(lowerNotes);
      Accidental.applyAccidentals([upperVoice], key);
      Accidental.applyAccidentals([lowerVoice], key);

      // one formatter over both voices → identical x-positions, aligned chords
      new Formatter().joinVoices([upperVoice]).joinVoices([lowerVoice]).format([upperVoice, lowerVoice], w - 100);
      upperVoice.draw(context, upper);
      lowerVoice.draw(context, lower);
      return { renderer, upper, lower, upperNotes, lowerNotes };
    };

    // first pass at the default grand-staff gap; if low treble notes and high
    // bass notes would collide between the staves, push the lower stave down
    let lowerY = 112;
    let engraved = engrave(lowerY);
    {
      const bbBottom = (vn: StaveNote) => {
        const bb = vn.getBoundingBox();
        return bb ? bb.getY() + bb.getH() : -Infinity;
      };
      const bbTop = (vn: StaveNote) => {
        const bb = vn.getBoundingBox();
        return bb ? bb.getY() : Infinity;
      };
      const upperBottom = Math.max(engraved.upper.getYForLine(4), ...engraved.upperNotes.map(bbBottom));
      const lowerTop = Math.min(engraved.lower.getYForLine(0), ...engraved.lowerNotes.map(bbTop));
      const overlap = upperBottom + 10 - lowerTop;
      if (overlap > 0) {
        lowerY += Math.ceil(overlap);
        engraved = engrave(lowerY);
      }
    }
    const { renderer, upper, lower, upperNotes, lowerNotes } = engraved;

    const svg = host.querySelector("svg")!;
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
    const notation = cssVar("--notation") || "#2a333e";
    svg.setAttribute("fill", notation);
    svg.setAttribute("stroke", notation);
    // ledger lines ship with a hard-coded stroke="#444" that ignores the
    // theme - strip it so they inherit the notation colour
    svg.querySelectorAll('[stroke="#444"]').forEach((el) => el.removeAttribute("stroke"));
    svg.querySelectorAll('[fill="#444"]').forEach((el) => el.removeAttribute("fill"));

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
      const rm = /^([IVXivx]+|It|Ger|Fr)(\d)(\d)$/.exec(m);
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

    // fit the SVG to the engraved content: trim dead space above the system
    // and make room for low bass notes below it. Note bounding boxes are used
    // rather than svg.getBBox(), whose font em-boxes overshoot.
    const hasMarks = !!marks?.some(Boolean);
    const upperStaffTop = upper.getYForLine(0);
    const noteTop = Math.min(
      upperStaffTop - 14,
      hasMarks ? labelY - 20 : Infinity,
      ...upperNotes.map((vn) => {
        const bb = vn.getBoundingBox();
        return bb ? bb.getY() - 4 : Infinity;
      })
    );
    const lowerStaffBottom = lower.getYForLine(4);
    const noteBottom = Math.max(
      lowerStaffBottom + 14,
      ...lowerNotes.map((vn) => {
        const bb = vn.getBoundingBox();
        return bb ? bb.getY() + bb.getH() + 4 : lowerStaffBottom;
      })
    );
    const top = Math.floor(noteTop);
    const bottom = Math.ceil(noteBottom);
    renderer.resize(w, bottom - top);
    svg.setAttribute("viewBox", `0 ${top} ${w} ${bottom - top}`);
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(bottom - top));
  }, [chords, marks, width, label, accidentalKey, keySig, themeVersion]);

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
