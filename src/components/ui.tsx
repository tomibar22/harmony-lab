import { ReactNode, cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { SeqEvent, useSequencePlayer } from "../engine/audio";

export type Player = ReturnType<typeof useSequencePlayer>;

/* ---------- inline scale degree with a proper caret ---------- */
export function Deg({ n, kind }: { n: string | number; kind?: "stable" | "active" }) {
  const cls = kind === "stable" ? "deg stable-c" : kind === "active" ? "deg active-c" : "deg";
  return (
    <span className={cls} aria-label={`דרגה ${n}`}>
      <span className="caret" aria-hidden>
        ⌃
      </span>
      <span className="num">{n}</span>
    </span>
  );
}

/* ---------- figured-bass numbers, stacked in the traditional layout ---------- */
export function Fig({ n }: { n: string }) {
  const digits = n.split("/");
  return (
    <span className="fig" aria-label={`ספרור ${n}`} dir="ltr">
      {digits.map((d, i) => (
        <span key={i}>{d}</span>
      ))}
    </span>
  );
}

/* ---------- roman numeral with a stacked figure: <Rn n="V65"/> → V + 6-over-5 ---------- */
export function Rn({ n }: { n: string }) {
  const m = /^([IVXivx]+)(\d)(\d)$/.exec(n);
  if (!m) return <span dir="ltr">{n}</span>;
  return (
    <span className="rn" dir="ltr">
      {m[1]}
      <Fig n={`${m[2]}/${m[3]}`} />
    </span>
  );
}

/* ---------- plain string → text with music tokens isolated and engraved ----------
   Hebrew is RTL, but chord symbols are LTR material: in RTL flow "♭II6" renders
   with the flat on the wrong side and "ii°" with the circle misplaced. This
   catches every chord-symbol token - accidental + roman (or It/Ger/Fr) +
   quality + figures (stacked when doubled) + trailing alteration - plus bare
   "6/5" figures and lone "♭2"-style degrees, and wraps each in an LTR isolate.
   Used by titles, blurbs, drill options and (via bidi()) all lesson prose. */
const MUSIC_TOKEN =
  /(?<![A-Za-z])([♭♯]?)(It|Ger|Fr|[IVX]+|[ivx]+)(°|ø)?(?:(\d)\/?(\d)|(\d))?([♭♯]\d?)?(?![A-Za-z])|(?<![\d/])(\d)\/(\d)(?![\d/])|[♭♯]\d/g;

/* a progression/degree chain: tokens joined by dashes ("I–IV6–V–I", "5–6",
   "T–S–D–T"). The whole chain must be one LTR unit - isolating only the
   individual tokens leaves the chain itself reading right-to-left. */
const CHAIN_TOKEN =
  "(?:[♭♯]?(?:It|Ger|Fr|[IVX]+|[ivx]+)(?:°|ø)?(?:\\d\\/?\\d|\\d)?(?:[♭♯]\\d)?|[♭♯]\\d|\\d{1,2}(?:\\/\\d)?|[TSD])";
const MUSIC_CHAIN = new RegExp(
  `(?<![A-Za-z\\d])${CHAIN_TOKEN}(?:[–—-]${CHAIN_TOKEN})+(?![A-Za-z\\d])`,
  "g"
);

/** single-token pass: isolate each music token and stack its figures */
function renderMusicRuns(text: string, prefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(MUSIC_TOKEN)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    k += 1;
    if (m[2]) {
      parts.push(
        <span key={`${prefix}${k}`} className="rn" dir="ltr">
          {m[1]}
          {m[2]}
          {m[3]}
          {m[4] ? <Fig n={`${m[4]}/${m[5]}`} /> : m[6]}
          {m[7]}
        </span>
      );
    } else if (m[8]) {
      parts.push(<Fig key={`${prefix}${k}`} n={`${m[8]}/${m[9]}`} />);
    } else {
      parts.push(
        <span key={`${prefix}${k}`} dir="ltr">
          {m[0]}
        </span>
      );
    }
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/* an arrow ("goes to") connector: a bare ← → ↔ with only spaces/bidi marks
   around it. Isolated LTR music tokens on either side of such an arrow scramble
   in RTL flow (each token is its own LTR run and the neutral arrow reorders
   them). A chord/degree progression is LTR material - like the dash chains -
   so a run of "token → arrow → token" is laid out as one LTR island: the
   symbols read left-to-right (II V I ends on I at the right) and the arrows are
   normalized to point rightward, matching the reading direction. The source may
   author them as leftward ← (the "goes to" glyph used inside Hebrew prose); the
   token order is unchanged, only the layout and glyph direction flip. */
const ARROW_ONLY = /^[\s‎‏]*[←→↔⇐⇒⇔][\s‎‏]*$/;
const isArrowStr = (n: ReactNode) => typeof n === "string" && ARROW_ONLY.test(n);
const rightward = (s: string) => s.replace(/←/g, "→").replace(/⇐/g, "⇒");

function groupArrows(parts: ReactNode[]): ReactNode[] {
  const out: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (isValidElement(parts[i]) && isArrowStr(parts[i + 1]) && isValidElement(parts[i + 2])) {
      const run: ReactNode[] = [parts[i]];
      let j = i + 1;
      while (isArrowStr(parts[j]) && isValidElement(parts[j + 1])) {
        run.push(rightward(parts[j] as string), parts[j + 1]);
        j += 2;
      }
      out.push(
        <span key={`flow-${i}`} className="rn-flow" dir="ltr">
          {run.map((r, ri) => (isValidElement(r) ? cloneElement(r, { key: r.key ?? `f-${ri}` }) : r))}
        </span>
      );
      i = j - 1;
    } else {
      out.push(parts[i]);
    }
  }
  return out;
}

export function FigText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(MUSIC_CHAIN)) {
    if (m.index! > last) parts.push(...renderMusicRuns(text.slice(last, m.index), `t${k}-`));
    k += 1;
    parts.push(
      <span key={`chain${k}`} className="rn" dir="ltr">
        {renderMusicRuns(m[0], `c${k}-`)}
      </span>
    );
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(...renderMusicRuns(text.slice(last), `t${k + 1}-`));
  return <>{groupArrows(parts)}</>;
}

