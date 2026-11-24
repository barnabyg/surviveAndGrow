import { expect, test, type Page } from '@playwright/test';
import {
  decisions,
  endQuarters,
  openTab,
  reports,
  risks,
  startGame,
  tavaraWith,
  tavaraWithDroughtIn,
} from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });

test('a country in no danger says so', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });

  await expect(risks(page)).toContainText('Next 4 quarters');
  await expect(risks(page)).toContainText('No danger is in sight.');
  await expect(risks(page).getByRole('listitem')).toHaveCount(0);
});

test('a famine risk is listed during a drought, and relief sent to the region lifts it', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn(['dry-east']) });

  // The drought begins as the planting season opens.
  await endQuarters(page, 1);
  await expect(map(page).getByText('Drought · harvest −40%')).toBeVisible();

  const famine = risks(page).getByRole('button', { name: /Famine in The Dry East/ });
  await expect(risks(page).getByRole('listitem')).toHaveCount(1);
  await expect(famine).toContainText(
    'Poor weather before the harvest would leave it short of food in 3 quarters.',
  );
  // The likelihood is a meter and a word, so it does not rest on colour.
  await expect(famine).toContainText('Almost certain');
  await expect(famine.getByRole('img', { name: 'Likelihood 5 of 5' })).toBeVisible();

  // Selecting the risk picks its region out on the map, where the player can act on it.
  await expect(famine).toContainText('On the map ›');
  await famine.click();
  await expect(famine).toHaveAttribute('aria-pressed', 'true');
  await expect(famine).toContainText('◆ Picked out on the map');
  await expect(map(page).getByRole('img', { name: 'The Dry East is picked out' })).toBeVisible();
  await page
    .getByRole('region', { name: 'The Dry East' })
    .getByRole('button', { name: 'Send food relief here' })
    .click();

  await expect(risks(page)).toContainText('No danger is in sight.');
});

test('the risks answer to the budget once it is committed', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  const budget = decisions(page);

  await budget.getByRole('slider', { name: 'Tax rate' }).fill('40');
  await expect(risks(page)).toContainText('No danger is in sight.');

  await budget.getByRole('button', { name: 'Commit budget' }).click();
  // Approval falls a tenth of the way each quarter; after two, strikes are in sight.
  await endQuarters(page, 2);

  const strikes = risks(page).getByRole('listitem').filter({ hasText: 'Strikes' });
  await expect(strikes).toContainText(
    'Approval in every region is on course to fall below 40% in 3 quarters.',
  );
  await expect(strikes).toContainText('Almost certain');
  // A danger to the whole country has no one place to show.
  await expect(risks(page).getByRole('button')).toHaveCount(0);
});

/**
 * Tavara with no drought or flood, a treasury of the given size in millions, $1.0m on security
 * and $5.0m on food relief, which leaves its budget losing $1.0m a quarter: little enough that
 * the treasury covers the budget for a year and an instalment of $2.0m a quarter is what it
 * runs short of.
 */
function tavaraHolding(treasury: number) {
  const country = tavaraWith({ drought: [], flood: [] }) as ReturnType<typeof tavaraWith> & {
    start: { treasury: number; budget: { spending: Record<string, number> } };
  };
  country.start.treasury = treasury;
  country.start.budget.spending.security = 1;
  country.start.budget.spending.foodRelief = 5;
  return country;
}

const emptyTreasury = (page: Page) =>
  risks(page).getByRole('listitem').filter({ hasText: 'Empty treasury' });

test('research planned that the treasury cannot see through is warned of before it pauses', async ({
  page,
}) => {
  // $8.0m covers the seed's whole cost, as starting it needs, but not its instalments beside
  // the budget's losses: two are paid and the third is not.
  await startGame(page, { countryFile: tavaraHolding(8) });
  await expect(risks(page)).toContainText('Next 4 quarters');
  await expect(emptyTreasury(page)).toHaveCount(0);

  const research = await openTab(page, 'Research');
  await research.getByRole('button', { name: 'Research Drought-resistant seed' }).click();
  await expect(emptyTreasury(page)).toContainText(
    'As things stand the treasury cannot cover the instalment on research into Drought-resistant seed in 2 quarters, and the research will pause.',
  );
  await expect(emptyTreasury(page)).toContainText('Almost certain');

  await endQuarters(page, 2);
  await expect(emptyTreasury(page)).toContainText('this quarter, and the research will pause.');
  await expect(reports(page).getByText('Research paused: Drought-resistant seed')).toHaveCount(0);
  await endQuarters(page, 1);
  await expect(reports(page).getByText('Research paused: Drought-resistant seed')).toBeVisible();
});

test('a survey planned that the treasury cannot see through is warned of before it pauses', async ({
  page,
}) => {
  // $5.0m covers the survey's $4.0m, but not its second instalment after two quarters' losses.
  await startGame(page, { countryFile: tavaraHolding(5) });
  await expect(risks(page)).toContainText('Next 4 quarters');
  await expect(emptyTreasury(page)).toHaveCount(0);

  await map(page)
    .getByRole('button', { name: /^Salt Coast/ })
    .click();
  await page
    .getByRole('region', { name: 'Salt Coast', exact: true })
    .getByRole('button', { name: 'Survey Salt Coast' })
    .click();
  await expect(emptyTreasury(page)).toContainText(
    'As things stand the treasury cannot cover the instalment on the survey of Salt Coast next quarter, and the survey will pause.',
  );
  await expect(emptyTreasury(page)).toContainText('Almost certain');

  await endQuarters(page, 2);
  await expect(reports(page).getByText('Survey paused: Salt Coast')).toBeVisible();
});

test('beyond the first four risks the rest are folded away until asked for', async ({ page }) => {
  // Tavara as it ships threatens drought and flood across the country from the start.
  await startGame(page);
  await expect(risks(page).getByRole('listitem')).toHaveCount(4);
  const more = risks(page).getByRole('button', { name: /^Show \d+ more$/ });
  const folded = Number((await more.textContent())?.match(/\d+/)?.[0]);
  expect(folded).toBeGreaterThan(0);

  await more.click();
  await expect(risks(page).getByRole('listitem')).toHaveCount(4 + folded);
  await risks(page).getByRole('button', { name: 'Show fewer' }).click();
  await expect(risks(page).getByRole('listitem')).toHaveCount(4);
});

test('a risk is two lines, its reason cut short until it is picked out', async ({ page }) => {
  await startGame(page);
  const famine = risks(page).getByRole('button', { name: /^Famine in The Dry East/ });
  const reason = famine.locator('.risk__reason');
  // The whole reason is always there for a screen reader, and in a tooltip.
  await expect(famine).toContainText('would leave it short of food');
  await expect(reason).toHaveCSS('white-space', 'nowrap');

  await famine.click();
  await expect(reason).toHaveCSS('white-space', 'normal');
});
