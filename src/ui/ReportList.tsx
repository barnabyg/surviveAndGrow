import type { TurnReport } from '../sim';

const TONE_MARKS = { info: '●', warning: '▲', danger: '▲' } as const;

/** What happened last quarter, and why. */
export function ReportList({ report }: { readonly report: TurnReport | null }) {
  const count = report?.notices.length ?? 0;
  return (
    <section className="reports" aria-labelledby="reports-title">
      <div className="section-head">
        <h2 className="section-title" id="reports-title">
          This quarter
        </h2>
        {report !== null && (
          <span className="section-note">
            {count} {count === 1 ? 'report' : 'reports'}
          </span>
        )}
      </div>
      {report === null && <p className="section-empty">Reports arrive when a quarter ends.</p>}
      {report !== null && count === 0 && <p className="section-empty">Nothing to report.</p>}
      {report?.notices.map((notice) => (
        <article key={`${notice.title}|${notice.detail}`} className="notice">
          <span className={`notice__mark notice__mark--${notice.tone}`} aria-hidden="true">
            {TONE_MARKS[notice.tone]}
          </span>
          <div>
            <h3 className="notice__title">{notice.title}</h3>
            <p className="notice__detail">{notice.detail}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
