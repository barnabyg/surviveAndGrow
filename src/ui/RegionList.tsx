import { FOOD_STAGE_NAMES, regionName, type GameState } from '../sim';

interface RegionListProps {
  readonly game: GameState;
  readonly selectedRegionId: string | null;
  readonly onSelectRegion: (regionId: string) => void;
}

/** Every region's food situation at a glance. Picking one picks it out on the map. */
export function RegionList({ game, selectedRegionId, onSelectRegion }: RegionListProps) {
  return (
    <section className="region-list" aria-labelledby="region-list-title">
      <div className="section-head">
        <h2 className="section-title" id="region-list-title">
          Food by region
        </h2>
      </div>
      <ul>
        {game.regions.map((region) => {
          const troubled = region.foodStage !== 'adequate';
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
                <span>
                  {troubled && '▲ '}
                  {FOOD_STAGE_NAMES[region.foodStage]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
