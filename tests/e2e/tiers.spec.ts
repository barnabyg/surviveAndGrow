import { expect, test, type Page } from '@playwright/test';
import {
  approval,
  decisions,
  endQuarters,
  prosperity,
  reports,
  startGame,
  tavaraPoisedBelowDeveloping,
} from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });

test('the prosperity figure shows the tier in force and how far it is to the next', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraPoisedBelowDeveloping() });

  await expect(prosperity(page)).toContainText('Subsistence · 0.3 to Developing');
});

test('passing a tier is reported, raises expectations and changes the map’s palette', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraPoisedBelowDeveloping() });
  // The Subsistence sea.
  await expect(map(page)).toHaveCSS('background-color', 'rgb(39, 68, 79)');
  await decisions(page).getByRole('slider', { name: 'Health' }).fill('20');
  await decisions(page).getByRole('slider', { name: 'Education' }).fill('20');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();

  await endQuarters(page, 1);

  await expect(
    reports(page).getByRole('listitem').filter({ hasText: 'Prosperity has reached a new tier' }),
  ).toContainText('People now expect more: the approval baseline is 3.0 points lower.');
  await expect(prosperity(page)).toContainText('Developing ·');
  // The Developing sea: the whole map's look has changed, and nothing else about it.
  await expect(map(page)).toHaveCSS('background-color', 'rgb(33, 73, 90)');
  await expect(map(page)).toHaveAttribute('data-tier', 'developing');

  await approval(page).getByRole('button').click();
  await expect(
    page.getByRole('table', { name: 'What approval is made of' }).getByRole('row', {
      name: /^Expectations/,
    }),
  ).toContainText('−3.0 points');
});
