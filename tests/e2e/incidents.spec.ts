import { expect, test, type Page } from '@playwright/test';
import {
  endQuarters,
  openTab,
  reports,
  risks,
  startGame,
  tavaraUnderDefended,
  treasury,
} from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
const neighbour = (page: Page, name: string) =>
  map(page).getByRole('button', { name: new RegExp(`^${name}, neighbour`) });
const region = (page: Page, name: string) =>
  map(page).getByRole('button', { name: new RegExp(`^${name}, `) });
const crossing = (page: Page, name: string) =>
  map(page).getByRole('button', { name: new RegExp(`^${name}, border crossing`) });
const card = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const lens = (page: Page, name: string) =>
  page
    .getByRole('main', { name: 'Country' })
    .getByRole('group', { name: 'Map lens' })
    .getByRole('button', { name, exact: true });
const tipCard = (page: Page) => page.locator('.lessons__card', { hasText: 'First-time tip' });
const incidentReport = (page: Page, headline: string) =>
  reports(page)
    .getByRole('listitem')
    .filter({ has: page.getByText(headline, { exact: true }) });
const capacity = async (page: Page) =>
  (await openTab(page, 'Trade')).getByRole('group', { name: 'Trade capacity' });

/** Dismisses every first-time tip now showing, so that the next to show is a new one. */
async function dismissTips(page: Page): Promise<void> {
  while ((await tipCard(page).count()) > 0) {
    const title = await tipCard(page).getByRole('heading').textContent();
    await tipCard(page).getByRole('button', { name: 'Got it' }).click();
    await expect(
      tipCard(page).getByRole('heading', { name: title ?? '', exact: true }),
    ).toHaveCount(0);
  }
}

// On seed 196 Voskar's draw announces a border incident as the first quarter ends, and
// neither neighbour announces another in the two years after.
const SEED = 196;

