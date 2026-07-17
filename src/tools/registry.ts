import { ComponentType, lazy } from "react";

/** Standalone interactive tools - the lab's workbench, alongside the units.
 *  Each tool is self-contained under src/tools/<id>/ and must not require
 *  touching other tools or units. */
export type ToolMeta = {
  id: string;
  title: string;
  blurb: string;
  ready: boolean;
  component?: ComponentType;
};

export const TOOLS: ToolMeta[] = [
  {
    id: "harmonizer",
    title: "סדנת ההרמוניזציה",
    blurb:
      "מזינים קו סופרן - והכלי מוצא את כל ההרמוניזציות בארבעה קולות שעומדות בכללי הובלת הקולות, מדורגות מהחלקה ביותר.",
    ready: true,
    component: lazy(() =>
      import("./harmonizer/Harmonizer").then((m) => ({ default: m.Harmonizer }))
    ),
  },
];
