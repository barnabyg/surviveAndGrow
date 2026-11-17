import { expect, test } from '@playwright/test';
import {
  decisions,
  endQuarters,
  outlook,
  prosperity,
  situation,
  startGame,
  tavaraWith,
} from './app';

test('prosperity is a vital sign, shown against its target', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWith({ drought: [] }) });

  await expect(prosperity(page).getByRole('button')).toContainText('23.7');
  await expect(prosperity(page).getByRole('button')).toContainText('of 70');
  await expect(prosperity(page)).toContainText('46.3 to the target');
  await expect(prosperity(page)).toContainText('Opening position');
});

test('the prosperity breakdown lists its five parts, adding up to the figure', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWith({ drought: [] }) });

  await prosperity(page).getByRole('button').click();

  const parts = page.getByRole('table', { name: 'What prosperity is made of' });
  await expect(parts.getByRole('rowheader')).toHaveText([
    'Food security',
    'Income per head',
    'Health',
    'Education',
    'Infrastructure access',
    'Prosperity now',
  ]);
  await expect(parts.getByRole('row', { name: /Prosperity now/ })).toContainText('23.7');
});

test('spending on health and education raises prosperity, and the figure says what moved it', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWith({ drought: [] }) });
  await decisions(page).getByRole('slider', { name: 'Health' }).fill('12');
  await decisions(page).getByRole('slider', { name: 'Education' }).fill('12');
  await expect(outlook(page).getByRole('group', { name: 'Prosperity next quarter' })).toHaveText(
    /23\.7 → 2\d\.\d/,
  );
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();

  await endQuarters(page, 2);

  await expect(prosperity(page)).toContainText('▲');
  await prosperity(page).getByRole('button').click();
  const moved = page.getByRole('table', { name: 'What moved prosperity' });
  await expect(moved.getByRole('row', { name: /^Health/ })).toContainText('+');
  await expect(moved.getByRole('row', { name: /^Education/ })).toContainText('+');
});

test('the region list shows each region’s living standard in figures', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWith({ drought: [] }) });

  const regions = situation(page).getByRole('region', { name: 'Regions' });
  await expect(regions.getByRole('button', { name: /Arden Vale/ })).toContainText('26.2');
  await expect(regions.getByRole('button', { name: /Dry East/ })).toContainText('22.4');
});
