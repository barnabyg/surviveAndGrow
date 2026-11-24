import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, reports, risks, startGame, tavaraWithDroughtIn } from './app';

const armyLoyalty = (page: Page) =>
  page.getByRole('banner').getByRole('group', { name: 'Army loyalty' });
const coupRisk = (page: Page) => risks(page).getByRole('listitem').filter({ hasText: 'Coup' });
const gameFigures = (page: Page) => page.getByRole('table', { name: 'The game in figures' });

/** Sets Defence on its slider, in millions, and commits the budget. */
async function setDefence(page: Page, millions: number): Promise<void> {
  await decisions(page).getByRole('slider', { name: 'Defence' }).fill(String(millions));
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
}

test('a starved army plots, the coup is warned of and counted down, and it ends the game', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  await expect(armyLoyalty(page)).toHaveAttribute(
    'title',
    'Loyal · Restless below 45% · plotting below 30% · a coup after 4 quarters of plotting',
  );
  await setDefence(page, 0);

  // Four quarters on the army is restless and no coup is within the look-ahead.
  await endQuarters(page, 4);
  await expect(armyLoyalty(page)).toContainText('▲ Restless: below 45%');
  await expect(coupRisk(page)).toHaveCount(0);

  // A quarter later one is: the risks ahead list it before the army has begun to plot, with
  // its likelihood in words and why.
  await endQuarters(page, 1);
  await expect(armyLoyalty(page)).toContainText('32.4%');
  await expect(armyLoyalty(page)).toContainText('▲ Restless: below 45%');
  await expect(coupRisk(page)).toHaveCount(1);
  await expect(coupRisk(page)).toContainText('Almost certain');
  await expect(coupRisk(page)).toContainText(
    'National army loyalty, now 32.4%, is on course to fall below the 30% where the army plots this quarter; 4 quarters of that running bring a coup. As things stand the army takes power in 3 quarters. Defence is $0.0m a quarter, and the army expects $2.1m.',
  );

  // The army begins to plot. The top bar counts the quarters left, in words and with a sign,
  // and the report says how long is left, with its own icon.
  await endQuarters(page, 1);
  await expect(armyLoyalty(page)).toContainText('29.9%');
  await expect(armyLoyalty(page)).toContainText('▲ Plotting: 3 quarters to a coup');
  await expect(reports(page).getByText('The army is plotting')).toBeVisible();
  const counting = reports(page)
    .getByRole('listitem')
    .filter({ hasText: 'The army plots: 3 quarters to a coup' });
  await expect(counting).toContainText(
    'National army loyalty has ended 1 quarter running below 30%, where the army plots, and stands at 29.9%. 3 more quarters of it and the army takes power. Loyalty back at 30% or above ends the count.',
  );
  await expect(counting.getByRole('img', { name: 'Coup report' })).toBeVisible();
  await expect(counting).toContainText('Serious');
  await expect(coupRisk(page)).toContainText(
    'National army loyalty is 29.9%, below the 30% where the army plots, and has ended 1 quarter running there; 4 quarters of it running bring a coup. As things stand the army takes power in 2 quarters.',
  );

  // Each quarter after, the count is a quarter shorter, in the top bar and in the report.
  await endQuarters(page, 1);
  await expect(armyLoyalty(page)).toContainText('▲ Plotting: 2 quarters to a coup');
  await expect(reports(page).getByText('The army plots: 2 quarters to a coup')).toBeVisible();
  await endQuarters(page, 1);
  await expect(armyLoyalty(page)).toContainText('▲ Plotting: 1 quarter to a coup');
  await expect(reports(page).getByText('The army plots: 1 quarter to a coup')).toBeVisible();
  await expect(coupRisk(page)).toContainText('the army takes power this quarter');

  // The figure opens to say where the count stands.
  await armyLoyalty(page)
    .getByRole('button', { name: /Army loyalty/ })
    .click();
  await expect(
    armyLoyalty(page).getByRole('region', { name: 'What moved army loyalty' }),
  ).toContainText(
    'The army takes power once national loyalty has ended 4 quarters running below 30%. It has ended 3 quarters there: the coup comes as this quarter ends, unless loyalty is back at 30% or above by then.',
  );
  await armyLoyalty(page)
    .getByRole('button', { name: /Army loyalty/ })
    .click();

  // The fourth quarter of plotting ends, and the army takes power.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await endQuarters(page, 1);
  const summary = page.getByRole('dialog', { name: 'The army has taken power' });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('You have lost');
  await expect(summary).toContainText(
    /National army loyalty stood below 30%, where the army plots, for 4 quarters running, and ended at \d\d\.\d%\. The army has taken power\./,
  );
  await expect(summary).toContainText(
    'Your government was in office for 9 quarters, over one term. The count was in the top bar, the quarterly reports and the risks ahead: Defence spending restored in time would have brought the army back from plotting.',
  );
  await expect(
    summary.getByRole('table', { name: 'Term by term' }).getByRole('row', { name: /^Term 1/ }),
  ).toContainText('▲ The army took power');
  // Army loyalty over the whole game is beside the other figures.
  const loyalty = gameFigures(page).getByRole('row', { name: 'Army loyalty' });
  await expect(loyalty.getByRole('cell', { name: '58.4%', exact: true })).toHaveCount(2);
  await expect(
    loyalty.getByRole('img', { name: /^Army loyalty over the last 9 quarters: fell from 58\.4%/ }),
  ).toBeVisible();
  await expect(reports(page).getByRole('listitem').first()).toContainText(
    'The army has taken power',
  );
  await expect(
    page.getByRole('banner').getByRole('button', { name: 'End quarter' }),
  ).toBeDisabled();

  // From the summary the same game can be replayed, or a new one started.
  await expect(summary.getByRole('button', { name: 'Start a new game' })).toBeVisible();
  await summary.getByRole('button', { name: 'Replay this game' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('banner').getByText('Year 1 · Quarter 1')).toBeVisible();
  await expect(armyLoyalty(page)).toContainText('58.4%');
  await expect(armyLoyalty(page)).toContainText('Loyal');
});

test('Defence restored while the army plots ends the count, and the report says so', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  await setDefence(page, 0);
  await endQuarters(page, 7);
  await expect(armyLoyalty(page)).toContainText('▲ Plotting: 2 quarters to a coup');
  await expect(coupRisk(page)).toHaveCount(1);

  // With Defence back, the look-ahead no longer finds a coup, before the quarter is ended.
  await setDefence(page, 2);
  await expect(coupRisk(page)).toHaveCount(0);

  await endQuarters(page, 1);
  await expect(armyLoyalty(page)).toContainText('▲ Restless: below 45%');
  await expect(armyLoyalty(page)).not.toContainText('to a coup');
  const off = reports(page).getByRole('listitem').filter({ hasText: 'The coup is off' });
  await expect(off).toContainText('after 2 quarters of plotting');
  await expect(off.getByRole('img', { name: 'Coup report' })).toBeVisible();
  await expect(reports(page).getByText('The army is restless again')).toBeVisible();
});