/* ---------- recursive bidi fixer for lesson prose ----------
   walks a JSX tree and routes every text node through FigText, so chord
   symbols inside paragraphs, callouts, review chips and widget captions are
   LTR-isolated without marking them up by hand. Elements that declare their
   own dir are left untouched. */
export function bidi(node: ReactNode): ReactNode {
  if (node == null || typeof node === "boolean" || typeof node === "number") return node;
  if (typeof node === "string") {
    return /[A-Za-z♭♯]|\d\/\d/.test(node) ? <FigText text={node} /> : node;
  }
  if (Array.isArray(node)) {
    // element chains: <Deg/>–<Deg/> (or <Fig/>–<Fig/>) sequences read
    // right-to-left in RTL flow - group each run into one LTR isolate
    const isDegFig = (n: ReactNode) =>
      isValidElement(n) && (n.type === Deg || n.type === Fig || n.type === Rn);
    const isDash = (n: ReactNode) => typeof n === "string" && /^[–—-]+$/.test(n);
    const grouped: ReactNode[] = [];
    for (let i = 0; i < node.length; i++) {
      if (isDegFig(node[i]) && isDash(node[i + 1]) && isDegFig(node[i + 2])) {
        const run: ReactNode[] = [node[i]];
        let j = i + 1;
        while (isDash(node[j]) && isDegFig(node[j + 1])) {
          run.push(node[j], node[j + 1]);
          j += 2;
        }
        grouped.push(
          <span key={`chain-${i}`} className="rn" dir="ltr">
            {run.map((r, ri) =>
              isValidElement(r) ? cloneElement(r, { key: r.key ?? `cr-${ri}` }) : r
            )}
          </span>
        );
        i = j - 1;
      } else {
        grouped.push(node[i]);
      }
    }
    return grouped.map((n, i) => {
      const r = bidi(n);
      return isValidElement(r) ? cloneElement(r, { key: r.key ?? `bidi-${i}` }) : r;
    });
  }
  if (isValidElement(node)) {
    const props = node.props as { dir?: string; children?: ReactNode; foot?: ReactNode };
    if (props.dir) return node; // explicit direction: leave alone
    const patch: { children?: ReactNode; foot?: ReactNode } = {};
    if (props.children !== undefined) patch.children = bidi(props.children);
    if (props.foot !== undefined) patch.foot = bidi(props.foot);
    if (patch.children === undefined && patch.foot === undefined) return node;
    return cloneElement(node, patch);
  }
  return node;
}

/* ---------- play button bound to a sequence player ---------- */
export function PlayButton({
  label,
  events,
  bpm = 100,
  player,
  ghost,
}: {
  label: ReactNode;
  events: SeqEvent[];
  bpm?: number;
  player: Player;
  ghost?: boolean;
}) {
  return (
    <button
      className={`play-btn${ghost ? " ghost" : ""}${player.playing ? " playing" : ""}`}
      onClick={() => (player.playing ? player.stop() : void player.play(events, bpm))}
    >
      <span aria-hidden>{player.playing ? "◼" : "▶"}</span>
      {player.playing ? "עצרו" : label}
    </button>
  );
}

/** Convenience: a widget-local player. */
export function usePlayer() {
  return useSequencePlayer();
}

/* ---------- widget frame ---------- */
export function Widget({
  title,
  children,
  foot,
  legend,
}: {
  title: string;
  children: ReactNode;
  foot?: ReactNode;
  legend?: ReactNode;
}) {
  return (
    <figure className="widget" style={{ margin: "1.6rem 0" }}>
      <div className="w-head">
        <figcaption className="w-title"><FigText text={title} /></figcaption>
        {legend && <div className="legend">{legend}</div>}
      </div>
      <div className="w-body">{children}</div>
      {foot && <div className="w-foot">{foot}</div>}
    </figure>
  );
}

/* ---------- lesson scaffolding ---------- */
export function Section({
  id,
  num,
  title,
  children,
}: {
  id: string;
  num: string;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section id={id} ref={ref} className={`lesson-section reveal${visible ? " visible" : ""}`} data-toc={title}>
      <h2>
        <span className="secnum">{num}</span>
        <FigText text={title} />
      </h2>
      <div className="prose">{bidi(children)}</div>
    </section>
  );
}

export function Callout({ label, children, insight }: { label: string; children: ReactNode; insight?: boolean }) {
  return (
    <aside className={`callout${insight ? " insight" : ""}`}>
      <span className="c-label">{label}</span>
      {children}
    </aside>
  );
}

/* ---------- glossary term: Hebrew + inline English gloss, hover for the definition ---------- */
export function Term({ he, en, def }: { he: string; en: string; def: string }) {
  return (
    <span className="term" tabIndex={0}>
      <span className="term-he">{he}</span>
      <span className="term-en" dir="ltr">{en}</span>
      <span className="tip" role="tooltip"><FigText text={def} /></span>
    </span>
  );
}
