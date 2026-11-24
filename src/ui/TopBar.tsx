import {
  approvalStatus,
  ARMY_STAGE_NAMES,
  armyLoyaltyStatus,
  coupStatus,
  austerityStatus,
  creditRules,
  creditStatus,
  bondRateSpan,
  debtStatus,
  loanRateSpan,
  maturityOf,
  paysAtMaturity,
  electionStatus,
  foodStatus,
  formatIndex,
  formatMoney,
  formatPercent,
  formatPoints,
  formatQuarters,
  formatRate,
  formatSignedIndex,
  formatSignedPoints,
  monthsOfFood,
  prosperityStatus,
  tierFrom,
  TIER_NAMES,
  TIERS,
  tierStatus,
  regionName,
  seasonOf,
  UNREST_NAMES,
  victoryStatus,
  type ApprovalStatus,
  type ArmyLoyaltyStatus,
  type CoupStatus,
  type GameState,
  type TurnReport,
  type VictoryStatus,
  quartersWord,
} from '../sim';
import { strikeMark } from './ApprovalChart';
import { Crest } from './Crest';
import { formatDate, formatSigned, formatSignedCount, formatSignedTonnes } from './format';
import { recent, type Mark } from './trend';
import { TrendLine } from './TrendLine';
import { BreakdownRows, VitalSign } from './VitalSign';
import type { TipsState } from './TipCard';
import { TopBarActions } from './TopBarActions';
import './TopBar.css';

interface TopBarProps {
  readonly game: GameState;
  /** The report on the quarter just ended, or null before any quarter has ended. */
  readonly report: TurnReport | null;
  readonly onEndQuarter: () => void;
  /** Asks to give up this game for a fresh one. */
  readonly onRestart: () => void;
  /** Opens the guided tour of the screen. */
  readonly onTour: () => void;
  /** The first-time tips, which the top bar turns on and off. */
  readonly tips: TipsState;
}

