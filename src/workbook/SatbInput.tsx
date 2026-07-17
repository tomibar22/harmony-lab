import { useEffect, useRef, useState } from "react";
import { Accidental, Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice } from "vexflow";
import { playNote } from "../engine/audio";
import { VOICE_HE, VoiceName } from "../engine/voiceLeading";
import { SpelledPitch, diaOf, midiOf, pitchFromDia, vexKeyOf } from "./pitch";

export type SatbValue = Record<VoiceName, SpelledPitch | null>;
export type SatbStatus = Partial<Record<VoiceName, "ok" | "bad" | null>>;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

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

/** Diatonic index of each staff's bottom line: E4 (treble), G2 (bass). */
const TREBLE_BOTTOM = 30;
const BASS_BOTTOM = 18;

const STAFF_OF: Record<VoiceName, "treble" | "bass"> = { s: "treble", a: "treble", t: "bass", b: "bass" };
/** Fill order - from the bass up, the way the book teaches. */
const FILL_ORDER: VoiceName[] = ["b", "t", "a", "s"];

const LETTER_KEYS: Record<string, number> = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };

/** A single SATB chord on an editable grand staff. Pick a voice (or let the
 *  bass-to-soprano auto-advance drive), click a line/space to place its note;
 *  soprano/alto live on the treble staff, tenor/bass on the bass staff. */
