import { expect, test, type Page } from '@playwright/test';
import {
  approval,
  decisions,
  dilemma,
  endQuarters,
  foodReserve,
  outlook,
  reports,
  startGame,
  tavaraWith,
  treasury,
} from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
const decision = (page: Page) => decisions(page).getByRole('region', { name: 'Decision' });

test('a dilemma is put to the player, who chooses and sees what it did', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWith({ drought: [], dilemmas: { teachersPay: 1 } }) });
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // It arises as the second quarter begins.
  await endQuarters(page, 1);
  const teachers = dilemma(page, 'Teachers demand a pay rise');
  await expect(teachers).toBeVisible();
  await expect(teachers).toContainText('threatens to close the schools');

  // Each option states what it will do before it is chosen.
  const grant = teachers.getByRole('button', { name: /^Grant the rise/ });
  await expect(grant).toContainText('Costs $4.2m.');
  await expect(grant).toContainText('Approval across the country rises by 2.0 points at once');
  await expect(teachers.getByRole('button', { name: /^Refuse it/ })).toContainText(
    'Approval across the country falls by 3.0 points at once, and the effect then fades.',
  );

  // It can be put aside to look at the country, but the quarter cannot end without an answer.
  await teachers.getByRole('button', { name: 'Decide later' }).click();
  await expect(teachers).toBeHidden();
  await expect(decision(page)).toContainText('The quarter cannot end until you choose.');
  await endQuarters(page, 1);
  await expect(teachers).toBeVisible();
  await expect(page.getByRole('banner').getByText('Year 1 · Quarter 2')).toBeVisible();

  await teachers.getByRole('button', { name: /^Refuse it/ }).click();
  await expect(teachers).toBeHidden();
  await expect(decision(page)).toContainText('You chose: Refuse it');
  // The choice is counted in the outlook at once: three points off 51.8%.
  await expect(outlook(page).getByRole('group', { name: 'Approval next quarter' })).toContainText(
    '48.8%',
  );

  // Until the quarter ends the choice can be changed.
  await decision(page).getByRole('button', { name: 'Change your choice' }).click();
  await expect(teachers.getByRole('button', { name: /^Refuse it/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await teachers.getByRole('button', { name: /^Grant the rise/ }).click();
  await expect(decision(page)).toContainText('You chose: Grant the rise');
  await expect(decision(page)).toContainText('Costs $4.2m.');
  await expect(outlook(page).getByRole('group', { name: 'Approval next quarter' })).toContainText(
    '53.8%',
  );

  await endQuarters(page, 1);

  // The report says what was chosen and what it did, and the figures show it.
  await expect(page.getByRole('banner').getByText('Year 1 · Quarter 3')).toBeVisible();
  const entry = reports(page).getByRole('listitem').filter({ hasText: 'Teachers demand' });
  await expect(entry).toContainText('You chose “Grant the rise”. Costs $4.2m.');
  await expect(entry.getByRole('img', { name: 'Decision report' })).toBeVisible();
  await expect(decision(page)).toHaveCount(0);

  await treasury(page).getByRole('button').click();
  await expect(
    page
      .getByRole('region', { name: 'What moved the treasury' })
      .getByRole('row', { name: 'Teachers’ pay' }),
  ).toContainText('−$4.2m');
});

test('a dilemma about one region names it, and its report picks the region out', async ({
  page,
}) => {
  await startGame(page, {
    countryFile: tavaraWith({ drought: ['dry-east'], dilemmas: { emergencyWorks: 1 } }),
  });

  await endQuarters(page, 1);
  const works = dilemma(page, 'The Dry East asks for emergency works');
  await expect(works).toContainText('A decision is needed · The Dry East');
  // Three options, and the way to put the dilemma aside.
  await expect(works.getByRole('button')).toHaveCount(4);

  await works.getByRole('button', { name: /^Send grain instead/ }).click();
  await expect(decision(page)).toContainText(
    'Moves 15,000 t from the national reserve to the region’s own stock.',
  );
  await endQuarters(page, 1);

  const entry = reports(page).getByRole('button', {
    name: /The Dry East asks for emergency works/,
  });
  await entry.click();
  await expect(map(page).getByRole('img', { name: 'The Dry East is picked out' })).toBeVisible();
  await approval(page).getByRole('button').click();
  await expect(page.getByRole('row', { name: 'Emergency works' })).toBeVisible();
});

test('an option the treasury cannot pay for is shown but cannot be chosen', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWith({ drought: [], dilemmas: { teachersPay: 1 } }) });
  // The least tax and the most spending empty the treasury in a quarter.
  const budget = decisions(page);
  await budget.getByRole('slider', { name: 'Tax rate' }).fill('5');
  for (const name of ['Agriculture', 'Food relief', 'Health', 'Education', 'Security']) {
    await budget.getByRole('slider', { name }).fill('20');
  }
  await budget.getByRole('button', { name: 'Commit budget' }).click();

  await endQuarters(page, 1);

  const teachers = dilemma(page, 'Teachers demand a pay rise');
  const grant = teachers.getByRole('button', { name: /^Grant the rise/ });
  await expect(grant).toBeDisabled();
  await expect(grant).toContainText('▲ Cannot be chosen. The treasury holds only $0.1m.');
  await expect(teachers.getByRole('button', { name: /^Refuse it/ })).toBeEnabled();
});

test('in the country as it ships, the seed decides which dilemma arises and when', async ({
  page,
}) => {
  // Seed 1 opens the second quarter with no dilemma.
  await startGame(page, { seed: 1, asShipped: true });
  await endQuarters(page, 1);
  await expect(page.getByRole('banner').getByText('Year 1 · Quarter 2')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(decision(page)).toHaveCount(0);

  // Seed 3 opens it with a neighbour's offer of grain, the reserve being below its safe level.
  // What it offers is reckoned on the people there are, who have grown by a quarter's 0.3%.
  await startGame(page, { seed: 3, asShipped: true });
  await endQuarters(page, 1);
  const offer = dilemma(page, 'A neighbour offers grain');
  await expect(offer).toBeVisible();
  await expect(offer.getByRole('button', { name: /^Buy the whole shipment/ })).toContainText(
    'Costs $12.5m.',
  );
  const half = offer.getByRole('button', { name: /^Buy half of it/ });
  await expect(half).toContainText('Costs $6.3m.');
  await expect(half).toContainText('Adds 26,078 t to the national reserve.');

  await half.click();
  await expect(decision(page)).toContainText('You chose: Buy half of it');
  await endQuarters(page, 1);

  // The same seed opens the third quarter with another: the purchase has left the treasury low.
  const donor = dilemma(page, 'A donor offers a grant with conditions');
  await expect(donor).toBeVisible();
  await donor.getByRole('button', { name: 'Decide later' }).click();

  // What the option said is what the quarter then did.
  const entry = reports(page).getByRole('listitem').filter({ hasText: 'A neighbour offers grain' });
  await expect(entry).toContainText('You chose “Buy half of it”. Costs $6.3m.');
  await treasury(page).getByRole('button').click();
  await expect(
    page
      .getByRole('region', { name: 'What moved the treasury' })
      .getByRole('row', { name: 'Grain from a neighbour' }),
  ).toContainText('−$6.3m');
  await foodReserve(page).getByRole('button').click();
  await expect(
    page
      .getByRole('region', { name: 'What moved the food reserve' })
      .getByRole('row', { name: 'Grain from a neighbour' }),
  ).toContainText('+26,078 t');
});
