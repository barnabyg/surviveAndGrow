import { useState, type ReactNode } from 'react';
import { readClosedPanels, storePanelClosed } from './storage';
import './DecisionPanel.css';

interface DecisionPanelProps {
  /**
   * Names the panel: its class, its heading's id, and how the browser remembers it is
   * collapsed. Renaming one forgets that it was collapsed, which costs the player nothing more.
   */
  readonly id: string;
  readonly title: string;
  /** What the heading says beside the title. It stays in view when the panel is collapsed. */
  readonly note?: ReactNode;
  readonly children: ReactNode;
}

/**
 * A panel in the decisions column. Its heading is a button that collapses it to the heading
 * alone, so the column needs less scrolling. The heading keeps its note, which says where
 * the panel stands, such as changes not yet committed. The browser remembers which panels
 * are collapsed.
 */
export function DecisionPanel({ id, title, note, children }: DecisionPanelProps) {
  const [open, setOpen] = useState(() => !readClosedPanels().includes(id));
  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;
  return (
    <section className={id} aria-labelledby={titleId}>
      <div className="section-head">
        <h2 className="section-title" id={titleId}>
          <button
            type="button"
            className="panel__toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => {
              const closing = open;
              storePanelClosed(id, closing);
              setOpen(!closing);
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
