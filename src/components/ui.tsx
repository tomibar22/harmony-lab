import { ReactNode, useEffect, useRef, useState } from "react";
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

/* ---------- plain string → text with every inversion figure stacked ----------
   catches "V65"-style tokens (roman + two digits) and bare "6/5" figures,
   so registry titles, blurbs and widget captions render traditionally. */
const FIG_TOKEN = /([IVXivx]+)(\d)(\d)|(\d)\/(\d)/g;

export function FigText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(FIG_TOKEN)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<Rn key={m.index} n={m[0]} />);
    else parts.push(<Fig key={m.index} n={`${m[4]}/${m[5]}`} />);
    last = m.index! + m[0].length;
  }
  if (parts.length === 0) return <>{text}</>;
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
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
      <div className="prose">{children}</div>
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
      <span className="tip" role="tooltip">{def}</span>
    </span>
  );
}
