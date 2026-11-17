import { useId } from 'react';
import {
  budgetLimits,
  exactly,
  foodStatus,
  formatMoney,
  formatPercent,
  formatTonnes,
  MONEY_PER_MILLION,
  monthsOfFood,
  previewQuarter,
  regionName,
  SPENDING_AREA_NAMES,
  SPENDING_AREAS,
  type Budget,
  type GameState,
  type Range,
  type RegionUnrest,
} from '../sim';
import { formatRange, formatSigned } from './format';

interface BudgetPanelProps {
  readonly game: GameState;
  /** The budget the next quarter will be resolved with. */
  readonly committed: Budget;
  /** What the sliders show. It differs from the committed budget until the player commits. */
  readonly pending: Budget;
  /** Where food relief is being sent, which bears on the food projections. */
  readonly reliefRegionId: string | null;
  /** The sites building is to start on this quarter, whose instalments are a fixed cost. */
  readonly startProjects: readonly string[];
  readonly onChange: (pending: Budget) => void;
  readonly onCommit: () => void;
  readonly onReset: () => void;
}

/** How many sliders differ between two budgets. */
export function countChanges(pending: Budget, committed: Budget): number {
  const spendingChanges = SPENDING_AREAS.filter(
    (area) => pending.spending[area] !== committed.spending[area],
  ).length;
  return spendingChanges + (pending.taxRatePercent === committed.taxRatePercent ? 0 : 1);
}

export function BudgetPanel(props: BudgetPanelProps) {
  const { game, committed, pending, reliefRegionId, startProjects } = props;
  const { onChange, onCommit, onReset } = props;
  const changes = countChanges(pending, committed);
  // The same projection twice: where the committed budget leads, and where the sliders would.
  const before = previewQuarter(game, { budget: committed, reliefRegionId, startProjects });
  const after = previewQuarter(game, { budget: pending, reliefRegionId, startProjects });
  const building = after.projectSpending.max > 0 || after.pausedSites.length > 0;
  const { taxRatePercent, spending } = budgetLimits;
  const food = foodStatus(game);

  return (
    <section className="budget" aria-labelledby="budget-title">
      <div className="section-head">
        <h2 className="section-title" id="budget-title">
          Budget
        </h2>
        {changes > 0 && (
          <span className="pending-note">
            {changes} {changes === 1 ? 'change' : 'changes'} not committed
          </span>
        )}
      </div>

      <div className="totals" role="group" aria-label="Budget totals">
        <Total label="Revenue" value={formatRange(after.revenue, formatMoney)} />
        <Total label="Spending" value={formatRange(after.spending, formatMoney)} />
        <Total
          label="Balance"
          value={formatRange(after.balance, formatMoney)}
          tone={after.balance.min < 0 ? 'danger' : 'plain'}
        />
      </div>
      {after.spendingCut && (
        <p className="warning-note">
          ▲ The treasury cannot cover this budget. Every area would be cut to what it can afford.
        </p>
      )}

      <div className="sliders">
        <Slider
          label="Tax rate"
          min={taxRatePercent.min}
          max={taxRatePercent.max}
          step={1}
          value={pending.taxRatePercent}
          committedValue={committed.taxRatePercent}
          format={(rate) => `${rate}%`}
          formatChange={(change) => `${change > 0 ? '+' : '−'}${Math.abs(change)}`}
          onChange={(rate) => {
            onChange({ ...pending, taxRatePercent: rate });
          }}
        />
        {SPENDING_AREAS.map((area) => (
          <Slider
            key={area}
            label={SPENDING_AREA_NAMES[area]}
            min={spending.min / MONEY_PER_MILLION}
            max={spending.max / MONEY_PER_MILLION}
            step={spending.step / MONEY_PER_MILLION}
            value={pending.spending[area] / MONEY_PER_MILLION}
            committedValue={committed.spending[area] / MONEY_PER_MILLION}
            format={(millions) => formatMoney(millions * MONEY_PER_MILLION)}
            formatChange={(millions) => formatSigned(millions * MONEY_PER_MILLION)}
            onChange={(millions) => {
              onChange({
                ...pending,
                spending: { ...pending.spending, [area]: millions * MONEY_PER_MILLION },
              });
            }}
          />
        ))}
      </div>

      {building && (
        <div className="fixed-costs" role="group" aria-label="Fixed costs">
          <div className="fixed-costs__row">
            <span>Projects</span>
            <span className="fixed-costs__note">Fixed: instalments on what is being built</span>
            <span className="slider__value">{formatRange(after.projectSpending, formatMoney)}</span>
          </div>
          {after.pausedSites.map((siteId) => (
            <p key={siteId} className="warning-note">
              ▲ Building will pause at{' '}
              {game.country.sites.find((site) => site.id === siteId)?.name ?? siteId}: the treasury
              cannot cover its instalment.
            </p>
          ))}
        </div>
      )}

      <section className="outlook" aria-labelledby="outlook-title">
        <h3 className={changes > 0 ? 'label label--pending' : 'label'} id="outlook-title">
          {changes > 0 ? 'If you commit this change' : 'Outlook at the current settings'}
        </h3>
        <Projection label="Revenue" before={before.revenue} after={after.revenue} onlyIfMoved />
        <Projection label="Spending" before={before.spending} after={after.spending} onlyIfMoved />
        <Projection label="Balance" before={before.balance} after={after.balance} onlyIfMoved />
        <Projection label="Treasury next quarter" before={before.treasury} after={after.treasury} />
        <Projection
          label="Approval next quarter"
          before={before.approval}
          after={after.approval}
          format={formatPercent}
        />
        <Projection
          label="Approval is heading for"
          before={before.approvalHeading}
          after={after.approvalHeading}
          format={formatPercent}
        />
        <Projection
          label="Vote share forecast"
          before={before.voteShare}
          after={after.voteShare}
          format={formatPercent}
          onlyIfMoved
        />
        {(['strikes', 'protests'] as const).map((unrest) => {
          const regions = regionsIn(after.unrest, unrest);
          return (
            regions.length > 0 && (
              <p key={unrest} className="warning-note">
                ▲ When the quarter ends, {unrest} in{' '}
                {regions.map((regionId) => regionName(game.country, regionId)).join(', ')}.
              </p>
            )
          );
        })}
        <Projection
          label="Harvest forecast"
          before={before.harvest}
          after={after.harvest}
          format={(tonnes) => (tonnes / 1_000_000).toFixed(2)}
          unit="Mt"
        />
        <Projection
          label="Food reserve after harvest"
          before={before.foodReserveAfterHarvest}
          after={after.foodReserveAfterHarvest}
          format={(tonnes) => monthsOfFood(tonnes, food.quarterlyConsumption).toFixed(1)}
          unit="months"
        />
        {reliefRegionId !== null && (
          <Projection
            label="Food relief this quarter"
            before={exactly(before.relief.delivered)}
            after={exactly(after.relief.delivered)}
            format={formatTonnes}
            onlyIfMoved
          />
        )}
        <p className="outlook__note">
          The country eats {((food.quarterlyConsumption * 4) / 1_000_000).toFixed(2)} Mt a year.
          Forecasts assume spending stays as shown.
        </p>
      </section>

      <div className="button-row">
        <button type="button" className="button" disabled={changes === 0} onClick={onReset}>
          Reset
        </button>
        <button
          type="button"
          className="button button--commit"
          disabled={changes === 0}
          onClick={onCommit}
        >
          Commit budget
        </button>
      </div>
    </section>
  );
}

