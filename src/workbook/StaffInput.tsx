import { useEffect, useRef, useState } from "react";
import { Accidental, Formatter, GhostNote, Renderer, Stave, StaveNote, Voice, Barline } from "vexflow";
import { playNote } from "../engine/audio";
import { SpelledPitch, diaOf, midiOf, pitchFromDia, vexKeyOf } from "./pitch";

export type SlotStatus = "ok" | "bad" | null;

type Props = {
  clef: "treble" | "bass";
  slots: number;
  value: (SpelledPitch | null)[];
  onChange: (next: (SpelledPitch | null)[]) => void;
  /** Locked notes (e.g. the given note of an interval exercise): rendered
   *  muted, not clickable, skipped by keyboard navigation. */
  given?: (SpelledPitch | null)[];
  status?: SlotStatus[] | null;   // set after a check; cleared on edit by the parent
  highlight?: number | null;      // playback highlight
  disabled?: boolean;
  ariaLabel?: string;
  /** Spell freshly placed notes for a key: maps a diatonic position to the
   *  key-signature alter (clicks/letters/nudges snap; explicit accidental
   *  buttons still override). Omitted = everything placed natural. */
  snapAlter?: (dia: number) => number;
};

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

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

/** Diatonic index of the staff's bottom line (line 4): E4 in treble, G2 in bass. */
const BOTTOM_LINE_DIA = { treble: 4 * 7 + 2, bass: 2 * 7 + 4 } as const;

const LETTER_KEYS: Record<string, number> = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };

/** An interactive staff: n slots, click a line/space (or type A–G) to place a
 *  note in the active slot, arrows to nudge, accidental buttons to inflect.
 *  Empty slots show a dashed placeholder. Everything plays as it's placed. */
