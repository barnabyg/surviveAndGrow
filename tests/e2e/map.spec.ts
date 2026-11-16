import { expect, test } from '@playwright/test';
import { openApp, startGame, testlandFile } from './app';

test('the map shows the country with its regions, settlements, neighbours and sea named', async ({
  page,
}) => {
  await startGame(page);

  const map = page.getByRole('group', { name: 'Map of Republic of Tavara' });
  await expect(map).toBeVisible();
  const names = [
    ...['Korr Highlands', 'Salt Coast', 'Lowmere Plains', 'The Dry East', 'South Delta'],
    ...['Arden Vale', 'Arden', 'Westhaven', 'Dustwell', 'Voskar', 'Selama', 'Southern Sea'],
  ];
  for (const name of names) {
    await expect(map.getByText(name, { exact: true })).toBeVisible();
  }
});

test('the map sits in the centre column and keeps its 3:2 shape', async ({ page }) => {
  await startGame(page);

  const column = await page.getByRole('main').boundingBox();
  const map = await page.getByRole('group', { name: 'Map of Republic of Tavara' }).boundingBox();
  if (!column || !map) throw new Error('The map is missing');

  expect(map.x).toBeGreaterThanOrEqual(column.x);
  expect(map.x + map.width).toBeLessThanOrEqual(column.x + column.width);
  expect(map.width / map.height).toBeCloseTo(3 / 2, 2);
  // The whole map is on screen without scrolling.
  expect(map.y + map.height).toBeLessThanOrEqual(1440);
});

test('a second country is drawn through the same code', async ({ page }) => {
  await startGame(page, { countryFile: testlandFile() });

  await expect(page.getByRole('banner').getByRole('heading', { name: 'Testland' })).toBeVisible();
  const map = page.getByRole('group', { name: 'Map of Testland' });
  for (const name of ['Northfield', 'Sandreach', 'Alpha', 'Beta', 'Elsewhere']) {
    await expect(map.getByText(name, { exact: true })).toBeVisible();
  }
});

test('a country file is only read from the site the game is served from', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/?country=https://countries.example/mine.json');

  await expect(
    page.getByRole('heading', { name: 'This country file cannot be used' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Country files are read from this site only, and https://countries.example/mine.json is elsewhere.',
    ),
  ).toBeVisible();
  expect(requests.filter((url) => new URL(url).hostname === 'countries.example')).toEqual([]);
});

test('a country author is told what is wrong with their file', async ({ page }) => {
  const file = testlandFile();
  delete file.name;
  const [first, second] = file.regions as Record<string, unknown>[];
  file.regions = [first, { ...second, terrain: 'swamp' }];

  await openApp(page, { countryFile: file });

  await expect(
    page.getByRole('heading', { name: 'This country file cannot be used' }),
  ).toBeVisible();
  await expect(page.getByText('name is missing.')).toBeVisible();
  await expect(
    page.getByText(
      'regions[1].terrain is "swamp", which is not one of: plains, highlands, coast, arid, delta, valley.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start new game' })).toHaveCount(0);
});
