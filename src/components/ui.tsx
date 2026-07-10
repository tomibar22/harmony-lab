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

/* ---------- play button bound to a sequence player ---------- */
export function PlayButton({
  label,
  events,
  bpm = 100,
  player,
  ghost,
}: {
  label: string;
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
        <figcaption className="w-title">{title}</figcaption>
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
        {title}
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

/* ---------- glossary term with hover definition ---------- */
export function Term({ he, en, def }: { he: string; en: string; def: string }) {
  return (
    <span className="term" tabIndex={0}>
      {he}
      <span className="tip" role="tooltip">
        {def}
        <span className="en">{en}</span>
      </span>
    </span>
  );
}
