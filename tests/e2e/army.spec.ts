import { expect, test, type Page } from '@playwright/test';
import {
  decisions,
  endQuarters,
  outlook,
  reports,
  situation,
  startGame,
  tavaraWithDroughtIn,
} from './app';

const armyLoyalty = (page: Page) =>
  page.getByRole('banner').getByRole('group', { name: 'Army loyalty' });
const defence = (page: Page) => decisions(page).getByRole('slider', { name: 'Defence' });
const nextQuarter = (page: Page) =>
  outlook(page).getByRole('group', { name: 'Army loyalty next quarter' });
const heading = (page: Page) =>
  outlook(page).getByRole('group', { name: 'Army loyalty is heading for' });
const regions = (page: Page) => situation(page).getByRole('region', { name: 'Regions' });
const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
const tipCard = (page: Page) => page.locator('.lessons__card', { hasText: 'First-time tip' });

/** Sets Defence on its slider, in millions, and commits the budget. */
async function setDefence(page: Page, millions: number): Promise<void> {
  await defence(page).fill(String(millions));
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
}

test('the game opens with a loyal army, named in the top bar, the region list and a region’s card', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });

  // Tavara starts by spending $2.0m a quarter on Defence, which holds its army loyal.
  await expect(defence(page)).toHaveValue('2');
  await expect(armyLoyalty(page)).toContainText('58.4%');
  await expect(armyLoyalty(page)).toContainText('Loyal');
  await expect(armyLoyalty(page)).toHaveAttribute(
    'title',
    'Loyal · Restless below 45% · plotting below 30% · a coup after 4 quarters of plotting',
  );
  await expect(nextQuarter(page)).toHaveText('Army loyalty next quarter58.4%, loyal');
  await expect(heading(page)).toHaveText('Army loyalty is heading for58.4%, loyal');

  // Every region's army is listed with its stage in words, and is on its card.
  for (const name of ['Korr Highlands', 'Salt Coast', 'Arden Vale']) {
    await expect(
      regions(page).getByRole('button', { name }).getByLabel('Army loyal, loyalty 58.4%'),
    ).toHaveText('Loyal 58%');
  }
  await map(page)
    .getByRole('button', { name: /^Salt Coast/ })
    .click();
  const card = page.getByRole('region', { name: 'Salt Coast', exact: true });
  await expect(card).toContainText('Army loyalty58.4% · Loyal');
  // Loyal and staying so, the card has no more to say of it.
  await expect(card.getByRole('status', { name: 'Army' })).toHaveCount(0);
});

test('cutting Defence is forecast, turns the army restless as forecast, and is reported and named', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]), tips: true });

  // The preview says what the cut would do next quarter, and where loyalty is heading.
  await defence(page).fill('0');
  await expect(nextQuarter(page)).toHaveText(
    'Army loyalty next quarter58.4%, loyal → 50.7%, loyal',
  );
  await expect(heading(page)).toHaveText(
    'Army loyalty is heading for58.4%, loyal → 20.0%, plotting',
  );
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
  await expect(tipCard(page)).toHaveCount(0);

  // A quarter on, loyalty stands where the preview said, the army is still loyal, and a
  // first-time tip explains Defence and the army now that it is slipping.
  await endQuarters(page, 1);
  await expect(armyLoyalty(page)).toContainText('50.7%');
  await expect(armyLoyalty(page)).toContainText('Loyal');
  await expect(armyLoyalty(page)).toContainText('▼ 7.7 points this quarter');
  await expect(reports(page).getByText(/The army is/)).toHaveCount(0);
  await expect(tipCard(page).getByRole('heading', { name: 'Defence and the army' })).toBeVisible();
  await tipCard(page).getByRole('button', { name: 'Got it' }).click();
  await expect(nextQuarter(page)).toHaveText('Army loyalty next quarter44.5%, restless');

  // Another quarter, and the stage changes: the report says so and why, with its own icon,
  // and the top bar names the stage, by a sign and words and not by colour alone.
  await endQuarters(page, 1);
  const entry = reports(page).getByRole('listitem').filter({ hasText: 'The army is restless' });
  await expect(entry).toContainText(
    'National army loyalty has fallen to 44.5%, below the 45% at which the army grows restless. Defence spending is $0.0m a quarter, and the army expects $2.1m. The army in every region is restless with it.',
  );
  await expect(entry.getByRole('img', { name: 'Army report' })).toBeVisible();
  await expect(entry).toContainText('Warning');
  await expect(armyLoyalty(page)).toContainText('44.5%');
  await expect(armyLoyalty(page)).toContainText('▲ Restless: below 45%');
  await expect(
    armyLoyalty(page).getByRole('img', {
      name: 'Army loyalty over the last 2 quarters: fell from 58.4% to 44.5%, and is below the 45% restless mark.',
    }),
  ).toBeVisible();
  await expect(
    regions(page)
      .getByRole('button', { name: 'Salt Coast' })
      .getByLabel('Army restless, loyalty 44.5%'),
  ).toHaveText('▲ Restless 45%');

  // The figure opens to say what moved it, what it is made of and how each region stands.
  await armyLoyalty(page)
    .getByRole('button', { name: /Army loyalty/ })
    .click();
  const moved = armyLoyalty(page).getByRole('region', { name: 'What moved army loyalty' });
  await expect(moved.getByRole('row', { name: 'Defence spending' }).first()).toContainText(
    '−6.2 points',
  );
  await expect(moved.getByRole('row', { name: 'Change this quarter' })).toContainText(
    '−6.2 points',
  );
  const madeOf = moved.getByRole('table', { name: 'What army loyalty is made of' });
  await expect(madeOf.getByRole('row', { name: 'Baseline' })).toContainText('60.0%');
  await expect(madeOf.getByRole('row', { name: 'Defence spending' })).toContainText('−15.5 points');
  await expect(madeOf.getByRole('row', { name: 'Army loyalty now' })).toContainText(
    '44.5% · Restless',
  );
  await expect(
    moved
      .getByRole('table', { name: 'The army by region' })
      .getByRole('row', { name: 'Arden Vale' }),
  ).toContainText('44.5% · Restless');
  await armyLoyalty(page)
    .getByRole('button', { name: /Army loyalty/ })
    .click();

  // A region's card says how its army stands and where it is heading.
  await map(page)
    .getByRole('button', { name: /^Salt Coast/ })
    .click();
  const card = page.getByRole('region', { name: 'Salt Coast', exact: true });
  await expect(card).toContainText('Army loyalty44.5% · Restless');
  await expect(card.getByRole('status', { name: 'Army' })).toHaveText(
    '▲ The army here is restless, and heading for 20.0%, plotting, as Defence spending and the unrest here stand.',
  );
  await card.getByRole('button', { name: 'Close' }).click();

  // Defence restored, the preview says the army will be loyal again, and next quarter it is.
  await defence(page).fill('2');
  await expect(nextQuarter(page)).toHaveText(
    'Army loyalty next quarter39.6%, restless → 47.3%, loyal',
  );
  await expect(heading(page)).toHaveText(
    'Army loyalty is heading for20.0%, plotting → 58.4%, loyal',
  );
  await setDefence(page, 2);
  await endQuarters(page, 1);
  await expect(reports(page).getByText('The army is loyal again')).toBeVisible();
  await expect(armyLoyalty(page)).toContainText('47.3%');
  await expect(armyLoyalty(page)).toContainText('Loyal');
  await expect(armyLoyalty(page)).not.toContainText('▲ Restless');
});
