import { ReactNode, useCallback, useEffect, useState } from "react";

/* ---------------- progress (localStorage) ---------------- */

type UnitProgress = Record<string, boolean[]>;

const storeKey = (unitId: string) => `hl-wb-${unitId}`;

function readProgress(unitId: string): UnitProgress {
  try {
    return JSON.parse(localStorage.getItem(storeKey(unitId)) ?? "{}") as UnitProgress;
  } catch {
    return {};
  }
}

/** Per-unit workbook progress: which items of which exercise were solved. */
export function useWbProgress(unitId: string) {
  const [progress, setProgress] = useState<UnitProgress>(() => readProgress(unitId));

  const mark = useCallback(
    (exId: string, item: number, count: number) => {
      setProgress((prev) => {
        const arr = [...(prev[exId] ?? Array.from({ length: count }, () => false))];
        if (arr[item]) return prev;
        arr[item] = true;
        const next = { ...prev, [exId]: arr };
        localStorage.setItem(storeKey(unitId), JSON.stringify(next));
        return next;
      });
    },
    [unitId]
  );

  return { progress, mark };
}

export function doneCount(progress: UnitProgress, exId: string): number {
  return (progress[exId] ?? []).filter(Boolean).length;
}

/* ---------------- exercise card shell ---------------- */

type CardProps = {
  exId: string;
  title: string;
  instructions: ReactNode;
  count: number;
  done: boolean[];
  open: boolean;
  onToggle: () => void;
  /** Renders the current item. `solved` is persisted state; call markSolved(i) on success. */
  children: (item: number, solved: boolean, markSolved: () => void) => ReactNode;
  markSolved: (item: number) => void;
};

/** One workbook exercise: an accordion card holding a series of items with
 *  dot navigation and per-item persistence. One item on screen at a time. */
export function ExerciseCard({ exId, title, instructions, count, done, open, onToggle, children, markSolved }: CardProps) {
  const [item, setItem] = useState(() => {
    const firstOpen = done.findIndex((d) => !d);
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const solvedCount = done.filter(Boolean).length;

  // when opening a card, land on the first unsolved item
  useEffect(() => {
    if (open) {
      const firstOpen = done.findIndex((d) => !d);
      setItem((cur) => (done[cur] === false ? cur : firstOpen === -1 ? 0 : firstOpen));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className={"widget wb-card" + (open ? " open" : "")}>
      <button className="wb-cardhead" onClick={onToggle} aria-expanded={open}>
        <span className="wb-cardtitle">{title}</span>
        <span className={"wb-count" + (solvedCount === count ? " full" : "")}>
          {solvedCount === count ? "הושלם ✓" : `${solvedCount}/${count}`}
        </span>
      </button>
      {open && (
        <div className="wb-cardbody">
          <p className="wb-instructions">{instructions}</p>
          <div className="wb-dots" role="tablist" aria-label="פריטי התרגיל">
            {Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === item}
                className={"wb-dot" + (i === item ? " cur" : "") + (done[i] ? " done" : "")}
                onClick={() => setItem(i)}
                title={`פריט ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {/* key remounts the item body so per-item state never leaks between items */}
          <div className="wb-itembody" key={`${exId}-${item}`}>
            {children(item, done[item] ?? false, () => markSolved(item))}
          </div>
          <div className="wb-nav">
            <button className="play-btn ghost" disabled={item === 0} onClick={() => setItem((i) => i - 1)}>
              → הקודם
            </button>
            <button
              className="play-btn ghost"
              disabled={item === count - 1}
              onClick={() => setItem((i) => i + 1)}
            >
              הבא ←
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- chips (answer selection) ---------------- */

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled,
  compact,
}: {
  options: { value: T; label: ReactNode }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="wb-chips-group">
      <span className="wb-chips-label">{label}</span>
      <div className={"wb-chips" + (compact ? " compact" : "")} role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={value === o.value}
            className={"wb-chip" + (value === o.value ? " sel" : "")}
            disabled={disabled}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- shared feedback line ---------------- */

export function Feedback({ state, correct }: { state: "ok" | "bad" | null; correct?: ReactNode }) {
  if (!state) return <div className="wb-feedback" aria-live="polite" />;
  return (
    <div className="wb-feedback" aria-live="polite">
      {state === "ok" ? (
        <span className="wb-ok">נכון, כל הכבוד!</span>
      ) : (
        <span className="wb-bad">עוד לא מדויק — {correct ? <>בדקו שוב. </> : "נסו שוב."}{correct}</span>
      )}
    </div>
  );
}