test('a border incident is announced, drawn on the map, closes its crossing, costs its border regions and ends', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraUnderDefended(), seed: SEED, tips: true });
  await dismissTips(page);

  // Both neighbours are hostile from the first quarter, and the risks ahead give the chance
  // of an incident with each, and what it would cost.
  await expect(neighbour(page, 'Voskar')).toHaveAccessibleName('Voskar, neighbour: hostile');
  const chance = risks(page)
    .getByRole('listitem')
    .filter({ hasText: 'Border incident with Voskar' });
  await expect(chance).toContainText('Unlikely');
  await expect(chance).toHaveAttribute(
    'title',
    /^Voskar is hostile, and each quarter it is so it may announce a border incident, a 20% chance\. One announced as this quarter ends would begin in 3 quarters\. For 3 quarters Korr Pass \(50,000 t a quarter\) would carry nothing, and Korr Highlands, Salt Coast and The Dry East would produce 20% less\. Approval there would take a blow of 8\.0 points as it began, which fades\. It would cost about \$\d+\.\dm a quarter in tax\.$/,
  );
  // Its card says so too, before any is announced.
  // A hostile neighbour's border is part of its mark, so it is picked by its name.
  await neighbour(page, 'Voskar').locator('.map__neighbour-label').click();
  await expect(card(page, 'Voskar').getByRole('status', { name: 'Border incident' })).toContainText(
    '▲ While Voskar is hostile, each quarter may announce a border incident',
  );
  await card(page, 'Voskar').getByRole('button', { name: 'Close' }).click();

  // The first quarter ends, and Voskar announces one: reported as a warning, tied to Voskar.
  await endQuarters(page, 1);
  const announced = incidentReport(page, 'Border incident with Voskar ahead');
  await expect(announced).toContainText('Warning');
  await expect(announced).toContainText(
    'Voskar is hostile, and its troops are gathering on the border. From Year 1 · Quarter 4, for 3 quarters, Korr Pass (50,000 t a quarter) will carry nothing, and Korr Highlands, Salt Coast and The Dry East will produce 20% less. Approval there will take a blow of 8.0 points as it begins, which fades. It is called off if Voskar is no longer hostile as that quarter begins.',
  );
  await expect(announced.getByRole('img', { name: 'Border incident report' })).toBeVisible();
  // A first-time tip explains border incidents.
  await expect(tipCard(page).getByRole('heading', { name: 'Border incidents' })).toBeVisible();
  await tipCard(page).getByRole('button', { name: 'Got it' }).click();

  // The map draws it on Voskar's border from its announcement, in words and a mark of its
  // own, under every lens; and nothing is closed yet.
  await expect(neighbour(page, 'Voskar')).toHaveAccessibleName(
    'Voskar, neighbour: hostile, border incident in 2 quarters',
  );
  await expect(neighbour(page, 'Voskar')).toHaveAttribute('data-incident', 'announced');
  await expect(neighbour(page, 'Voskar')).toContainText('▲ Border incident in 2 quarters');
  await expect(neighbour(page, 'Voskar').locator('.map__incident')).toBeVisible();
  await expect(neighbour(page, 'Selama')).not.toHaveAttribute('data-incident');
  for (const name of ['Food', 'Approval', 'Living standards', 'Infrastructure', 'Country']) {
    await lens(page, name).click();
    await expect(neighbour(page, 'Voskar')).toContainText('▲ Border incident in 2 quarters');
  }
  await expect(crossing(page, 'Korr Pass')).toHaveAttribute('data-state', 'open');
  // The report picks Voskar out, and its card has the incident and what it will cost.
  await announced.getByRole('button').click();
  const voskar = card(page, 'Voskar');
  await expect(voskar.getByRole('status', { name: 'Border incident' })).toContainText(
    /^▲ Border incident with Voskar ahead\. From Year 1 · Quarter 4, for 3 quarters, Korr Pass \(50,000 t a quarter\) will carry nothing.* It costs about \$\d+\.\dm a quarter in tax\.$/,
  );
  await voskar.getByRole('button', { name: 'Close' }).click();
  // The risks ahead list it as announced until it begins.
  const ahead = risks(page)
    .getByRole('listitem')
    .filter({ hasText: 'Border incident with Voskar ahead' });
  await expect(ahead).toContainText('Almost certain');
  // A region on the border says what is coming to it.
  await region(page, 'Korr Highlands').click();
  await expect(
    card(page, 'Korr Highlands').getByRole('status', { name: 'Border incident with Voskar' }),
  ).toHaveText(
    '▲ Border incident with Voskar from Year 1, Quarter 4: output −20% for 3 quarters, and a blow of 8.0 points to approval here as it begins. It is called off if Voskar is no longer hostile by then.',
  );
  await card(page, 'Korr Highlands').getByRole('button', { name: 'Close' }).click();

  // Two quarters on it begins: reported as serious, and the mark on the border is solid.
  await endQuarters(page, 2);
  const begun = incidentReport(page, 'Border incident with Voskar');
  await expect(begun).toContainText('Serious');
  await expect(begun).toContainText(
    'Voskar is still hostile, and its troops have closed the border. For 3 quarters Korr Pass (50,000 t a quarter) carries nothing, and Korr Highlands, Salt Coast and The Dry East produce 20% less.',
  );
  await expect(neighbour(page, 'Voskar')).toHaveAccessibleName(
    'Voskar, neighbour: hostile, border incident: 3 quarters left',
  );
  await expect(neighbour(page, 'Voskar')).toHaveAttribute('data-incident', 'in-force');
  await expect(neighbour(page, 'Voskar')).toContainText('▲ Border incident: 3 quarters left');

  // The crossing is closed, on the map and in its card.
  await expect(crossing(page, 'Korr Pass')).toHaveAttribute('data-state', 'closed');
  await expect(crossing(page, 'Korr Pass')).toHaveAccessibleName(
    'Korr Pass, border crossing to Voskar, closed by the border incident with Voskar, this quarter and 2 more: it carries nothing',
  );
  await expect(crossing(page, 'Korr Pass')).toContainText('✕ Closed this quarter and 2 more');
  await expect(crossing(page, 'Selama bridge')).toHaveAttribute('data-state', 'open');
  await crossing(page, 'Korr Pass').click();
  await expect(card(page, 'Korr Pass')).toContainText('Border crossing · closed');
  await expect(card(page, 'Korr Pass').getByRole('status', { name: 'Closed' })).toHaveText(
    '✕ Closed by the border incident with Voskar: it carries nothing this quarter and 2 more. Grain ordered goes by the links left open.',
  );
  await card(page, 'Korr Pass').getByRole('button', { name: 'Close' }).click();

  // The trade panel shows the crossing closed, and for how long, and carries only what the
  // other crossing does.
  const links = await capacity(page);
  await expect(links.getByRole('row', { name: /Trade links carry/ })).toContainText('40,000 t');
  await expect(links.getByRole('status', { name: 'Closed crossings' })).toHaveText(
    '✕ Korr Pass is closed by a border incident and carries nothing: Korr Pass this quarter and 2 more.',
  );
  await links.getByText('Trade links', { exact: true }).click();
  await expect(links.getByRole('listitem').filter({ hasText: 'Korr Pass' })).toContainText(
    'Border crossing to Voskar, ✕ closed by the border incident this quarter and 2 more · 0 t',
  );
  await expect(links.getByRole('listitem').filter({ hasText: 'Selama bridge' })).toContainText(
    'Border crossing to Selama · 40,000 t',
  );

  // Each region on the border is tagged with what it costs, and its card says for how long.
  await expect(map(page).getByText('▲ Border incident · output −20%')).toHaveCount(3);
  await expect(region(page, 'Salt Coast')).toHaveAccessibleName(/border incident · output −20%/);
  await region(page, 'Salt Coast').click();
  await expect(
    card(page, 'Salt Coast').getByRole('status', { name: 'Border incident with Voskar' }),
  ).toHaveText(
    '▲ Border incident with Voskar · output −20% this quarter and 2 more. The treasury’s breakdown shows the tax it costs here.',
  );
  await card(page, 'Salt Coast').getByRole('button', { name: 'Close' }).click();

  // The quarter lived under it: the treasury's breakdown names the incident in each region.
  await endQuarters(page, 1);
  await treasury(page).getByRole('button').click();
  const moved = page.getByRole('region', { name: 'What moved the treasury' });
  for (const name of ['Korr Highlands', 'Salt Coast', 'The Dry East']) {
    await expect(
      moved.getByRole('row', { name: `Lost to the border incident with Voskar in ${name}` }),
    ).toContainText('−$');
  }
  await treasury(page).getByRole('button').click();
  await expect(neighbour(page, 'Voskar')).toContainText('▲ Border incident: 2 quarters left');
  await expect(links.getByRole('status', { name: 'Closed crossings' })).toContainText(
    'Korr Pass this quarter and 1 more.',
  );

  // Two quarters more and it ends: reported, the mark gone and the crossing carrying again.
  await endQuarters(page, 2);
  const ended = incidentReport(page, 'Border incident with Voskar has ended');
  await expect(ended).toContainText(
    'Voskar’s troops have drawn back from the border. Korr Pass carries goods again, and Korr Highlands, Salt Coast and The Dry East produce in full.',
  );
  await expect(neighbour(page, 'Voskar')).toHaveAccessibleName('Voskar, neighbour: hostile');
  await expect(neighbour(page, 'Voskar')).not.toHaveAttribute('data-incident');
  await expect(neighbour(page, 'Voskar').locator('.map__incident')).toHaveCount(0);
  await expect(crossing(page, 'Korr Pass')).toHaveAttribute('data-state', 'open');
  await expect(map(page).getByText('▲ Border incident · output −20%')).toHaveCount(0);
  await expect(links.getByRole('row', { name: /Trade links carry/ })).toContainText('90,000 t');
  await expect(links.getByRole('status', { name: 'Closed crossings' })).toHaveCount(0);

  // The legend explains the marks.
  const legend = page.getByRole('list', { name: 'Map legend' });
  await expect(legend).toContainText(
    '▲ Border incident announced: a hostile neighbour, on its border',
  );
  await expect(legend).toContainText(
    '▲ Border incident in force: its crossings closed, its border regions produce less',
  );
  await expect(legend).toContainText('✕ Border crossing closed by a border incident');
});
