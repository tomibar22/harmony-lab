import { ComponentType, lazy } from "react";

export type UnitMeta = {
  id: string;
  num: number;
  part: number;              // which part of the book's learning map the unit belongs to
  title: string;
  blurb: string;
  ready: boolean;
  component?: ComponentType;
};

/** The learning map, following the book's large-scale division. */
export const PARTS: { num: number; title: string; desc: string }[] = [
  {
    num: 1,
    title: "חלק ראשון · יסודות",
    desc: "שפת הצלילים: סולמות, מרווחים, מקצב, אקורדים, קונטרפונקט וכתיבה בארבעה קולות.",
  },
  {
    num: 2,
    title: "חלק שני · I–V–I והרחבותיו",
    desc: "לב הדקדוק הטונאלי: ציר הטוניקה–דומיננטה, והאקורדים שמרחיבים ומעשירים אותו.",
  },
];

export const UNITS: UnitMeta[] = [
  {
    id: "01",
    num: 1,
    part: 1,
    title: "סולמות, דרגות ומודוסים",
    blurb: "טוניקה ודרגות, יציב ופעיל, סימני היתק, שלוש צורות המינור ושבעת המודוסים.",
    ready: true,
    component: lazy(() => import("./unit01/Unit01").then((m) => ({ default: m.Unit01 }))),
  },
  {
    id: "02",
    num: 2,
    part: 1,
    title: "מרווחים",
    blurb: "גודל ואיכות, היפוך, סדרת העליונים, קונסוננס ודיסוננס והטריטון.",
    ready: true,
    component: lazy(() => import("./unit02/Unit02").then((m) => ({ default: m.Unit02 }))),
  },
  {
    id: "03",
    num: 3,
    part: 1,
    title: "מקצב ומשקל",
    blurb: "פעמה וטמפו, ערכי משך, משקלים פשוטים ומורכבים, סינקופה ואנאקרוזה.",
    ready: true,
    component: lazy(() => import("./unit03/Unit03").then((m) => ({ default: m.Unit03 }))),
  },
  {
    id: "04",
    num: 4,
    part: 1,
    title: "משולשים וספטאקורדים",
    blurb: "ארבע איכויות, ספרות רומיות, היפוכים ובס ממוספר, וספטאקורד הדומיננטה.",
    ready: true,
    component: lazy(() => import("./unit04/Unit04").then((m) => ({ default: m.Unit04 }))),
  },
  {
    id: "05",
    num: 5,
    part: 1,
    title: "מבוא לקונטרפונקט",
    blurb: "קאנטוס פירמוס, סוגי תנועה, חמשת המינים וההשהיה.",
    ready: true,
    component: lazy(() => import("./unit05/Unit05").then((m) => ({ default: m.Unit05 }))),
  },
  {
    id: "06",
    num: 6,
    part: 1,
    title: "כתיבה בארבעה קולות",
    blurb: "SATB, טווחים ופריסות, הכפלות, מקבילות אסורות וקדנצה שלמה.",
    ready: true,
    component: lazy(() => import("./unit06/Unit06").then((m) => ({ default: m.Unit06 }))),
  },
  {
    id: "07",
    num: 7,
    part: 2,
    title: "הטוניקה והדומיננטה: I, V ו־V7",
    blurb: "שני האקורדים שמגדירים סולם, חיבורם בארבעה קולות, והקדנצות הראשונות.",
    ready: true,
    component: lazy(() => import("./unit07/Unit07").then((m) => ({ default: m.Unit07 }))),
  },
  {
    id: "08",
    num: 8,
    part: 2,
    title: "סקסט־אקורדים: I6, V6 ו־VII6",
    blurb: "היפוכים ראשונים משחררים את הבס: הרחבת הטוניקה, שכן תחתון ואקורד מעבר.",
    ready: true,
    component: lazy(() => import("./unit08/Unit08").then((m) => ({ default: m.Unit08 }))),
  },
  {
    id: "09",
    num: 9,
    part: 2,
    title: "היפוכי V7",
    blurb: "‏6/5, ‏4/3 ו־4/2 — הדומיננטה בכל מצביה, שלמה תמיד, וקו הבס הגדול.",
    ready: true,
    component: lazy(() => import("./unit09/Unit09").then((m) => ({ default: m.Unit09 }))),
  },
  {
    id: "10",
    num: 10,
    part: 2,
    title: "בדרך אל V: ‏IV, ‏II ו־II6",
    blurb: "אקורדי ההכנה של הדומיננטה — והמשפט הטונאלי המלא: טוניקה, הכנה, דומיננטה, טוניקה.",
    ready: true,
    component: lazy(() => import("./unit10/Unit10").then((m) => ({ default: m.Unit10 }))),
  },
  {
    id: "11",
    num: 11,
    part: 2,
    title: "הקוורט־סקסט הקדנציאלי",
    blurb: "צלילי הטוניקה על בס הדומיננטה: ‏6/4 שנמס אל 5/3 — העיכוב הדרמטי שלפני הקדנצה.",
    ready: true,
    component: lazy(() => import("./unit11/Unit11").then((m) => ({ default: m.Unit11 }))),
  },
  {
    id: "12",
    num: 12,
    part: 2,
    title: "‏VI ו־IV6: ההפתעה וההרחבה",
    blurb: "הקדנצה הנמנעת, טרצות יורדות בבס, והחצי־קדנצה הפריגית של המינור.",
    ready: true,
    component: lazy(() => import("./unit12/Unit12").then((m) => ({ default: m.Unit12 }))),
  },
  {
    id: "13",
    num: 13,
    part: 2,
    title: "ספטאקורדים של II ו־IV",
    blurb: "ספטימות מוכנות לאקורדי ההכנה: ‏II65, שרשרת הקווינטות, מלכודת IV7 והצבע החצי־מוקטן.",
    ready: true,
    component: lazy(() => import("./unit13/Unit13").then((m) => ({ default: m.Unit13 }))),
  },
];
