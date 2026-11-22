import type { TipsState } from './TipCard';

interface TopBarActionsProps {
  /** Whether the game is still being played. */
  readonly playing: boolean;
  readonly onEndQuarter: () => void;
  readonly onRestart: () => void;
  /** Opens the guided tour of the screen. */
  readonly onTour: () => void;
  /** The first-time tips, turned on and off here. */
  readonly tips: TipsState;
}

/** The buttons at the end of the top bar: the tour, the tips, restarting and ending the quarter. */
export function TopBarActions(props: TopBarActionsProps) {
  const { playing, onEndQuarter, onRestart, onTour, tips } = props;
  return (
    <div className="topbar__actions">
      {/* A finished game offers its own replay on the summary, so this is for one in play. */}
      {playing && (
        <>
          <button type="button" className="button" data-tour="tour" onClick={onTour}>
            Tour
          </button>
          <button
            type="button"
            className="button"
            aria-pressed={tips.on}
            title={tips.on ? 'Turn the first-time tips off' : 'Turn the first-time tips on'}
            onClick={tips.toggle}
          >
            Tips {tips.on ? 'on' : 'off'}
          </button>
          <button type="button" className="button" onClick={onRestart}>
            Restart
          </button>
        </>
      )}
      <button
        type="button"
        className="button button--primary"
        data-tour="end-quarter"
        disabled={!playing}
        onClick={onEndQuarter}
      >
        End quarter
      </button>
    </div>
  );
}
