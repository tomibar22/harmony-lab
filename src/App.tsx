import { Suspense, useEffect, useState } from "react";
import { PARTS, UNITS } from "./units/registry";

function useHashRoute(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

function useTheme() {
  const [theme, setTheme] = useState<string>(() => {
    const stored = localStorage.getItem("hl-theme");
    if (stored === "dark" || stored === "light") return stored;
    // first visit (or legacy "auto"): start from the system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("hl-theme", theme);
  }, [theme]);
  const cycle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, cycle };
}

function Toc() {
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);
  const [active, setActive] = useState("");
  useEffect(() => {
    let io: IntersectionObserver | null = null;
    let sig = "";
    const scan = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("section.lesson-section"));
      const nextSig = sections.map((s) => s.id).join(",");
      if (nextSig === sig) return;
      sig = nextSig;
      setItems(sections.map((s) => ({ id: s.id, title: s.dataset.toc ?? s.id })));
      io?.disconnect();
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      sections.forEach((s) => io!.observe(s));
    };
    scan();
    // the unit is lazy-loaded, and hash navigation can swap units under us —
    // rescan whenever the lesson DOM actually changes (signature-guarded)
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io?.disconnect();
    };
  }, []);
  return (
    <nav className="toc" aria-label="תוכן היחידה">
      <div className="toc-title">בתוך היחידה</div>
      {items.map((it) => (
        <a
          key={it.id}
          href={window.location.hash || "#/"}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(it.id)?.scrollIntoView({ behavior: "smooth" });
          }}
          className={active === it.id ? "active" : ""}
        >
          {it.title}
        </a>
      ))}
    </nav>
  );
}

function Home() {
  return (
    <div className="home">
      <div className="kicker">מעבדת הרמוניה · לימוד הרמוניה קלאסית בעברית</div>
      <h1>הספר שמנגן בחזרה</h1>
      <p className="lede">
        מסע אינטראקטיבי בהרמוניה טונאלית ובהובלת קולות, יחידה אחר יחידה, בעקבות המהלך הפדגוגי של
        אלדוול ושכטר — בעיבוד עברי מקורי שבו כל דוגמה נשמעת וכל מושג נבדק.
      </p>
      {PARTS.map((part) => (
        <section key={part.num} className="home-part">
          <h2 className="part-title">{part.title}</h2>
          <p className="part-desc">{part.desc}</p>
          <div className="units-grid">
            {UNITS.filter((u) => u.part === part.num).map((u) =>
              u.ready ? (
                <a key={u.id} className="unit-card ready" href={`#/unit/${u.id}`}>
                  <div className="u-num">{u.num}</div>
                  <h3>{u.title}</h3>
                  <p>{u.blurb}</p>
                  <span className="badge">מוכן ללמידה</span>
                </a>
              ) : (
                <div key={u.id} className="unit-card soon" aria-disabled>
                  <div className="u-num">{u.num}</div>
                  <h3>{u.title}</h3>
                  <p>{u.blurb}</p>
                  <span className="badge">בקרוב</span>
                </div>
              )
            )}
          </div>
        </section>
      ))}
      <div className="disclaimer">
        התוכן כאן הוא עיבוד פדגוגי מקורי בעברית של מושגי היסוד בהרמוניה, בהשראת סדר ההוראה בספר
        <span dir="ltr"> Harmony &amp; Voice Leading </span>
        (מהד' 5). לשון הספר אינה מתורגמת ואינה משוכפלת; הדוגמאות המוזיקליות הן יצירות בנחלת הכלל,
        משורטטות ומנוגנות מחדש.
      </div>
    </div>
  );
}

export default function App() {
  const route = useHashRoute();
  const { theme, cycle } = useTheme();
  const unitMatch = route.match(/^#\/unit\/(\d+)/);
  const unit = unitMatch ? UNITS.find((u) => u.id === unitMatch[1] && u.ready) : undefined;
  const UnitComp = unit?.component;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="#/">
          מעבדת הרמוניה<small>Harmony Lab</small>
        </a>
        <span className="spacer" />
        <button
          className="icon-btn"
          onClick={cycle}
          title={theme === "dark" ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
          aria-label="החלפת ערכת נושא"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>
      {UnitComp ? (
        <div className="lesson-wrap">
          <Toc key={route} />
          <main>
            <Suspense fallback={<p style={{ padding: "3rem", color: "var(--ink-soft)" }}>טוען את היחידה…</p>}>
              <UnitComp />
            </Suspense>
          </main>
        </div>
      ) : (
        <main>
          <Home />
        </main>
      )}
      <footer className="site">
        נבנה ב־React, VexFlow ו־Tone.js · הדוגמאות המוזיקליות בנחלת הכלל · עיבוד עברי מקורי, לא תרגום
      </footer>
    </div>
  );
}
