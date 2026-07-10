import { ReactNode, useMemo, useState } from "react";

export type Question = {
  prompt: ReactNode;
  options: string[];
  answer: string;
  explain?: ReactNode;
};

type Props = {
  title: string;
  generate: () => Question;
};

export function Drill({ title, generate }: Props) {
  const [seed, setSeed] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);

  const q = useMemo(() => generate(), [seed, generate]);

  const answer = (opt: string) => {
    if (chosen) return;
    setChosen(opt);
    setTotal((t) => t + 1);
    if (opt === q.answer) {
      setCorrect((c) => c + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  };

  const next = () => {
    setChosen(null);
    setSeed((s) => s + 1);
  };

  return (
    <div className="widget drill">
      <div className="w-head">
        <div className="w-title">{title}</div>
        <div className="d-stats">
          {total > 0 && (
            <>
              {correct}/{total} נכונות
              {streak >= 3 && <span className="d-streak"> · רצף {streak} 🔥</span>}
            </>
          )}
        </div>
      </div>
      <div className="d-prompt">{q.prompt}</div>
      <div className="d-options">
        {q.options.map((opt) => {
          let cls = "d-opt";
          if (chosen) {
            if (opt === q.answer) cls += " correct";
            else if (opt === chosen) cls += " wrong";
          }
          return (
            <button key={opt} className={cls} disabled={!!chosen} onClick={() => answer(opt)}>
              {opt}
            </button>
          );
        })}
      </div>
      <div className="d-feedback" aria-live="polite">
        {chosen &&
          (chosen === q.answer ? (
            <span style={{ color: "var(--stable)", fontWeight: 700 }}>נכון! {q.explain}</span>
          ) : (
            <span>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>התשובה: {q.answer}. </span>
              {q.explain}
            </span>
          ))}
      </div>
      {chosen && (
        <div className="w-foot">
          <button className="play-btn ghost" onClick={next}>
            שאלה הבאה ←
          </button>
        </div>
      )}
    </div>
  );
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
