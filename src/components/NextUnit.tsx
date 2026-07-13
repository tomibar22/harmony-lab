import { ReactNode } from "react";
import { UNITS } from "../units/registry";
import { FigText, bidi } from "./ui";

/** End-of-lesson teaser with a link to the next unit (when it exists). */
export function NextUnit({ current, children }: { current: number; children: ReactNode }) {
  const next = UNITS.find((u) => u.num === current + 1);
  return (
    <div className="next-unit">
      <p style={{ margin: 0 }}>{bidi(children)}</p>
      {next?.ready && (
        <a className="next-link" href={`#/unit/${next.id}`}>
          המשיכו ליחידה {next.num}: <FigText text={next.title} /> ←
        </a>
      )}
    </div>
  );
}
