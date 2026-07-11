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
    title: "סולמות, דרגות ומודוסים",
    blurb: "טוניקה ודרגות, יציב ופעיל, סימני היתק, שלוש צורות המינור ושבעת המודוסים.",
    ready: true,
    component: lazy(() => import("./unit01/Unit01").then((m) => ({ default: m.Unit01 }))),
  },
  {
    id: "02",
    num: 2,
    title: "מרווחים",
    blurb: "גודל ואיכות, היפוך, סדרת העליונים, קונסוננס ודיסוננס והטריטון.",
    ready: true,
    component: lazy(() => import("./unit02/Unit02").then((m) => ({ default: m.Unit02 }))),
  },
  {
    id: "03",
    num: 3,
    title: "מקצב ומשקל",
    blurb: "פעמה וטמפו, ערכי משך, משקלים פשוטים ומורכבים, סינקופה ואנאקרוזה.",
    ready: true,
    component: lazy(() => import("./unit03/Unit03").then((m) => ({ default: m.Unit03 }))),
  },
  {
    id: "04",
    num: 4,
    title: "משולשים וספטאקורדים",
    blurb: "ארבע איכויות, ספרות רומיות, היפוכים ובס ממוספר, וספטאקורד הדומיננטה.",
    ready: true,
    component: lazy(() => import("./unit04/Unit04").then((m) => ({ default: m.Unit04 }))),
  },
  {
    id: "05",
    num: 5,
    title: "מבוא לקונטרפונקט",
    blurb: "קאנטוס פירמוס, סוגי תנועה, חמשת המינים וההשהיה.",
    ready: true,
    component: lazy(() => import("./unit05/Unit05").then((m) => ({ default: m.Unit05 }))),
  },
  {
    id: "06",
    num: 6,
    title: "כתיבה בארבעה קולות",
    blurb: "SATB, טווחים ופריסות, הכפלות, מקבילות אסורות וקדנצה שלמה.",
    ready: true,
    component: lazy(() => import("./unit06/Unit06").then((m) => ({ default: m.Unit06 }))),
  },
];