export function SatbInput({
  value,
  onChange,
  status,
  disabled,
  ariaLabel,
}: {
  value: SatbValue;
  onChange: (next: SatbValue) => void;
  status?: SatbStatus | null;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const noteEls = useRef<Partial<Record<VoiceName, SVGGElement | null>>>({});
  const firstEmpty = FILL_ORDER.find((v) => !value[v]) ?? "s";
  const [active, setActive] = useState<VoiceName>(firstEmpty);
  const themeVersion = useThemeVersion();

  const set = (voice: VoiceName, p: SpelledPitch | null, play = true) => {
    if (disabled) return;
    onChange({ ...value, [voice]: p });
    if (p && play) void playNote(midiOf(p));
    // focus STAYS on the voice just written, so accidentals and the nudge
    // arrows apply to it; the next staff click finds the next empty voice
    // by itself (see the placement-priority rule in the click handler)
    if (p) setActive(voice);
  };

  /** Move the active voice's note by diatonic steps (accidental resets). */
  const nudge = (delta: number) => {
    const cur = value[active];
    if (!cur || disabled) return;
    const bottomDia = STAFF_OF[active] === "treble" ? TREBLE_BOTTOM : BASS_BOTTOM;
    const dia = Math.max(bottomDia - 6, Math.min(bottomDia + 13, diaOf(cur) + delta));
    set(active, pitchFromDia(dia, 0));
  };

  /* ---------- engraving ---------- */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";

    const w = 300;
    const upperY = 30;
    const lowerY = 128;
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(w, lowerY + 100);
    const context = renderer.getContext();

    const upper = new Stave(16, upperY, w - 22);
    upper.addClef("treble");
    const lower = new Stave(16, lowerY, w - 22);
    lower.addClef("bass");
    upper.setContext(context).draw();
    lower.setContext(context).draw();
    new StaveConnector(upper, lower).setType(StaveConnector.type.BRACE).setContext(context).draw();
    new StaveConnector(upper, lower).setType(StaveConnector.type.SINGLE_LEFT).setContext(context).draw();

    // one VexFlow voice per SATB voice so noteheads stay individually addressable
    const mkNote = (p: SpelledPitch, clef: "treble" | "bass") =>
      new StaveNote({ keys: [vexKeyOf(p)], duration: "w", clef });
    const entries: { voice: VoiceName; note: StaveNote | null }[] = (["s", "a", "t", "b"] as VoiceName[]).map(
      (vn) => ({ voice: vn, note: value[vn] ? mkNote(value[vn]!, STAFF_OF[vn]) : null })
    );

    const vexVoices: Voice[] = [];
    const drawPlan: { vv: Voice; stave: Stave }[] = [];
    for (const { voice, note } of entries) {
      if (!note) continue;
      const vv = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT);
      vv.addTickables([note]);
      vexVoices.push(vv);
      drawPlan.push({ vv, stave: STAFF_OF[voice] === "treble" ? upper : lower });
    }
    if (vexVoices.length) {
      Accidental.applyAccidentals(vexVoices, "C");
      const fmt = new Formatter();
      vexVoices.forEach((vv) => fmt.joinVoices([vv]));
      fmt.format(vexVoices, w - 140);
      drawPlan.forEach(({ vv, stave }) => vv.draw(context, stave));
    }

    const svg = host.querySelector("svg")!;
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", ariaLabel ?? "אקורד בארבעה קולות");
    const notation = cssVar("--notation") || "#2a333e";
    svg.setAttribute("fill", notation);
    svg.setAttribute("stroke", notation);
    svg.querySelectorAll('[stroke="#444"]').forEach((el) => el.removeAttribute("stroke"));
    svg.querySelectorAll('[fill="#444"]').forEach((el) => el.removeAttribute("fill"));

    // colour per voice: status > active marker
    noteEls.current = {};
    entries.forEach(({ voice, note }) => {
      if (!note) return;
      const el =
        (note as unknown as { getSVGElement?: () => SVGGElement | undefined }).getSVGElement?.() ??
        (note as unknown as { attrs?: { el?: SVGGElement } }).attrs?.el ??
        null;
      noteEls.current[voice] = el;
      if (!el) return;
      const st = status?.[voice];
      const c = st === "ok" ? cssVar("--stable") : st === "bad" ? cssVar("--accent") : voice === active && !disabled ? cssVar("--gold") : "";
      if (c) {
        el.style.fill = c;
        el.style.stroke = c;
      }
    });

    const NS = "http://www.w3.org/2000/svg";

    // dashed placeholders for empty voices, stacked at the staff midline
    const midX = 16 + (w - 22) / 2 + 20;
    (["s", "a", "t", "b"] as VoiceName[]).forEach((vn) => {
      if (value[vn]) return;
      const stave = STAFF_OF[vn] === "treble" ? upper : lower;
      const y = stave.getYForLine(2) + (vn === "a" || vn === "b" ? 9 : -9);
      const ph = document.createElementNS(NS, "ellipse");
      ph.setAttribute("cx", String(midX + (vn === "a" || vn === "b" ? 16 : -16)));
      ph.setAttribute("cy", String(y));
      ph.setAttribute("rx", "7.5");
      ph.setAttribute("ry", "5.5");
      ph.setAttribute("fill", "none");
      ph.setAttribute("stroke-dasharray", "3 3");
      ph.setAttribute("stroke-width", "1.5");
      ph.setAttribute("opacity", vn === active && !disabled ? "0.9" : "0.35");
      if (vn === active && !disabled) ph.setAttribute("stroke", cssVar("--gold"));
      svg.appendChild(ph);
    });

    // click layers: one rect per staff, mapped to that staff's pitch space
    if (!disabled) {
      const staves: { stave: Stave; bottomDia: number; kind: "treble" | "bass" }[] = [
        { stave: upper, bottomDia: TREBLE_BOTTOM, kind: "treble" },
        { stave: lower, bottomDia: BASS_BOTTOM, kind: "bass" },
      ];
      staves.forEach(({ stave, bottomDia, kind }) => {
        const rect = document.createElementNS(NS, "rect");
        const top = stave.getYForLine(0) - 28;
        const bottom = stave.getYForLine(4) + 28;
        rect.setAttribute("x", "56");
        rect.setAttribute("y", String(top));
        rect.setAttribute("width", String(w - 66));
        rect.setAttribute("height", String(bottom - top));
        rect.setAttribute("fill", "transparent");
        rect.setAttribute("stroke", "none");
        rect.style.pointerEvents = "auto";
        rect.style.cursor = "pointer";
        rect.addEventListener("click", (ev) => {
          const pt = svg.createSVGPoint();
          pt.x = ev.clientX;
          pt.y = ev.clientY;
          const loc = pt.matrixTransform(svg.getScreenCTM()!.inverse());
          const lineGap = stave.getSpacingBetweenLines();
          const step = Math.round((stave.getYForLine(4) - loc.y) / (lineGap / 2));
          const dia = Math.max(bottomDia - 6, Math.min(bottomDia + 13, bottomDia + step));
          // the click names a staff: place the active voice if it lives here,
          // otherwise fall to this staff's first empty (or lower) voice
          const voices: VoiceName[] = kind === "treble" ? ["s", "a"] : ["t", "b"];
          // empty voices fill bottom-up (bass before tenor, alto before soprano)
          const fillOrder: VoiceName[] = kind === "treble" ? ["a", "s"] : ["b", "t"];
          // placement priority: the active voice if it's here and still empty;
          // otherwise this staff's lowest empty voice; otherwise (all filled)
          // the active voice if it's here, so clicks keep editing it
          const fallback: VoiceName =
            voices.includes(active) && !value[active]
              ? active
              : fillOrder.find((v) => !value[v]) ??
                (voices.includes(active) ? active : fillOrder[0]);
          // grab-to-correct: tapping ON an existing note selects and moves it
          // instead of stacking the next voice on top of it. A near-miss
          // (one step away) grabs only when nothing new would be placed.
          const near = voices
            .filter((v) => value[v] && Math.abs(diaOf(value[v]!) - dia) <= 1)
            .sort(
              (x, y) => Math.abs(diaOf(value[x]!) - dia) - Math.abs(diaOf(value[y]!) - dia)
            )[0];
          const exactHit = near && Math.abs(diaOf(value[near]!) - dia) === 0;
          const target: VoiceName = near && (exactHit || value[fallback]) ? near : fallback;
          setActive(target);
          setTimeout(() => set(target, pitchFromDia(dia, 0)), 0);
        });
        svg.appendChild(rect);
      });
    }

    // trim to the real content: keep the full clickable band around both
    // staves and stretch further when ledger-line notes poke out of it
    const boxes = entries
      .map(({ note }) => {
        try {
          return note?.getBoundingBox() ?? null;
        } catch {
          return null;
        }
      })
      .filter((bb): bb is NonNullable<typeof bb> => !!bb);
    const top = Math.floor(
      Math.min(upper.getYForLine(0) - 30, ...boxes.map((bb) => bb.getY() - 5))
    );
    const bottom = Math.ceil(
      Math.max(lower.getYForLine(4) + 30, ...boxes.map((bb) => bb.getY() + bb.getH() + 6))
    );
    renderer.resize(w, bottom - top);
    svg.setAttribute("viewBox", `0 ${top} ${w} ${bottom - top}`);
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(bottom - top));
    // VexFlow pins inline width/height; clear them so the stylesheet can
    // scale the staff up (bigger touch targets, especially on phones)
    svg.style.width = "";
    svg.style.height = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), JSON.stringify(status ?? null), active, disabled, themeVersion]);

  /* ---------- keyboard ---------- */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const cur = value[active];
    const k = e.key.toLowerCase();
    const bottomDia = STAFF_OF[active] === "treble" ? TREBLE_BOTTOM : BASS_BOTTOM;
    if (k in LETTER_KEYS) {
      const refDia = cur ? diaOf(cur) : bottomDia + 4;
      let dia = Math.floor(refDia / 7) * 7 + LETTER_KEYS[k];
      const cands = [dia - 7, dia, dia + 7];
      dia = cands.reduce((best, d) => (Math.abs(d - refDia) < Math.abs(best - refDia) ? d : best), cands[0]);
      set(active, pitchFromDia(dia, 0));
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const delta = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 7 : 1);
      if (cur) set(active, pitchFromDia(diaOf(cur) + delta, e.shiftKey ? cur.alter : 0));
      else set(active, pitchFromDia(bottomDia + 4, 0));
      e.preventDefault();
    } else if (e.key === "Backspace" || e.key === "Delete") {
      set(active, null, false);
      e.preventDefault();
    } else if (e.key === "#" || e.key === "+") {
      if (cur) set(active, { ...cur, alter: Math.min(2, cur.alter + 1) }, true);
    } else if (e.key === "-" || e.key === "b") {
      if (cur) set(active, { ...cur, alter: Math.max(-2, cur.alter - 1) }, true);
    } else if (e.key === "0" || e.key === "=") {
      if (cur) set(active, { ...cur, alter: 0 }, true);
    } else if (e.key === "Tab") {
      const order = e.shiftKey ? [...FILL_ORDER].reverse() : FILL_ORDER;
      const i = order.indexOf(active);
      setActive(order[(i + 1) % 4]);
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
    <div className="staff-input satb-input">
      <div className="si-voices" dir="rtl" role="group" aria-label="בחירת קול">
        {FILL_ORDER.map((vn) => (
          <button
            key={vn}
            className={"si-voice" + (active === vn ? " on" : "") + (value[vn] ? " filled" : "")}
            onClick={() => setActive(vn)}
            disabled={disabled}
          >
            {VOICE_HE[vn]}
          </button>
        ))}
      </div>
      <div
        className="si-staff"
        ref={hostRef}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
        role="application"
        aria-label={ariaLabel ?? "חמשה כפולה להזנת אקורד"}
      />
      {!disabled && (
        <div className="si-toolbar" dir="rtl">
          <div className="si-accs" role="group" aria-label="הזזת הצליל">
            <button
              className="si-acc si-nudge"
              onClick={() => nudge(1)}
              disabled={!value[active]}
              aria-label="הזזת הצליל מעלה"
            >
              ▲
            </button>
            <button
              className="si-acc si-nudge"
              onClick={() => nudge(-1)}
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
          <span className="si-hint">בונים מהבס למעלה · הקשה על תו קיים בוחרת אותו · ▲▼ מכווננים</span>
        </div>
      )}
    </div>
  );
}
