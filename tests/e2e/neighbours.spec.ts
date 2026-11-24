import { expect, test, type Page } from '@playwright/test';
import {
  decisions,
  endQuarters,
  outlook,
  reports,
  risks,
  startGame,
  tavaraPoisedBelowDeveloping,
} from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
const neighbour = (page: Page, name: string) =>
  map(page).getByRole('button', { name: new RegExp(`^${name}, neighbour`) });
const card = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const defence = (page: Page) => decisions(page).getByRole('slider', { name: 'Defence' });
const projected = (page: Page, label: string) => outlook(page).getByRole('group', { name: label });
const lens = (page: Page, name: string) =>
  page
    .getByRole('main', { name: 'Country' })
    .getByRole('group', { name: 'Map lens' })
    .getByRole('button', { name, exact: true });
const tipCard = (page: Page) => page.locator('.lessons__card', { hasText: 'First-time tip' });

/** Raises health and education enough that the quarter carries the country into Developing. */
async function prosper(page: Page): Promise<void> {
  await decisions(page).getByRole('slider', { name: 'Health' }).fill('20');
  await decisions(page).getByRole('slider', { name: 'Education' }).fill('20');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
}

test('each neighbour is on the map with what it intends, and its card says what it would take', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraPoisedBelowDeveloping() });

  // At Subsistence both are peaceful, in a word beside a mark, under every lens.
  for (const name of ['Voskar', 'Selama']) {
    await expect(neighbour(page, name)).toHaveAccessibleName(`${name}, neighbour: peaceful`);
    await expect(neighbour(page, name)).toContainText('Peaceful');
    await expect(neighbour(page, name)).toHaveAttribute('data-intention', 'peaceful');
  }
  await lens(page, 'Approval').click();
  await expect(neighbour(page, 'Voskar')).toContainText('Peaceful');
  await lens(page, 'Country').click();

  // Picking one opens its card: its intention, deterrence and why nothing threatens yet.
  await neighbour(page, 'Voskar').click();
  await expect(neighbour(page, 'Voskar')).toHaveAttribute('aria-pressed', 'true');
  const voskar = card(page, 'Voskar');
  await expect(voskar).toContainText('Neighbour · Peaceful');
  await expect(voskar).toContainText('Deterrence39.0%');
  await expect(voskar).toContainText('Ambition60%');
  await expect(voskar.getByRole('status', { name: 'What it would take' })).toHaveText(
    'At Subsistence the country has nothing worth taking: Voskar’s ambition weighs nothing against deterrence, so it is peaceful whatever is spent on Defence. That changes as the country prospers.',
  );
  // What its ambition weighs grows with the tier, the one in force marked.
  const weighs = voskar.getByRole('table', { name: 'What its ambition weighs' });
  await expect(weighs.getByRole('row', { name: /^Subsistence \(now\)/ })).toContainText('0.0%');
  await expect(weighs.getByRole('row', { name: /^Developing/ })).toContainText('33.0%');
  await expect(weighs.getByRole('row', { name: /^Industrialising/ })).toContainText('48.0%');
  await expect(weighs.getByRole('row', { name: /^Prosperous/ })).toContainText('60.0%');
  await expect(voskar.getByRole('status', { name: 'What moved it' })).toHaveText(
    'Last quarter Nothing has moved it yet.',
  );
  await expect(voskar.getByRole('status', { name: 'Where it is heading' })).toContainText(
    'Defence at $2.0m a quarter, against the $2.1m the army expects, settles deterrence at 39.0%, where Voskar would be peaceful.',
  );
  await voskar.getByRole('button', { name: 'Close' }).click();
  await expect(voskar).toHaveCount(0);

  // The legend explains the three marks.
  const legend = page.getByRole('list', { name: 'Map legend' });
  await expect(legend).toContainText('Peaceful neighbour');
  await expect(legend).toContainText('Watchful neighbour: its border dashed');
  await expect(legend).toContainText('Hostile neighbour: its border solid and toothed');
});