/** The regions that will be in one kind of unrest. */
function regionsIn(unrest: readonly RegionUnrest[], kind: RegionUnrest['unrest']): string[] {
  return unrest.filter((entry) => entry.unrest === kind).map((entry) => entry.regionId);
}

interface TotalProps {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'plain' | 'danger';
}

function Total({ label, value, tone = 'plain' }: TotalProps) {
  return (
    <div role="group" aria-label={label}>
      <div className="label">{label}</div>
      <div className={`totals__value totals__value--${tone}`}>{value}</div>
    </div>
  );
}

interface ProjectionProps {
  readonly label: string;
  /** Where the committed budget leads. */
  readonly before: Range;
  /** Where the budget on the sliders would lead. */
  readonly after: Range;
  readonly format?: (value: number) => string;
  /** The unit the figure is counted in, when the format does not write it. */
  readonly unit?: string;
  /** Leave the figure out unless the pending change would move it. */
  readonly onlyIfMoved?: boolean;
}

/**
 * One projected figure. A figure the pending change would move is shown as before and
 * after; one it leaves alone is shown once, or left out when the totals above already
 * give it. An uncertain figure is shown as a range.
 */
function Projection(props: ProjectionProps) {
  const { label, before, after, format = formatMoney, unit = '', onlyIfMoved = false } = props;
  const moved = before.min !== after.min || before.max !== after.max;
  if (onlyIfMoved && !moved) return null;
  return (
    <div className="projection" role="group" aria-label={label}>
      <span>{label}</span>
      <span className="projection__value">
        {moved && (
          <span className="projection__before">{formatRange(before, format, unit)} → </span>
        )}
        {formatRange(after, format, unit)}
      </span>
    </div>
  );
}

interface SliderProps {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
  readonly committedValue: number;
  readonly format: (value: number) => string;
  readonly formatChange: (change: number) => string;
  readonly onChange: (value: number) => void;
}

/** One budget slider. A value that differs from the committed one is marked as pending. */
function Slider(props: SliderProps) {
  const { label, min, max, step, value, committedValue, format, formatChange, onChange } = props;
  const id = useId();
  const change = value - committedValue;
  return (
    <div className={change === 0 ? 'slider' : 'slider slider--pending'}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(event) => {
          onChange(event.target.valueAsNumber);
        }}
      />
      <span className="slider__value">
        {format(value)}
        {change !== 0 && <span className="slider__change"> ({formatChange(change)})</span>}
      </span>
    </div>
  );
}
