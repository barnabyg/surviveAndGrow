import { useState, type ReactNode } from 'react';
import { readClosedPanels, storePanelClosed } from './storage';

interface PanelProps {
  /** Names the panel, both for its heading's id and for remembering whether it is collapsed. */
  readonly id: string;
  readonly title: string;
  /** What the heading says beside the title. It stays in view when the panel is collapsed. */
  readonly note?: ReactNode;
  readonly className: string;
  readonly children: ReactNode;
}

/**
 * A panel in the decisions column. Its heading is a button that collapses it to the heading
 * alone, so the column needs less scrolling. The heading keeps its note, which says where
 * the panel stands, such as changes not yet committed. The browser remembers which panels
 * are collapsed.
 */
export function Panel({ id, title, note, className, children }: PanelProps) {
  const [open, setOpen] = useState(() => !readClosedPanels().includes(id));
  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;
  return (
    <section className={className} aria-labelledby={titleId}>
      <div className="section-head">
        <h2 className="section-title" id={titleId}>
          <button
            type="button"
            className="panel__toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => {
              storePanelClosed(id, open);
              setOpen(!open);
            }}
          >
            <span className="panel__chevron" aria-hidden="true" />
            {title}
          </button>
        </h2>
        {note}
      </div>
      <div className="panel__body" id={bodyId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
