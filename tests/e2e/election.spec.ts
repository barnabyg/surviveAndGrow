import { expect, test, type Page } from '@playwright/test';
import {
  decisions,
  endQuarters,
  outlook,
  risks,
  startGame,
  tavaraWithDroughtIn,
  treasury,
} from './app';

const nextElection = (page: Page) =>
  page.getByRole('banner').getByRole('group', { name: 'Next election' });
const electionPanel = (page: Page) => decisions(page).getByRole('region', { name: 'Election' });
const gameFigures = (page: Page) => page.getByRole('table', { name: 'The game in figures' });

/**
 * Tavara without drought, with $500.0m in the treasury. Approval starts, and with an
 * unchanged budget stays, at 45.8%: short of the 50% needed whatever the campaign does.
 */
function tavaraThatDisapproves(): unknown {
  const country = tavaraWithDroughtIn([]);
  (country.start as { treasury: number }).treasury = 500;
  return country;
}

/** Drops food relief, which no one needs without a drought, so the treasury lasts the term. */
async function stopFoodRelief(page: Page): Promise<void> {
  await decisions(page).getByRole('slider', { name: 'Food relief' }).fill('0');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
}

test('the top bar counts down to the election and gives its date', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });

  await expect(nextElection(page)).toContainText('19 quarters');
  await expect(nextElection(page)).toContainText('Year 5, Quarter 4');

  await endQuarters(page, 1);
  await expect(nextElection(page)).toContainText('18 quarters');

  await endQuarters(page, 17);
  await expect(nextElection(page)).toContainText('1 quarter');
  await expect(nextElection(page)).not.toContainText('1 quarters');

  await endQuarters(page, 1);
  await expect(page.getByRole('banner').getByText('Year 5 · Quarter 4')).toBeVisible();
  await expect(nextElection(page)).toContainText('This quarter');
});

test('the vote share forecast is a range against the 50% needed, and answers to the budget', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });

  // Approval stands at 45.8%, and the campaign can move the vote 3 points either way.
  const forecast = electionPanel(page).getByRole('group', { name: 'Vote share forecast' });
  await expect(forecast).toContainText('42.8% to 48.8%');
  await expect(forecast).toContainText('50% needed');
  await expect(electionPanel(page)).toContainText('▲ On course to lose');

  // Tax at its lowest is worth 15.6 points of approval in the end, and 1.6 of them in its
  // first quarter: the outlook shows what that would do to the vote before it is committed.
  await decisions(page).getByRole('slider', { name: 'Tax rate' }).fill('5');
  await expect(outlook(page).getByRole('group', { name: 'Vote share forecast' })).toHaveText(
    'Vote share forecast42.8% to 48.8% → 44.4% to 50.4%',
  );
  await expect(forecast).toContainText('42.8% to 48.8%');

  // Committed, the range straddles the line.
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
  await expect(forecast).toContainText('44.4% to 50.4%');
  await expect(electionPanel(page)).toContainText('▲ Too close to call');
});

test('a term of 20 quarters ends in an election, and the same seed can be replayed', async ({
  page,
}) => {
  await startGame(page, { seed: 3, countryFile: tavaraThatDisapproves() });
  await stopFoodRelief(page);
  await expect(
    electionPanel(page).getByRole('group', { name: 'Vote share forecast' }),
  ).toContainText('42.8% to 48.8%');

  await endQuarters(page, 19);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await endQuarters(page, 1);

  // Approval never left 45.8%, so the vote is lost whatever the campaign did.
  const summary = page.getByRole('dialog', { name: 'You lost the election' });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('You have lost');
  const result = summary.getByText(/^You took 4\d\.\d% of the vote and needed 50%\./);
  await expect(result).toBeVisible();
  const firstResult = await result.textContent();
  await expect(summary).toContainText(
    'Your government was in office for 20 quarters, over one term.',
  );
  const term = summary
    .getByRole('table', { name: 'Term by term' })
    .getByRole('row', { name: /^Term 1/ });
  await expect(term).toContainText('Year 1, Quarter 1Year 5, Quarter 4');
  await expect(term).toContainText('▲ Lost the election');

  const row = (name: string) => gameFigures(page).getByRole('row', { name });
  await expect(row('Treasury')).toContainText('$500.0m');
  await expect(row('Approval').getByRole('cell', { name: '45.8%', exact: true })).toHaveCount(4);
  await expect(row('Prosperity')).toBeVisible();
  await expect(summary).toContainText('Seed 3');
  await expect(
    page.getByRole('banner').getByRole('button', { name: 'End quarter' }),
  ).toBeDisabled();

  // Replaying starts the same game again from its first quarter.
  await summary.getByRole('button', { name: 'Replay this game' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('banner').getByText('Year 1 · Quarter 1')).toBeVisible();
  await expect(treasury(page)).toContainText('$500.0m');
  await expect(treasury(page)).toContainText('Opening position');
  expect(new URL(page.url()).searchParams.get('seed')).toBe('3');

  // The same decisions then lead to the same vote, to the decimal.
  await stopFoodRelief(page);
  await endQuarters(page, 20);
  await expect(summary.getByText(/^You took 4\d\.\d% of the vote/)).toHaveText(firstResult ?? '');

  // A new game is a different one: the address no longer names the seed.
  await summary.getByRole('button', { name: 'Start a new game' }).click();
  await expect(page.getByRole('button', { name: 'Start new game' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('seed')).toBeNull();
});

test('a government the country has turned against loses the election', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  await decisions(page).getByRole('slider', { name: 'Tax rate' }).fill('40');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();

  // Defeat joins the risks once the vote is inside the four quarters they look at.
  await endQuarters(page, 15);
  await expect(page.getByRole('banner').getByText('Year 4 · Quarter 4')).toBeVisible();
  await expect(risks(page).getByText('Election defeat')).toHaveCount(0);
  await endQuarters(page, 1);
  const defeat = risks(page).getByRole('listitem').filter({ hasText: 'Election defeat' });
  await expect(defeat).toContainText('The vote is held in 3 quarters.');
  await expect(defeat).toContainText('50% is needed to win.');
  await expect(defeat.getByRole('img', { name: 'Likelihood 5 of 5' })).toBeVisible();
  await expect(defeat).toContainText('Almost certain');

  await endQuarters(page, 4);

  const summary = page.getByRole('dialog', { name: 'You lost the election' });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('You have lost');
  await expect(summary.getByText(/^You took \d\d\.\d% of the vote and needed 50%\./)).toBeVisible();
  // Approval fell from where it started.
  await expect(gameFigures(page).getByRole('row', { name: 'Approval' })).toContainText('45.8%');
  await expect(summary.getByRole('button', { name: 'Replay this game' })).toBeVisible();
});
