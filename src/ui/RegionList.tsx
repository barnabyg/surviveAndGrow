import {
  ARMY_STAGE_NAMES,
  armyLoyaltyStatus,
  FOOD_STAGE_NAMES,
  formatIndex,
  formatPercent,
  livingStandards,
  regionName,
  type GameState,
} from '../sim';
import './RegionList.css';

interface RegionListProps {
  readonly game: GameState;
  readonly selectedRegionId: string | null;
  readonly onSelectRegion: (regionId: string) => void;
}

/**
 * Every region's food situation, living standard and army at a glance, so that inequality
 * shows. Picking one picks it out on the map.
 */
export function RegionList({ game, selectedRegionId, onSelectRegion }: RegionListProps) {
  const standards = livingStandards(game);
  const armies = armyLoyaltyStatus(game).regions;
  return (
    <section className="region-list" aria-labelledby="region-list-title" data-tour="regions">
      <div className="section-head">
        <h2 className="section-title" id="region-list-title">
          Regions
        </h2>
        <span className="region-list__key" aria-hidden="true">
          Food · Living standard · Army
        </span>
      </div>
      <ul>
        {game.regions.map((region, index) => {
          const troubled = region.foodStage !== 'adequate';
          const standard = standards[index]?.value ?? 0;
          const army = armies[index];
          const uneasy = army !== undefined && army.stage !== 'loyal';
          return (
            <li key={region.id}>
              <button
                type="button"
                className={troubled ? 'region-row region-row--troubled' : 'region-row'}
                aria-pressed={region.id === selectedRegionId}
                onClick={() => {
                  onSelectRegion(region.id);
                }}
              >
                <span>{regionName(game.country, region.id)}</span>
                <span className="region-row__food">
                  {troubled && '▲ '}
                  {FOOD_STAGE_NAMES[region.foodStage]}
                </span>
                <span
                  className="region-row__standard"
                  aria-label={`Living standard ${formatIndex(standard)}`}
                >
                  <span className="region-row__bar" aria-hidden="true">
                    <span style={{ width: `${standard / 10}%` }} />
                  </span>
                  {formatIndex(standard)}
                </span>
                {army !== undefined && (
                  <span
                    className={
                      uneasy ? 'region-row__army region-row__army--uneasy' : 'region-row__army'
                    }
                    aria-label={`Army ${ARMY_STAGE_NAMES[army.stage].toLowerCase()}, loyalty ${formatPercent(army.loyalty)}`}
                  >
                    {uneasy && '▲ '}
                    {ARMY_STAGE_NAMES[army.stage]} {formatPercent(army.loyalty, 0)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
