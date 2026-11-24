import { expect, test, type Page } from '@playwright/test';
import { approval, decisions, endQuarters, outlook, situation, startGame, tavaraWith } from './app';

/** Tavara with no weather to warn of and no dilemma, its regions keeping their faction mixes. */
const tavaraWithFactions = () => tavaraWith({ drought: [], flood: [], factions: true });

const factions = (page: Page) => situation(page).getByRole('region', { name: 'Factions' });
const standing = (page: Page, name: string) => factions(page).locator('summary', { hasText: name });
const agriculture = (page: Page) => decisions(page).getByRole('slider', { name: 'Agriculture' });
const projected = (page: Page, label: string) => outlook(page).getByRole('group', { name: label });
const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
const tipCard = (page: Page) => page.locator('.lessons__card', { hasText: 'First-time tip' });

test('the left column shows how the four factions stand, each in a word with a trend', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithFactions() });

  // Each standing is named in a word beside its figure; the army's is its loyalty and stage.
  await expect(standing(page, 'Farmers')).toHaveAccessibleName('Farmers: content, standing 56.1%');
  await expect(standing(page, 'Workers')).toHaveAccessibleName('Workers: content, standing 47.8%');
  await expect(standing(page, 'Business')).toHaveAccessibleName(
    'Business: content, standing 51.6%',
  );
  await expect(standing(page, 'Army')).toHaveAccessibleName('Army: loyal, standing 58.4%');
  await expect(standing(page, 'Farmers')).toContainText('Content');
  await expect(standing(page, 'Farmers')).toContainText('No trend yet');

  // Opened, a standing says what it is made of and where the budget in force is heading it.
  await standing(page, 'Business').click();
  const made = factions(page).getByRole('table', {
    name: 'What the standing of business is made of',
  });
  await expect(made.getByRole('row', { name: 'Neutral' })).toContainText('50.0%');
  await expect(made.getByRole('row', { name: 'The budget’s balance' })).toContainText(
    '−8.4 points',
  );
  await expect(made.getByRole('row', { name: 'Debt burden' })).toContainText('+10.0 points');
  await expect(factions(page)).toContainText('Settled at 51.6% on the budget in force.');

  // A quarter on, each has a trend line that says the same in words.
  await endQuarters(page, 1);
  await expect(
    factions(page).getByRole('img', {
      name: 'Farmers: standing over the last quarter: unchanged at 56.1%.',
    }),
  ).toBeVisible();
});

test('a budget that favours farmers is forecast for each faction, happens as forecast, and is split by faction in approval’s breakdown', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithFactions() });

  // $5.0m more for agriculture: the outlook says what it would do to each standing next
  // quarter, and where it is heading each.
  await agriculture(page).fill('16');
  await outlook(page).locator('summary', { hasText: 'Factions' }).click();
  await expect(projected(page, 'Farmers next quarter')).toHaveText(
    'Farmers next quarter56.1%, content → 58.2%, content',
  );
  await expect(projected(page, 'Farmers heading for')).toHaveText(
    'Farmers heading for56.1%, content → 66.5%, pleased',
  );
  await expect(projected(page, 'Workers next quarter')).toHaveText(
    'Workers next quarter47.8%, content → 47.1%, content',
  );
  await expect(projected(page, 'Workers heading for')).toHaveText(
    'Workers heading for47.8%, content → 44.5%, content',
  );
  await expect(projected(page, 'Business next quarter')).toHaveText(
    'Business next quarter51.6%, content → 50.3%, content',
  );
  await expect(projected(page, 'Business heading for')).toHaveText(
    'Business heading for51.6%, content → 45.5%, content',
  );
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();

  // A quarter on, each stands where the outlook said.
  await endQuarters(page, 1);
  await expect(standing(page, 'Farmers')).toHaveAccessibleName('Farmers: content, standing 58.2%');
  await expect(standing(page, 'Workers')).toHaveAccessibleName('Workers: content, standing 47.1%');
  await expect(standing(page, 'Business')).toHaveAccessibleName(
    'Business: content, standing 50.3%',
  );

  // Two more and the farmers are pleased: the word changes with the figure.
  await endQuarters(page, 2);
  await expect(standing(page, 'Farmers')).toHaveAccessibleName('Farmers: pleased, standing 61.3%');
  await expect(standing(page, 'Farmers')).toContainText('Pleased');

  // Approval's breakdown has a Factions line, split by faction, saying what moved each.
  await approval(page).getByRole('button').click();
  const moved = page
    .getByRole('region', { name: 'What moved approval' })
    .getByRole('table', { name: 'What moved approval' });
  await expect(moved.getByRole('row', { name: 'Factions' })).toContainText('+0.2 points');
  await expect(
    moved.getByRole('row', { name: 'Farmers · Agriculture’s share of spending' }),
  ).toContainText('+0.2 points');
  // A part that comes to nothing nationally gives no reason.
  await expect(moved.getByRole('row', { name: /^Workers/ })).toHaveText('Workers0.0 points');
  const made = page.getByRole('table', { name: 'What approval is made of' });
  await expect(made.getByRole('row', { name: 'Farmers · Pleased, at 61.3%' })).toBeVisible();
  await expect(made.getByRole('row', { name: /^Business · Content, at/ })).toBeVisible();
  await approval(page).getByRole('button').click();

  // A farming region's card gives its mix and what the factions do to its approval there;
  // so does the card of the region where business is strongest, which they pull down.
  const card = (name: string) => page.getByRole('region', { name, exact: true });
  await map(page)
    .getByRole('button', { name: /^The Dry East/ })
    .click();
  await expect(card('The Dry East').getByRole('note', { name: 'Factions' })).toHaveText(
    'Factions 75% farmers, 20% workers and 5% business. As they stand they move approval here by +2.3 points: farmers +2.5 points, workers −0.2 points and business 0.0 points.',
  );
  await card('The Dry East').getByRole('button', { name: 'Close' }).click();
  await map(page)
    .getByRole('button', { name: /^Salt Coast/ })
    .click();
  await expect(card('Salt Coast').getByRole('note', { name: 'Factions' })).toContainText(
    '15% farmers, 35% workers and 50% business. As they stand they move approval here by −0.1 points',
  );
});

test('a first-time tip explains the factions once they move a region’s approval noticeably', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithFactions(), tips: true });
  await expect(tipCard(page)).toHaveCount(0);

  // Agriculture at the most the slider allows is a share the farmers notice: within the year
  // the farming regions are two points up for it, and the tip points at the standings.
  await agriculture(page).fill('20');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
  await endQuarters(page, 3);
  await expect(tipCard(page).getByRole('heading', { name: 'Factions' })).toBeVisible();
  await expect(tipCard(page)).toContainText('no budget pleases them all');
  await tipCard(page).getByRole('button', { name: 'Got it' }).click();
  await endQuarters(page, 1);
  await expect(tipCard(page).getByRole('heading', { name: 'Factions' })).toHaveCount(0);
});
