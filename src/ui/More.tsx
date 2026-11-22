import type { ReactNode } from 'react';
import './More.css';

interface MoreProps {
  /** What the folded part holds, in a few words. */
  readonly summary: string;
  /** A word beside the summary while it is folded, such as that a figure in it has moved. */
  readonly note?: string | null;
  readonly children: ReactNode;
}

/**
 * Detail a panel can do without at a glance: reference text, and figures that matter less
 * often. It starts folded, and the browser's own disclosure opens it, by mouse or keyboard.
 */
export function More({ summary, note = null, children }: MoreProps) {
  return (
    <details className="more">
      <summary className="more__summary">
        {summary}
        {note !== null && <span className="pending-note"> · {note}</span>}
      </summary>
      <div className="more__body">{children}</div>
    </details>
  );
}
