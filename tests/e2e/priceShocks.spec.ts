import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, reports, risks, startGame, tavaraWith } from './app';

const grainPrice = (page: Page) =>
  decisions(page)
    .getByRole('region', { name: 'Trade' })
    .getByRole('group', { name: 'World grain price' });

test('a world price shock is announced ahead, shown on the price, and pushes it as it begins', async ({
  page,
}) => {
  // Harvests fail abroad whenever they can.
  await startGame(page, {
    countryFile: tavaraWith({ drought: [], shocks: { failedHarvestsAbroad: 1 } }),
  });

  // Before it is announced, the risks say it could be.
  await expect(
    risks(page).getByRole('listitem').filter({ hasText: 'Failed harvests abroad' }),
  ).toContainText('Should failed harvests abroad be announced as this quarter ends');

  await endQuarters(page, 1);

  // Announced: in the report, beside the price and among the risks.
  await expect(reports(page).getByText('Failed harvests abroad ahead')).toBeVisible();
  const shocks = decisions(page).getByRole('list', {
    name: 'World price shocks on world grain price',
  });
  await expect(shocks).toContainText(
    'Failed harvests abroad ahead: From Year 1 · Quarter 4 the world grain price will be pushed up by $36 a tonne each quarter for 3 quarters.',
  );
  await expect(
    risks(page).getByRole('listitem').filter({ hasText: 'Failed harvests abroad ahead' }),
  ).toContainText('Announced: from Year 1 · Quarter 4');

  await endQuarters(page, 2);

  // Begun: the report says so, and the price says what pushed it.
  await expect(
    reports(page).getByText('Failed harvests abroad pushes the world grain price up'),
  ).toBeVisible();
  await expect(shocks).toContainText(
    'Failed harvests abroad: The world grain price was pushed up by $36 a tonne as this quarter began, and will be for 2 more quarters.',
  );
  await grainPrice(page)
    .getByRole('button', { name: /World grain price/ })
    .click();
  const moved = grainPrice(page).getByRole('table', { name: 'What moved the world grain price' });
  await expect(moved.getByRole('row', { name: /Failed harvests abroad/ })).toContainText('+$36');
});