/** How the debt stands against the win's debt test, shown while the nation is in the top tier. */
function DebtTestBreakdown({ victory }: { readonly victory: VictoryStatus }) {
  const { burden, limit, holds } = victory.debt;
  return (
    <>
      <h2 className="label">The debt test</h2>
      <table className="breakdown__table" aria-label="The debt test">
        <tbody>
          <tr>
            <th scope="row">Debt burden now</th>
            <td>{formatPercent(burden)}</td>
          </tr>
          <tr>
            <th scope="row">Most the win allows</th>
            <td>{formatPercent(limit)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{holds ? 'Room below the limit' : 'Over the limit by'}</th>
            <td>{formatPoints(Math.abs(limit - burden))}</td>
          </tr>
        </tfoot>
      </table>
      <p className="breakdown__empty">
        {holds
          ? 'The debt test is passed: the win comes when the hold completes, if the debt burden is still within the limit then.'
          : victory.waitingOnDebt
            ? `${TIER_NAMES[victory.tier]} has been held long enough, and the debt test is all that stands between you and the win. The hold goes on counting: the game is won as the first quarter ends with the debt burden brought down by ${formatPoints(burden - limit)} or more.`
            : 'The debt test is failed. The hold goes on counting, but the win waits until a quarter ends with the debt burden within the limit.'}
      </p>
    </>
  );
}

/** What the approval figure says while regions are striking or protesting. */
function unrestRemark(game: GameState, { unrest }: ApprovalStatus) {
  const [first] = unrest;
  if (first === undefined) return undefined;
  const tone = unrest.some((entry) => entry.unrest === 'protests') ? 'danger' : 'warning';
  const text =
    unrest.length === 1
      ? `${UNREST_NAMES[first.unrest]} in ${regionName(game.country, first.regionId)}`
      : `Unrest in ${unrest.length} regions`;
  return { text, tone } as const;
}

/**
 * The stage the army is in, named beneath its loyalty whatever it is: in a word while it is
 * loyal, as a warning with the mark it has fallen below while it is restless, and while it is
 * plotting with the quarters left to a coup, counted down.
 */
function armyRemark(army: ArmyLoyaltyStatus, coup: CoupStatus) {
  const name = ARMY_STAGE_NAMES[army.stage];
  if (army.stage === 'loyal') return { text: name, tone: 'plain' } as const;
  if (army.stage === 'plotting') {
    return { text: `${name}: ${formatQuarters(coup.left)} to a coup`, tone: 'danger' } as const;
  }
  return {
    text: `${name}: below ${formatPercent(army.restlessBelow, 0)}`,
    tone: 'warning',
  } as const;
}

/** What the count towards a coup stands at, in sentences for the army's breakdown. */
function coupCount(coup: CoupStatus): string {
  const mark = formatPercent(coup.plottingBelow, 0);
  const rule = `The army takes power once national loyalty has ended ${formatQuarters(coup.needed)} running below ${mark}.`;
  if (!coup.plotting) return `${rule} It is not plotting, so nothing is counted.`;
  const counted =
    coup.held === 0 ? 'None is counted yet' : `It has ended ${formatQuarters(coup.held)} there`;
  const left =
    coup.left === 1
      ? `the coup comes as this quarter ends, unless loyalty is back at ${mark} or above by then`
      : `${coup.left} more, this quarter among them, bring the coup`;
  return `${rule} ${counted}: ${left}.`;
}

export function TopBar(props: TopBarProps) {
  const { game, report, onEndQuarter, onRestart, onTour, tips } = props;
  const { date } = game;
  const food = foodStatus(game);
  const approval = approvalStatus(game);
  const army = armyLoyaltyStatus(game);
  const coup = coupStatus(game);
  const restlessMark: Mark = {
    value: army.restlessBelow,
    label: `Restless below ${formatPercent(army.restlessBelow, 0)}`,
    name: `the ${formatPercent(army.restlessBelow, 0)} restless mark`,
  };
  const debt = debtStatus(game);
  const credit = creditStatus(game);
  const election = electionStatus(game);
  const prosperity = prosperityStatus(game);
  const tier = tierStatus({ ...game, prosperity: prosperity.value });
  const victory = victoryStatus(game);
  const austerity = game.outcome.status === 'playing' ? austerityStatus(game) : null;
  const targetName = TIER_NAMES[victory.tier];
  const atTarget = tier.tier === victory.tier;
  const target: Mark = {
    value: prosperity.target,
    label: `Target: ${formatIndex(prosperity.target, 0)}`,
    name: `the target of ${formatIndex(prosperity.target, 0)}`,
  };
  const shown = recent(game.history);
  const safeLevel: Mark = {
    value: food.safeReserveMonths,
    label: `Safe level: ${food.safeReserveMonths} months`,
    name: `the ${food.safeReserveMonths}-month safe level`,
  };
  return (
    <header className="topbar">
      <div className="topbar__identity">
        <Crest size={46} />
        <div>
          <h1 className="topbar__country">{game.country.name}</h1>
          <div className="topbar__date">
            Year {date.year} · Quarter {date.quarter} · {seasonOf(date)}
          </div>
        </div>
      </div>

      <div className="vitals" data-tour="vitals">
        <VitalSign
          label="Treasury"
          value={formatMoney(game.treasury)}
          figure={report?.treasury ?? null}
          formatChange={formatSigned}
          formatMovement={formatMoney}
          breakdownTitle="What moved the treasury"
          trend={
            <TrendLine
              subject="Treasury"
              values={shown.map((record) => record.treasury)}
              format={formatMoney}
            />
          }
        />
        <VitalSign
          label="Debt"
          value={formatMoney(debt.debt)}
          figure={report?.debt ?? null}
          formatChange={formatSigned}
          formatMovement={formatMoney}
          goodWhen="falling"
          note={`Burden ${formatPercent(debt.burden)}`}
          breakdownTitle="What moved the debt"
          trend={
            <TrendLine
              subject="Debt"
              values={shown.map((record) => record.debt)}
              format={formatMoney}
            />
          }
        >
          <h2 className="label">What is owed</h2>
          {debt.debts.length === 0 ? (
            <p className="breakdown__empty">
              Nothing is owed. Loans are taken, and bonds issued, in the Finance panel.
            </p>
          ) : (
            <table className="breakdown__table" aria-label="What is owed">
              <thead>
                <tr>
                  <th scope="col">Debt</th>
                  <th scope="col">Owed</th>
                  <th scope="col">Repayment</th>
                  <th scope="col">Left</th>
                </tr>
              </thead>
              <tbody>
                {debt.debts.map((owed) => (
                  <tr key={owed.number}>
                    <th scope="row">
                      {owed.name} · {formatMoney(owed.borrowed)} at{' '}
                      {formatRate(owed.annualRateBasisPoints)}
                    </th>
                    <td>{formatMoney(owed.owed)}</td>
                    <td>{formatMoney(owed.repayment)}</td>
                    <td>
                      {paysAtMaturity(owed)
                        ? `Matures ${formatDate(maturityOf(owed, game.date))}`
                        : formatQuarters(owed.quartersLeft)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Owed in all</th>
                  <td>{formatMoney(debt.debt)}</td>
                  <td>{formatMoney(debt.repayments)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
          <p className="breakdown__empty">
            The debt burden is what is owed against a year’s revenue at the budget in force:{' '}
            {formatMoney(debt.yearRevenue)}. Repayments are paid before anything else each quarter.
            One the treasury and revenue cannot cover is missed, and a missed payment brings a
            bailout: everything owed becomes one bailout loan, and austerity follows.
          </p>
        </VitalSign>
        <VitalSign
          label="Credit rating"
          value={credit.name}
          figure={report?.credit ?? null}
          formatChange={formatSignedCount}
          formatMovement={(points) => `${points} ${points === 1 ? 'point' : 'points'}`}
          note={`Loans at ${loanRateSpan(credit.current)}`}
          breakdownTitle="What moved the credit score"
        >
          <h2 className="label">What the rating is made of</h2>
          <table className="breakdown__table" aria-label="What the rating is made of">
            <tbody>
              {credit.parts.map((part, index) => (
                <tr key={part.label}>
                  <th scope="row">{part.label}</th>
                  <td>{index === 0 ? part.amount : formatSignedCount(part.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Score now</th>
                <td>{credit.score}</td>
              </tr>
            </tfoot>
          </table>
          <h2 className="label">Ratings</h2>
          <table className="breakdown__table" aria-label="Credit ratings">
            <thead>
              <tr>
                <th scope="col">Rating</th>
                <th scope="col">From</th>
                <th scope="col">Loans</th>
                <th scope="col">Bonds</th>
                <th scope="col">May owe</th>
              </tr>
            </thead>
            <tbody>
              {credit.steps.map((step) => (
                <tr
                  key={step.rating}
                  aria-current={step.rating === credit.rating ? 'true' : undefined}
                >
                  <th scope="row">
                    {step.rating === credit.rating ? '▶ ' : ''}
                    {step.name}
                  </th>
                  <td>{step.from}</td>
                  <td>{loanRateSpan(step)}</td>
                  <td>{bondRateSpan(step) ?? 'None'}</td>
                  <td>{formatPercent(step.debtLimitPermille, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="breakdown__empty">
            The rating is reassessed as each quarter ends. Its score is the payment record, less a
            share of the debt burden and of the quarter’s deficit. A missed payment brings a
            bailout, which leaves the payment record at {creditRules.missedPaymentRecord} and the
            rating at its lowest step; each quarter whose repayments are all made on time puts{' '}
            {creditRules.onTimePoints} back, up to {creditRules.bestRecord}. Loans and bonds already
            taken keep the rate they were taken at.
          </p>
        </VitalSign>
        <VitalSign
          label="Food reserve"
          value={food.reserveMonths.toFixed(1)}
          unit="months"
          figure={report?.food ?? null}
          formatChange={formatSignedTonnes}
          formatMovement={(tonnes) =>
            `${monthsOfFood(tonnes, food.quarterlyConsumption).toFixed(1)} months`
          }
          remark={
            food.belowSafeLevel
              ? { text: `Below the ${food.safeReserveMonths}-month safe level`, tone: 'warning' }
              : undefined
          }
          note={safeLevel.label}
          breakdownTitle="What moved the food reserve"
          trend={
            <TrendLine
              subject="Food reserve"
              values={shown.map((record) =>
                monthsOfFood(record.foodReserve, record.quarterlyConsumption),
              )}
              format={(value) => `${value.toFixed(1)} months`}
              mark={safeLevel}
            />
          }
        />
        <VitalSign
          label="Approval"
          value={formatPercent(approval.approval)}
          figure={report?.approval ?? null}
          formatChange={formatSignedPoints}
          formatMovement={formatPoints}
          remark={unrestRemark(game, approval)}
          note={`Strikes below ${formatPercent(approval.strikesBelow, 0)}`}
          breakdownTitle="What moved approval"
          trend={
            <TrendLine
              subject="Approval"
              values={shown.map((record) => record.approval)}
              format={formatPercent}
              mark={strikeMark(approval.strikesBelow)}
            />
          }
        >
          <h2 className="label">What approval is made of</h2>
          <table className="breakdown__table" aria-label="What approval is made of">
            <tbody>
              {approval.causes.map((cause, index) => (
                <BreakdownRows
                  key={cause.label}
                  line={cause}
                  format={index === 0 ? formatPercent : formatSignedPoints}
                />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Approval now</th>
                <td>{formatPercent(approval.approval)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="breakdown__empty">
            Approval moves a part of the way each quarter towards where the budget and the food
            situation would settle it. The factions bear on each region by its mix of farmers,
            workers and business, as far as each stands above or below neutral. A region strikes
            below {formatPercent(approval.strikesBelow, 0)} and protests below{' '}
            {formatPercent(approval.protestsBelow, 0)}.
          </p>
        </VitalSign>
        <VitalSign
          label="Army loyalty"
          value={formatPercent(army.loyalty)}
          figure={report?.armyLoyalty ?? null}
          formatChange={formatSignedPoints}
          formatMovement={formatPoints}
          remark={armyRemark(army, coup)}
          note={`${restlessMark.label} · plotting below ${formatPercent(army.plottingBelow, 0)} · a coup after ${formatQuarters(coup.needed)} of plotting`}
          breakdownTitle="What moved army loyalty"
          trend={
            <TrendLine
              subject="Army loyalty"
              // Quarters recorded before the army was kept are left out.
              values={shown.flatMap((record) =>
                record.armyLoyalty === null ? [] : [record.armyLoyalty],
              )}
              format={formatPercent}
              mark={restlessMark}
            />
          }
        >
          <h2 className="label">What army loyalty is made of</h2>
          <table className="breakdown__table" aria-label="What army loyalty is made of">
            <tbody>
              {army.causes.map((cause, index) => (
                <tr key={cause.label}>
                  <th scope="row">{cause.label}</th>
                  <td>
                    {index === 0 ? formatPercent(cause.amount) : formatSignedPoints(cause.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Army loyalty now</th>
                <td>
                  {formatPercent(army.loyalty)} · {ARMY_STAGE_NAMES[army.stage]}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="breakdown__empty">
            Army loyalty moves a part of the way each quarter towards where Defence spending and
            each region’s unrest would settle it: {formatPercent(army.settles)},{' '}
            {ARMY_STAGE_NAMES[army.settlesStage].toLowerCase()}, on the budget in force. Defence is{' '}
            {formatMoney(army.spent)} a quarter, and the army expects {formatMoney(army.expected)}{' '}
            for the country’s people. Strikes in a region pull the army there down, and protests
            further. The army is restless below {formatPercent(army.restlessBelow, 0)} and plotting
            below {formatPercent(army.plottingBelow, 0)}.
          </p>
          <p className="breakdown__empty">{coupCount(coup)}</p>
          <h2 className="label">The army by region</h2>
          <table className="breakdown__table" aria-label="The army by region">
            <tbody>
              {army.regions.map((region) => (
                <tr key={region.regionId}>
                  <th scope="row">{regionName(game.country, region.regionId)}</th>
                  <td>
                    {formatPercent(region.loyalty)} · {ARMY_STAGE_NAMES[region.stage]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </VitalSign>
        <VitalSign
          label="Prosperity"
          value={formatIndex(prosperity.value)}
          unit={`of ${formatIndex(prosperity.target, 0)}`}
          figure={report?.prosperity ?? null}
          formatChange={formatSignedIndex}
          formatMovement={formatIndex}
          remark={
            tier.lostBelow !== null && prosperity.value < tierFrom(tier.tier)
              ? {
                  text: `${TIER_NAMES[tier.tier]} is lost below ${formatIndex(tier.lostBelow)}`,
                  tone: 'warning',
                }
              : atTarget && !victory.debt.holds
                ? {
                    text: victory.waitingOnDebt
                      ? 'Only the debt test stands between you and the win'
                      : `Debt burden ${formatPoints(victory.debt.burden - victory.debt.limit)} over the win’s limit`,
                    tone: 'warning',
                  }
                : undefined
          }
          note={
            tier.next === null
              ? `${TIER_NAMES[tier.tier]} · held ${victory.held} of ${victory.needed} quarters to win · debt test ${victory.debt.holds ? 'passed' : 'failed'}`
              : `${TIER_NAMES[tier.tier]} · ${formatIndex(tier.next.distance)} to ${TIER_NAMES[tier.next.tier]}`
          }
          breakdownTitle="What moved prosperity"
          trend={
            <TrendLine
              subject="Prosperity"
              // Quarters recorded before prosperity was measured are left out.
              values={shown.flatMap((record) =>
                record.prosperity === null ? [] : [record.prosperity],
              )}
              format={(value) => formatIndex(value)}
              mark={target}
            />
          }
        >
          <h2 className="label">What prosperity is made of</h2>
          <table className="breakdown__table" aria-label="What prosperity is made of">
            <tbody>
              {prosperity.parts.map((part) => (
                <tr key={part.label}>
                  <th scope="row">{part.label}</th>
                  <td>{formatIndex(part.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Prosperity now</th>
                <td>{formatIndex(prosperity.value)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="breakdown__empty">
            Prosperity is the regions’ living standards averaged by population. Health and education
            build up slowly with spending and wear down without it. Passing a tier raises what
            people expect, which lowers the approval baseline.
          </p>
          <h2 className="label">Tiers</h2>
          <table className="breakdown__table" aria-label="Tiers of prosperity">
            <tbody>
              {TIERS.map((each) => (
                <tr key={each} aria-current={each === tier.tier ? 'true' : undefined}>
                  <th scope="row">
                    {each === tier.tier ? '▶ ' : ''}
                    {TIER_NAMES[each]}
                  </th>
                  <td>from {formatIndex(tierFrom(each), 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="breakdown__empty">
            The target of {formatIndex(prosperity.target, 0)} is where {targetName} begins. Hold{' '}
            {targetName} for {victory.needed} quarters running to win the game: {victory.held} of{' '}
            {victory.needed} held so far. The win also asks that the debt burden be no more than{' '}
            {formatPercent(victory.debt.limit, 0)} of a year’s revenue as the hold completes.
          </p>
          {atTarget && <DebtTestBreakdown victory={victory} />}
        </VitalSign>
        {/* The election is a date, not a figure that moves, so it opens to nothing. */}
        <div
          className="vital vital--election"
          role="group"
          aria-label="Next election"
          title={`Term ${election.term} · ${formatDate(election.date)}`}
        >
          <div className="vital__figures">
            <span className="label">Next election</span>
            <span className="vital__value">
              {game.outcome.status !== 'playing' ? (
                game.outcome.cause === 'election' ? (
                  'Held'
                ) : (
                  'Not held'
                )
              ) : election.quartersAway === 0 ? (
                'This quarter'
              ) : (
                <>
                  {election.quartersAway}
                  <span className="vital__unit"> {quartersWord(election.quartersAway)}</span>
                </>
              )}
            </span>
            <div className="vital__note">
              Term {election.term} · {formatDate(election.date)}
            </div>
          </div>
        </div>
        {/* Austerity counts down to its end, while a bailout's terms hold. */}
        {austerity !== null && (
          <div className="vital vital--austerity" role="group" aria-label="Austerity">
            <div className="vital__figures">
              <span className="label">Austerity</span>
              <span className="vital__value">
                {austerity.quartersLeft}
                <span className="vital__unit"> {quartersWord(austerity.quartersLeft)} left</span>
              </span>
              <div className="vital__note">Ends after {formatDate(austerity.lastQuarter)}</div>
            </div>
          </div>
        )}
      </div>

      <TopBarActions
        playing={game.outcome.status === 'playing'}
        onEndQuarter={onEndQuarter}
        onRestart={onRestart}
        onTour={onTour}
        tips={tips}
      />
    </header>
  );
}
