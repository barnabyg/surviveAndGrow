import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, outlook, startGame, tavaraWithDroughtIn, treasury } from './app';

const nextElection = (page: Page) =>
  page.getByRole('banner').getByRole('group', { name: 'Next election' });
const electionPanel = (page: Page) => decisions(page).getByRole('region', { name: 'Election' });
const termFigures = (page: Page) => page.getByRole('table', { name: 'The term in figures' });

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

  // Approval stands at 54.3%, and the campaign can move the vote 3 points either way.
  const forecast = electionPanel(page).getByRole('group', { name: 'Vote share forecast' });
  await expect(forecast).toContainText('51.3% to 57.3%');
  await expect(forecast).toContainText('50% needed');
  await expect(electionPanel(page)).toContainText('On course to win');

  // A tax rise costs 8.0 points of approval in its first quarter: the outlook shows what
  // that would do to the vote before anything is committed.
  await decisions(page).getByRole('slider', { name: 'Tax rate' }).fill('40');
  await expect(outlook(page).getByRole('group', { name: 'Vote share forecast' })).toHaveText(
    'Vote share forecast51.3% to 57.3% → 43.3% to 49.3%',
  );
  await expect(forecast).toContainText('51.3% to 57.3%');

  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
  await expect(forecast).toContainText('43.3% to 49.3%');
  await expect(electionPanel(page)).toContainText('▲ On course to lose');

  // In between, the range straddles the line.
  await decisions(page).getByRole('slider', { name: 'Tax rate' }).fill('29');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
  await expect(forecast).toContainText('47.3% to 53.3%');
  await expect(electionPanel(page)).toContainText('▲ Too close to call');
});

test('a term of 20 quarters ends in an election, and the same seed can be replayed', async ({
  page,
}) => {
  await startGame(page, { seed: 3, countryFile: tavaraWithDroughtIn([]) });
  await stopFoodRelief(page);

  await endQuarters(page, 19);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await endQuarters(page, 1);

  // Approval never left 54.3%, so the vote is won whatever the campaign did.
  const summary = page.getByRole('dialog', { name: 'You won the election' });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('You have won');
  const result = summary.getByText(/^You took 5\d\.\d% of the vote and needed 50%\./);
  await expect(result).toBeVisible();
  const firstResult = await result.textContent();
  await expect(summary).toContainText('The term ran its full 20 quarters.');

  // The budget ran $2.0m over each quarter for 20 quarters.
  const row = (name: string) => termFigures(page).getByRole('row', { name });
  await expect(row('Treasury')).toContainText('$42.0m');
  await expect(row('Treasury')).toContainText('$82.0m');
  await expect(row('Approval').getByRole('cell', { name: '54.3%', exact: true })).toHaveCount(4);
  await expect(row('Food reserve')).toContainText('2.1 months');
  await expect(summary).toContainText('Seed 3');
  await expect(
    page.getByRole('banner').getByRole('button', { name: 'End quarter' }),
  ).toBeDisabled();

  // Replaying starts the same game again from its first quarter.
  await summary.getByRole('button', { name: 'Replay this game' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('banner').getByText('Year 1 · Quarter 1')).toBeVisible();
  await expect(treasury(page)).toContainText('$42.0m');
  await expect(treasury(page)).toContainText('Opening position');
  expect(new URL(page.url()).searchParams.get('seed')).toBe('3');

  // The same decisions then lead to the same vote, to the decimal.
  await stopFoodRelief(page);
  await endQuarters(page, 20);
  await expect(summary.getByText(/^You took 5\d\.\d% of the vote/)).toHaveText(firstResult ?? '');

  // A new game is a different one: the address no longer names the seed.
  await summary.getByRole('button', { name: 'Start a new game' }).click();
  await expect(page.getByRole('button', { name: 'Start new game' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('seed')).toBeNull();
});

test('a government the country has turned against loses the election', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  await decisions(page).getByRole('slider', { name: 'Tax rate' }).fill('40');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();

  await endQuarters(page, 20);

  const summary = page.getByRole('dialog', { name: 'You lost the election' });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('You have lost');
  await expect(summary.getByText(/^You took \d\d\.\d% of the vote and needed 50%\./)).toBeVisible();
  // Approval fell from where it started.
  await expect(termFigures(page).getByRole('row', { name: 'Approval' })).toContainText('54.3%');
  await expect(summary.getByRole('button', { name: 'Replay this game' })).toBeVisible();
});
