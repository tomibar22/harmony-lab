import { ComponentType, lazy } from "react";

export type UnitMeta = {
  id: string;
  num: number;
  title: string;
  blurb: string;
  ready: boolean;
  component?: ComponentType;
};

export const UNITS: UnitMeta[] = [
  {
    id: "01",
    num: 1,
    title: "מפתח, סולמות ומודוסים",
    blurb: "טוניקה ודרגות, יציב ופעיל, סימני היתק, שלוש צורות המינור ושבעת המודוסים.",
    ready: true,
    component: lazy(() => import("./unit01/Unit01").then((m) => ({ default: m.Unit01 }))),
  },
  { id: "02", num: 2, title: "מרווחים", blurb: "זיהוי ובנייה, סדרת העליות, קונסוננס ודיסוננס.", ready: false },
  { id: "03", num: 3, title: "מקצב ומשקל", blurb: "ארגון ריתמי וטיפול בדיסוננס בזמן.", ready: false },
  { id: "04", num: 4, title: "משולשים וספטאקורדים", blurb: "אבני הבניין של ההרמוניה הטונאלית.", ready: false },
  { id: "05", num: 5, title: "מבוא לקונטרפונקט", blurb: "חמשת המינים וקאנטוס פירמוס.", ready: false },
  { id: "06", num: 6, title: "כתיבה בארבעה קולות", blurb: "בניית אקורדים והובלת קולות במרקם כוראלי.", ready: false },
];