export function StaffInput({ clef, slots, value, onChange, given, status, highlight, disabled, ariaLabel, snapAlter }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const noteEls = useRef<(SVGGElement | null)[]>([]);
  const isLocked = (i: number) => !!given?.[i];
  const firstEditable = Array.from({ length: slots }, (_, i) => i).find((i) => !isLocked(i)) ?? 0;
  const [active, setActive] = useState(firstEditable);
  const themeVersion = useThemeVersion();

  // what actually shows in each slot: a locked note wins over student input
  const shown = Array.from({ length: slots }, (_, i) => given?.[i] ?? value[i] ?? null);

  const bottomDia = BOTTOM_LINE_DIA[clef];
  // usable pitch band: a 4th below the staff to a 5th above (ledger territory)
  const minDia = bottomDia - 5;
  const maxDia = bottomDia + 13;

  const set = (i: number, p: SpelledPitch | null, play = true) => {
    if (disabled || isLocked(i)) return;
    const next = [...value];
    next[i] = p;
    onChange(next);
    if (p && play) void playNote(midiOf(p));
  };

  const place = (i: number, dia: number, alter = 0) => {
    const clamped = Math.max(minDia, Math.min(maxDia, dia));
    const a = alter === 0 && snapAlter ? snapAlter(clamped) : alter;
    set(i, pitchFromDia(clamped, a));
  };

  /* ---------- engraving ---------- */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";

    const w = Math.max(260, 70 + slots * 64);
    const staveY = 36;
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(w, 170);
    const context = renderer.getContext();

    const stave = new Stave(4, staveY, w - 10);
    stave.addClef(clef);
    stave.setBegBarType(Barline.type.NONE);
    stave.setEndBarType(Barline.type.NONE);
    stave.setContext(context).draw();

    const vexNotes = shown
      .map((p) =>
        p
          ? new StaveNote({ keys: [vexKeyOf(p)], duration: "w", clef })
          : (new GhostNote({ duration: "w" }) as unknown as StaveNote)
      );

    const voice = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT);
    voice.addTickables(vexNotes);
    // no key signature in these exercises - every inflection engraves explicitly
    Accidental.applyAccidentals([voice], "C");
    new Formatter({ softmaxFactor: 1 }).joinVoices([voice]).format([voice], w - 110);
    voice.draw(context, stave);

    const svg = host.querySelector("svg")!;
    svg.setAttribute("role", "img");
    if (ariaLabel) svg.setAttribute("aria-label", ariaLabel);
    const notation = cssVar("--notation") || "#2a333e";
    svg.setAttribute("fill", notation);
    svg.setAttribute("stroke", notation);
    svg.querySelectorAll('[stroke="#444"]').forEach((el) => el.removeAttribute("stroke"));
    svg.querySelectorAll('[fill="#444"]').forEach((el) => el.removeAttribute("fill"));

    // slot columns: x centers from the tickables (ghosts get positions too)
    const NS = "http://www.w3.org/2000/svg";
    const startX = stave.getNoteStartX();
    const colXs = vexNotes.map((vn, i) => {
      try {
        return vn.getAbsoluteX() + 6;
      } catch {
        // ghost without x (shouldn't happen post-format) - spread uniformly
        return startX + ((i + 0.5) * (w - startX)) / slots;
      }
    });
    const midY = stave.getYForLine(2);
    const lineGap = stave.getSpacingBetweenLines();

    // dashed placeholder on empty slots
    shown.forEach((p, i) => {
      if (p) return;
      const ph = document.createElementNS(NS, "ellipse");
      ph.setAttribute("cx", String(colXs[i]));
      ph.setAttribute("cy", String(midY));
      ph.setAttribute("rx", "7.5");
      ph.setAttribute("ry", "5.5");
      ph.setAttribute("fill", "none");
      ph.setAttribute("stroke-dasharray", "3 3");
      ph.setAttribute("stroke-width", "1.5");
      ph.setAttribute("opacity", "0.45");
      svg.appendChild(ph);
    });

    // active-slot marker: soft band behind the column
    if (!disabled && active < slots) {
      const band = document.createElementNS(NS, "rect");
      const half = ((colXs[1] ?? colXs[0] + 56) - colXs[0]) / 2;
      band.setAttribute("x", String(colXs[active] - Math.min(26, half)));
      band.setAttribute("y", String(staveY - 26));
      band.setAttribute("width", String(Math.min(26, half) * 2));
      band.setAttribute("height", String(4 * lineGap + 84));
      band.setAttribute("rx", "7");
      band.setAttribute("fill", cssVar("--gold-soft") || "#b98a2f2b");
      band.setAttribute("stroke", "none");
      svg.insertBefore(band, svg.firstChild);
    }

    // colour notes: locked given notes muted, status (on editable) overrides
    noteEls.current = vexNotes.map((vn, i) => {
      const el =
        (vn as unknown as { getSVGElement?: () => SVGGElement | undefined }).getSVGElement?.() ??
        (vn as unknown as { attrs?: { el?: SVGGElement } }).attrs?.el ??
        null;
      const st = isLocked(i) ? null : status?.[i];
      if (el && st) {
        const c = st === "ok" ? cssVar("--stable") : cssVar("--accent");
        el.style.fill = c;
        el.style.stroke = c;
      } else if (el && isLocked(i)) {
        const c = cssVar("--ink-soft");
        el.style.fill = c;
        el.style.stroke = c;
      }
      return el;
    });

    // click layer: one column per slot, mapped to the nearest line/space
    const hitTop = staveY - 30;
    const hitBottom = stave.getYForLine(4) + 60;
    if (!disabled) {
      colXs.forEach((cx, i) => {
        if (isLocked(i)) return;
        const half = ((colXs[1] ?? colXs[0] + 56) - colXs[0]) / 2;
        const rect = document.createElementNS(NS, "rect");
        rect.setAttribute("x", String(cx - half));
        rect.setAttribute("y", String(hitTop));
        rect.setAttribute("width", String(half * 2));
        rect.setAttribute("height", String(hitBottom - hitTop));
        rect.setAttribute("fill", "transparent");
        rect.setAttribute("stroke", "none");
        rect.style.pointerEvents = "auto";
        rect.style.cursor = "pointer";
        rect.addEventListener("click", (ev) => {
          const pt = svg.createSVGPoint();
          pt.x = ev.clientX;
          pt.y = ev.clientY;
          const loc = pt.matrixTransform(svg.getScreenCTM()!.inverse());
          const bottomY = stave.getYForLine(4);
          const step = Math.round((bottomY - loc.y) / (lineGap / 2));
          setActive(i);
          place(i, bottomDia + step, 0);
        });
        svg.appendChild(rect);
      });
    }

    // trim canvas to content
    const boxes = vexNotes.map((vn) => {
      try {
        return vn.getBoundingBox();
      } catch {
        return null;
      }
    });
    const top = Math.min(staveY - 24, ...boxes.map((bb) => (bb ? bb.getY() - 4 : Infinity)));
    const bottom = Math.max(
      stave.getYForLine(4) + 26,
      ...boxes.map((bb) => (bb ? bb.getY() + bb.getH() + 4 : -Infinity))
    );
    renderer.resize(w, bottom - top);
    svg.setAttribute("viewBox", `0 ${Math.floor(top)} ${w} ${Math.ceil(bottom - top)}`);
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(Math.ceil(bottom - top)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, given, slots, clef, status, active, disabled, themeVersion]);

  // playback highlight
  useEffect(() => {
    const gold = cssVar("--gold");
    noteEls.current.forEach((el, i) => {
      if (!el) return;
      const st = isLocked(i) ? null : status?.[i];
      const base = st
        ? st === "ok"
          ? cssVar("--stable")
          : cssVar("--accent")
        : isLocked(i)
          ? cssVar("--ink-soft")
          : "";
      el.style.fill = i === highlight ? gold : base;
      el.style.stroke = i === highlight ? gold : base;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, status]);

  /* ---------- keyboard ---------- */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const cur = value[active] ?? null;
    const k = e.key.toLowerCase();
    if (k in LETTER_KEYS) {
      // enter the letter at the position closest to the current note (or mid-staff)
      const refDia = cur ? diaOf(cur) : bottomDia + 4;
      const letter = LETTER_KEYS[k];
      let dia = Math.floor(refDia / 7) * 7 + letter;
      const cands = [dia - 7, dia, dia + 7].filter((d) => d >= minDia && d <= maxDia);
      dia = cands.reduce((best, d) => (Math.abs(d - refDia) < Math.abs(best - refDia) ? d : best), cands[0]);
      place(active, dia, 0);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const delta = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 7 : 1);
      if (cur) place(active, diaOf(cur) + delta, e.shiftKey ? cur.alter : 0);
      else place(active, bottomDia + 4, 0);
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      // the staff is LTR: ArrowRight = next slot; locked slots are skipped
      const delta = e.key === "ArrowRight" ? 1 : -1;
      setActive((a) => {
        let n = a + delta;
        while (n >= 0 && n < slots && isLocked(n)) n += delta;
        return n >= 0 && n < slots ? n : a;
      });
      e.preventDefault();
    } else if (e.key === "Backspace" || e.key === "Delete") {
      set(active, null, false);
      e.preventDefault();
    } else if (e.key === "#" || e.key === "+") {
      if (cur) set(active, { ...cur, alter: Math.min(2, cur.alter + 1) });
    } else if (e.key === "-" || e.key === "b") {
      if (cur) set(active, { ...cur, alter: Math.max(-2, cur.alter - 1) });
    } else if (e.key === "0" || e.key === "=") {
      if (cur) set(active, { ...cur, alter: 0 });
    } else if (e.key === "Tab" && !e.shiftKey && active < slots - 1) {
      setActive((a) => {
        let n = a + 1;
        while (n < slots && isLocked(n)) n += 1;
        return n < slots ? n : a;
      });
      e.preventDefault();
    }
  };

  const setAlter = (alter: number) => {
    const cur = value[active];
    if (!cur) return;
    set(active, { ...cur, alter });
  };
  const curAlter = value[active]?.alter;

  return (
    <div className="staff-input">
      <div
        className="si-staff"
        ref={hostRef}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
        role="application"
        aria-label={ariaLabel ?? "חמשה להזנת תווים"}
      />
      {!disabled && (
        <div className="si-toolbar" dir="rtl">
          <div className="si-accs" role="group" aria-label="הזזת הצליל">
            <button
              className="si-acc si-nudge"
              onClick={() => value[active] && place(active, diaOf(value[active]!) + 1)}
              disabled={!value[active]}
              aria-label="הזזת הצליל מעלה"
            >
              ▲
            </button>
            <button
              className="si-acc si-nudge"
              onClick={() => value[active] && place(active, diaOf(value[active]!) - 1)}
              disabled={!value[active]}
              aria-label="הזזת הצליל מטה"
            >
              ▼
            </button>
          </div>
          <div className="si-accs" role="group" aria-label="סימני היתק">
            {[
              { a: 2, g: "𝄪" },
              { a: 1, g: "♯" },
              { a: 0, g: "♮" },
              { a: -1, g: "♭" },
              { a: -2, g: "𝄫" },
            ].map(({ a, g }) => (
              <button
                key={a}
                className={"si-acc" + (curAlter === a && a !== 0 ? " on" : "")}
                onClick={() => setAlter(a)}
                disabled={!value[active]}
                aria-label={`סימן היתק ${g}`}
              >
                {g}
              </button>
            ))}
          </div>
          <button className="si-acc si-del" onClick={() => set(active, null, false)} disabled={!value[active]}>
            מחיקה
          </button>
          <span className="si-hint">לחיצה על החמשה מניחה תו · חיצים מזיזים · A–G במקלדת</span>
        </div>
      )}
    </div>
  );
}