test('a tier passed turns a neighbour watchful: reported, drawn, explained, and forecast with the Defence slider', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraPoisedBelowDeveloping(), tips: true });
  await prosper(page);
  await expect(tipCard(page)).toHaveCount(0);
  await endQuarters(page, 1);

  // The country is worth taking now, and Voskar has noticed. The report says so and why.
  const entry = reports(page).getByRole('listitem').filter({ hasText: 'Voskar has turned' });
  await expect(entry).toContainText('Voskar has turned watchful');
  await expect(entry).toContainText(
    'The country has reached Developing, a state more worth taking: Voskar’s ambition now weighs 33.0% against deterrence, up from 0.0%. Deterrence is 39.0%, below the 41.3% under which Voskar is watchful. Defence spending is $2.0m a quarter, against the $2.1m the army expects, which settles deterrence at 39.0%.',
  );
  await expect(entry.getByRole('img', { name: 'Neighbour report' })).toBeVisible();
  await expect(entry).toContainText('Warning');
  // A first-time tip explains neighbours and deterrence, now that one is watchful. The tip
  // for the tier just passed comes first.
  await expect(tipCard(page).getByRole('heading', { name: 'A new tier' })).toBeVisible();
  await tipCard(page).getByRole('button', { name: 'Got it' }).click();
  await expect(
    tipCard(page).getByRole('heading', { name: 'Neighbours and deterrence' }),
  ).toBeVisible();
  await tipCard(page).getByRole('button', { name: 'Got it' }).click();

  // The map draws it: the word and mark on Voskar, and Selama still peaceful.
  await expect(neighbour(page, 'Voskar')).toHaveAccessibleName('Voskar, neighbour: watchful');
  await expect(neighbour(page, 'Voskar')).toContainText('Watchful');
  await expect(neighbour(page, 'Selama')).toHaveAccessibleName('Selama, neighbour: peaceful');

  // The report picks the neighbour out on the map, which opens its card.
  await entry.getByRole('button').click();
  const voskar = card(page, 'Voskar');
  await expect(voskar).toContainText('Neighbour · Watchful');
  await expect(voskar).toContainText('Watchful below41.3%');
  await expect(voskar).toContainText('Hostile below33.0%');
  await expect(voskar.getByRole('status', { name: 'What it would take' })).toHaveText(
    '▲ Deterrence is 39.0%. Voskar is peaceful again from 41.3%, and turns hostile below 33.0%.',
  );
  await expect(voskar.getByRole('status', { name: 'What moved it' })).toContainText(
    'Last quarter Voskar has turned watchful. The country has reached Developing',
  );

  // The Defence slider's forecast: cut to nothing, deterrence falls and Voskar is heading for
  // hostile; the outlook warns, and the fold has the figures.
  await defence(page).fill('0');
  await expect(outlook(page)).toContainText(
    '▲ Voskar is heading for hostile: Defence would settle deterrence too low.',
  );
  await outlook(page).getByText('Neighbours').click();
  await expect(projected(page, 'Deterrence next quarter')).toHaveText(
    'Deterrence next quarter39.0% → 33.1%',
  );
  await expect(projected(page, 'Deterrence is heading for')).toHaveText(
    'Deterrence is heading for39.0% → 0.0%',
  );
  await expect(projected(page, 'Voskar next quarter')).toHaveText('Voskar next quarterwatchful');
  await expect(projected(page, 'Voskar is heading for')).toHaveText(
    'Voskar is heading forwatchful → hostile',
  );
  await expect(projected(page, 'Selama is heading for')).toHaveText(
    'Selama is heading forpeaceful → hostile',
  );
  // Raised instead, deterrence is heading higher and Voskar for peace.
  await defence(page).fill('4');
  await expect(projected(page, 'Deterrence is heading for')).toHaveText(
    'Deterrence is heading for39.0% → 56.1%',
  );
  await expect(projected(page, 'Voskar is heading for')).toHaveText(
    'Voskar is heading forwatchful → peaceful',
  );
  await expect(outlook(page)).not.toContainText('heading for hostile');

  // Cut and committed, the risks ahead warn before Voskar turns, and the next quarter stands
  // where the forecast said.
  await defence(page).fill('0');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
  const risk = risks(page).getByRole('listitem').filter({ hasText: 'Voskar turning hostile' });
  await expect(risk).toContainText('Almost certain');
  await expect(risk).toHaveAttribute(
    'title',
    'Deterrence, now 39.0%, is on course to fall below the 33.0% under which Voskar is hostile next quarter. Defence is $0.0m a quarter, which settles deterrence at 0.0%.',
  );
  await endQuarters(page, 1);
  await expect(voskar).toContainText('Deterrence33.1%');
  await expect(voskar).toContainText('Neighbour · Watchful');
  await expect(voskar.getByRole('status', { name: 'What moved it' })).toHaveText(
    'Last quarter Deterrence moved −5.9 points, to 33.1%, and Voskar stayed watchful.',
  );
  await expect(voskar.getByRole('status', { name: 'Where it is heading' })).toContainText(
    '▲ Defence at $0.0m a quarter',
  );

  // Another quarter and it turns hostile, as warned: reported as serious, and drawn.
  await endQuarters(page, 1);
  const turned = reports(page).getByRole('listitem').filter({ hasText: 'Voskar has turned' });
  await expect(turned).toContainText('Voskar has turned hostile');
  await expect(turned).toContainText('Deterrence has fallen to 28.1%');
  await expect(turned).toContainText('Serious');
  await expect(neighbour(page, 'Voskar')).toHaveAccessibleName('Voskar, neighbour: hostile');
  await expect(neighbour(page, 'Voskar')).toContainText('Hostile');
  await expect(voskar).toContainText('Neighbour · Hostile');
  await expect(neighbour(page, 'Selama')).toHaveAccessibleName('Selama, neighbour: watchful');
});
