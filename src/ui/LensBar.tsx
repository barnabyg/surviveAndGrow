import type { GameState } from '../sim';
import { LENS_NAMES, LENSES, lensScale, type Lens } from './lens';
import { tierOnePalette } from './mapPalette';

interface LensBarProps {
  readonly game: GameState;
  readonly lens: Lens;
  readonly onChange: (lens: Lens) => void;
}

/** What each lens's scale is a scale of, written before it. */
const SCALE_TITLES: Readonly<Record<Lens, string>> = {
  country: 'Land',
  food: 'Food situation',
  approval: 'Approval',
};

/**
 * The buttons that choose what the map shows, and the scale that explains the chosen
 * lens's colours. Every step of a scale is named, and every region on the map also carries
 * its value as text, so nothing here rests on telling colours apart.
 */
export function LensBar({ game, lens, onChange }: LensBarProps) {
  const palette = tierOnePalette;
  return (
    <div className="lens-bar">
      <div className="lens-bar__buttons" role="group" aria-label="Map lens">
        {LENSES.map((option) => (
          <button
            key={option}
            type="button"
            className="lens-bar__button"
            aria-pressed={option === lens}
            onClick={() => {
              onChange(option);
            }}
          >
            {LENS_NAMES[option]}
          </button>
        ))}
      </div>
      <div className="lens-scale">
        <span className="label">{SCALE_TITLES[lens]}</span>
        <ul aria-label={`${LENS_NAMES[lens]} lens scale`}>
          {lensScale(lens, game, palette).map((step) => (
            <li key={step.label}>
              <span
                className="lens-scale__swatch"
                style={{ background: step.fill }}
                aria-hidden="true"
              />
              {step.label}
            </li>
          ))}
          {lens === 'approval' && (
            <>
              <li>
                <UnrestSwatch crossed={false} colour={palette.unrestMark} />
                Hatched: strikes
              </li>
              <li>
                <UnrestSwatch crossed colour={palette.unrestMark} />
                Cross-hatched: protests
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

/** The hatching the approval lens lays over a region with strikes or, crossed, protests. */
function UnrestSwatch({ crossed, colour }: { readonly crossed: boolean; readonly colour: string }) {
  return (
    <svg className="lens-scale__mark" width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
      <rect width="22" height="14" rx="2" fill="#e9eef1" />
      <path
        d={
          crossed
            ? 'M-2,10 L8,0 M4,16 L20,0 M14,16 L24,6 M-2,4 L10,16 M4,-2 L20,14 M14,-2 L24,8'
            : 'M-2,10 L8,0 M4,16 L20,0 M14,16 L24,6'
        }
        stroke={colour}
        strokeWidth="1.8"
        fill="none"
      />
    </svg>
  );
}
