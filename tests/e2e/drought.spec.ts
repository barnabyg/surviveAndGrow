import { expect, test, type Page } from '@playwright/test';
import {
  decisions,
  endQuarters,
  foodReserve,
  situation,
  startGame,
  tavaraWithDroughtIn,
} from './app';

const tavaraWithDrought = () => tavaraWithDroughtIn(['dry-east']);

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });

test('a drought appears on the map, and relief sent to the region carries it through', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDrought() });
  await expect(map(page).getByText('Drought · harvest −40%')).toHaveCount(0);

  // The drought is announced in the planting season, two quarters before the harvest.
  await endQuarters(page, 1);
  await expect(situation(page).getByText('Drought in The Dry East')).toBeVisible();
  await expect(map(page).getByText('Drought · harvest −40%')).toBeVisible();
  await expect(
    map(page).getByRole('button', { name: 'The Dry East, food adequate, Drought · harvest −40%' }),
  ).toBeVisible();

  // The player picks the region on the map and sends relief there.
  await map(page)
    .getByRole('button', { name: /^The Dry East/ })
    .click();
  const card = page.getByRole('region', { name: 'The Dry East' });
  await expect(card).toContainText('Drought · harvest −40%');
  await card.getByRole('button', { name: 'Send food relief here' }).click();

  await expect(map(page).getByText('Food relief on its way')).toBeVisible();
  await expect(decisions(page).getByLabel('Send food relief to')).toHaveValue('dry-east');
  await expect(card.getByRole('button', { name: 'Stop sending relief' })).toBeVisible();

  // The failed harvest leaves the region short from the first quarter of year 2.
  await endQuarters(page, 3);
  await expect(decisions(page).getByText(/The Dry East will go short of [\d,]+ t\./)).toBeVisible();
  await expect(decisions(page).getByText(/Relief will deliver all [\d,]+ t/)).toBeVisible();

  await endQuarters(page, 1);
  await page
    .getByRole('banner')
    .getByRole('group', { name: 'Food reserve' })
    .getByRole('button')
    .click();
  await expect(
    page
      .getByRole('region', { name: 'What moved the food reserve' })
      .getByRole('row', { name: 'Relief sent to The Dry East' }),
  ).toContainText(/−[\d,]+ t/);
  // Fed by relief, the region never left the first stage.
  await expect(
    map(page).getByRole('button', { name: /^The Dry East, food adequate/ }),
  ).toBeVisible();
});

test('a drought left alone worsens by stages to famine and ends the game', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDrought() });

  // A year to the failed harvest, then the region goes hungry.
  await endQuarters(page, 5);
  await expect(map(page).getByText('▲ Food: Tight')).toBeVisible();
  await expect(situation(page).getByText('Food is tight in The Dry East')).toBeVisible();
  // The country as a whole still has food.
  await expect(foodReserve(page).getByRole('button')).not.toContainText('0.0 months');

  await endQuarters(page, 1);
  await expect(map(page).getByText('▲ Food: Shortage')).toBeVisible();

  await endQuarters(page, 1);
  await expect(map(page).getByText('▲ Food: Famine')).toBeVisible();
  await expect(situation(page).getByText('Famine in The Dry East')).toBeVisible();
  await expect(situation(page).getByText(/18,000 people have died/)).toBeVisible();

  await endQuarters(page, 1);
  const gameOver = page.getByRole('dialog', { name: 'The state has collapsed' });
  await expect(gameOver).toBeVisible();
  await expect(gameOver).toContainText(
    'Famine held The Dry East for 2 quarters running. The state has collapsed.',
  );

  // It is the same summary an election ends in: the outcome, its cause and the term's figures.
  await expect(gameOver).toContainText('You have lost');
  await expect(gameOver).toContainText(
    'Your government fell after 8 quarters of a 20-quarter term.',
  );
  await expect(gameOver).toContainText('food relief sent in time would have held the famine off');
  const figures = gameOver.getByRole('table', { name: 'The term in figures' });
  await expect(figures.getByRole('row', { name: 'Treasury' })).toContainText('$42.0m');
  await expect(gameOver.getByRole('button', { name: 'Replay this game' })).toBeVisible();

  // The way on is the same game again or a new one.
  await gameOver.getByRole('button', { name: 'Start a new game' }).click();
  await expect(page.getByRole('button', { name: 'Start new game' })).toBeVisible();
});

test('relief can also be directed from the decisions column', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDrought() });

  await decisions(page)
    .getByLabel('Send food relief to')
    .selectOption({ label: 'Salt Coast · food adequate' });

  await expect(
    decisions(page).getByText(
      'Salt Coast is not short of food this quarter, so nothing will be sent.',
    ),
  ).toBeVisible();
  await expect(
    map(page).getByRole('button', { name: 'Salt Coast, food adequate, food relief being sent' }),
  ).toBeVisible();
  await expect(decisions(page).getByText('$7.0m moves 14,000 t a quarter')).toBeVisible();
});
