import { expect, test, type Page } from '@playwright/test';
import {
  approval,
  endQuarters,
  foodReserve,
  situation,
  startGame,
  tavaraWithDroughtIn,
  treasury,
} from './app';

/** The larger approval chart in the left column. */
const approvalChart = (page: Page) => situation(page).getByRole('region', { name: 'Approval' });

test('a new game says there is not yet a trend to draw', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });

  for (const vital of [treasury(page), foodReserve(page), approval(page)]) {
    await expect(vital.getByText('No trend yet')).toBeVisible();
    await expect(vital.getByRole('img')).toHaveCount(0);
  }
  await expect(approvalChart(page).getByText('There is not yet a trend to draw.')).toBeVisible();
  await expect(approvalChart(page).getByRole('img')).toHaveCount(0);
});

test('trend lines appear beside the vital signs once quarters have been played', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });

  await endQuarters(page, 3);

  // The budget runs $5.0m short a quarter, and the reserve spoils with no harvest yet in.
  await expect(
    treasury(page).getByRole('img', {
      name: 'Treasury over the last 3 quarters: fell from $42.0m to $27.0m.',
    }),
  ).toBeVisible();
  await expect(
    foodReserve(page).getByRole('img', {
      name: 'Food reserve over the last 3 quarters: fell from 2.1 months to 1.6 months, and is below the 3-month safe level.',
    }),
  ).toBeVisible();
  await expect(
    approval(page).getByRole('img', {
      name: 'Approval over the last 3 quarters: unchanged at 51.8%, and is above the 40% strike threshold.',
    }),
  ).toBeVisible();
  await expect(treasury(page).getByText('No trend yet')).toHaveCount(0);

  // The marks on the small charts are named in words, not left to a dashed line alone: in the
  // figure's tooltip, read out with it, and at the head of its breakdown.
  await expect(foodReserve(page)).toHaveAttribute('title', /Safe level: 3 months/);
  await expect(foodReserve(page)).toContainText('Safe level: 3 months');
  await expect(approval(page)).toHaveAttribute('title', 'Strikes below 40%');
  await approval(page)
    .getByRole('button', { name: /Approval/ })
    .click();
  await expect(
    approval(page)
      .getByRole('region', { name: 'What moved approval' })
      .getByText('Strikes below 40%', { exact: true }),
  ).toBeVisible();
});

test('the approval chart marks the strike threshold and the 50% line', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  await endQuarters(page, 2);

  const chart = approvalChart(page);
  await expect(
    chart.getByRole('img', {
      name: 'Approval over the last 2 quarters: unchanged at 51.8%, and is above the 40% strike threshold and above the 50% line.',
    }),
  ).toBeVisible();
  await expect(chart.getByText('Strikes below 40%')).toBeVisible();
  await expect(chart.getByText('50% line')).toBeVisible();
  await expect(chart.getByText('Start of the term')).toBeVisible();
  await expect(chart.getByText('Now', { exact: true })).toBeVisible();
});

test('a trend covers the last eight quarters and no more', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });

  await endQuarters(page, 10);

  // Two quarters in, the treasury stood at $32.0m; that is where the eight quarters begin.
  await expect(
    treasury(page).getByRole('img', {
      name: /^Treasury over the last 8 quarters: fell from \$32\.0m to \$\d+\.\dm\.$/,
    }),
  ).toBeVisible();
  await expect(approvalChart(page).getByText('8 quarters ago')).toBeVisible();
  await expect(approvalChart(page).getByText('Last 8 quarters')).toBeVisible();
});
