/** Card at the end of a unit linking to its interactive workbook page. */
export function WorkbookCta({ unitId, blurb }: { unitId: string; blurb?: string }) {
  return (
    <div className="wb-cta">
      <div className="wb-cta-text">
        <b>ספר עבודה</b>
        <p>{blurb ?? "סדרת תרגילים אינטראקטיביים על חומר היחידה — כתיבה על חמשה, זיהוי ובדיקה מיידית."}</p>
      </div>
      <a className="next-link" href={`#/unit/${unitId}/workbook`}>
        לתרגול ←
      </a>
    </div>
  );
}
