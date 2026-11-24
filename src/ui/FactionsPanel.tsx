import {
  factionStandings,
  formatPercent,
  formatSignedPoints,
  type FactionStatus,
  type GameState,
} from '../sim';
import { recent } from './trend';
import { TrendLine } from './TrendLine';
import './FactionsPanel.css';

/** Whether a faction stands badly enough to be marked: uneasy or angry, restless or plotting. */
export function isTroubled(status: Pick<FactionStatus, 'mood' | 'stage'>): boolean {
  return (
    status.mood === 'uneasy' ||
    status.mood === 'angry' ||
    (status.stage !== null && status.stage !== 'loyal')
  );
}

/**
 * How farmers, workers, business and the army stand with the government: each standing with
 * the word for it and a trend line, and opened, what it is made of and where the budget in
 * force is heading it. The army's standing is national army loyalty. A sign and the word
 * mark a faction that stands badly, and colour only adds to them.
 */
export function FactionsPanel({ game }: { readonly game: GameState }) {
  const { standings } = factionStandings(game);
  const shown = recent(game.history);
  return (
    <section className="factions" aria-labelledby="factions-title" data-tour="factions">
      <div className="section-head">
        <h2 className="section-title" id="factions-title">
          Factions
        </h2>
        <span className="section-note">Standing with the government</span>
      </div>
      <ul>
        {standings.map((each) => {
          const troubled = isTroubled(each);
          // Quarters recorded before the factions, or the army, were kept are left out.
          const values = shown.flatMap((record) => {
            const value =
              each.faction === 'army' ? record.armyLoyalty : record.standings?.[each.faction];
            return value === null || value === undefined ? [] : [value];
          });
          return (
            <li key={each.faction}>
              <details className="faction-row">
                <summary
                  aria-label={`${each.name}: ${each.word.toLowerCase()}, standing ${formatPercent(each.standing)}`}
                >
                  <span className="faction-row__name">{each.name}</span>
                  <span
                    className={
                      troubled
                        ? 'faction-row__word faction-row__word--troubled'
                        : 'faction-row__word'
                    }
                  >
                    {troubled && '▲ '}
                    {each.word}
                  </span>
                  <span className="faction-row__standing">{formatPercent(each.standing)}</span>
                  <TrendLine
                    subject={`${each.name}: standing`}
                    values={values}
                    format={formatPercent}
                    size="small"
                  />
                </summary>
                <table
                  className="faction-row__causes"
                  aria-label={`What the standing of ${each.name.toLowerCase()} is made of`}
                >
                  <tbody>
                    {each.causes.map((cause, index) => (
                      <tr key={cause.label}>
                        <th scope="row">{cause.label}</th>
                        <td>
                          {index === 0
                            ? formatPercent(cause.amount)
                            : formatSignedPoints(cause.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="faction-row__note">
                  {each.settles === each.standing
                    ? `Settled at ${formatPercent(each.standing)} on the budget in force.`
                    : `Heading for ${formatPercent(each.settles)}, ${each.settlesWord.toLowerCase()}, on the budget in force, a part of the way each quarter.`}
                  {each.faction === 'army'
                    ? ' The army lives among no region’s people and moves no approval: its standing is national army loyalty.'
                    : ''}
                </p>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
