import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, openTab, planProject, reports, startGame, treasury } from './app';

const research = (page: Page) => openTab(page, 'Research');
const seed = async (page: Page) =>
  (await research(page)).getByRole('group', { name: 'Drought-resistant seed' });
const researchTab = (page: Page) => decisions(page).getByRole('tab', { name: 'Research' });

test('research is started from the tree, finishes, and the technology is known', async ({
  page,
}) => {
  await startGame(page);

  // An idle research slot says so on its tab, counting the seed and the two technologies that
  // need nothing first, and the tree shows the seed available.
  await expect(researchTab(page)).toHaveAccessibleDescription('Idle · 3 available');
  await expect(await seed(page)).toContainText('Available');
  await expect(await seed(page)).toContainText('$8.0m · 4 quarters');
  await expect(await seed(page)).toContainText(
    'Weather and drought move every region’s harvest 30% less.',
  );
  await expect(await seed(page)).toContainText('NeedsNothing');

  // Planned, it can be taken back until the quarter ends.
  await (await seed(page)).getByRole('button', { name: 'Research Drought-resistant seed' }).click();
  await expect(await seed(page)).toContainText('Planned');
  await expect(await seed(page)).toContainText(
    'Research starts when this quarter ends, at $2.0m a quarter.',
  );
  await expect(researchTab(page)).toHaveAccessibleDescription('1 planned');
  await (
    await seed(page)
  )
    .getByRole('button', { name: 'Cancel research into Drought-resistant seed' })
    .click();
  await expect(await seed(page)).toContainText('Available');
  await expect(researchTab(page)).toHaveAccessibleDescription('Idle · 3 available');

  await (await seed(page)).getByRole('button', { name: 'Research Drought-resistant seed' }).click();
  await endQuarters(page, 1);

  await expect(reports(page).getByText('Research begins: Drought-resistant seed')).toBeVisible();
  await expect(researchTab(page)).toHaveAccessibleDescription('Researching 1/4');
  const bar = (await seed(page)).getByRole('progressbar');
  await expect(bar).toHaveAttribute('aria-valuenow', '1');
  await expect(bar).toHaveAttribute('aria-valuemax', '4');
  await expect(await seed(page)).toContainText('Being researched · 1 of 4');
  await treasury(page)
    .getByRole('button', { name: /Treasury/ })
    .click();
  await expect(
    page
      .getByRole('region', { name: 'What moved the treasury' })
      .getByRole('row', { name: 'Researching Drought-resistant seed' }),
  ).toContainText('−$2.0m');

  await endQuarters(page, 3);

  await expect(reports(page).getByText('Research finished: Drought-resistant seed')).toBeVisible();
  await expect(await seed(page)).toContainText('Known');
  await expect(await seed(page)).toContainText('Known since Year 2, Quarter 1.');
  await expect((await seed(page)).getByRole('button')).toHaveCount(0);
  // The seed known, the two that build on it can be researched next, as the two that need
  // nothing still can.
  await expect(researchTab(page)).toHaveAccessibleDescription('Idle · 4 available');
});

test('the tree says why research cannot be started', async ({ page }) => {
  await startGame(page);
  // Sites planned first leave the treasury unable to cover the research beside them.
  await planProject(page, 'Lowmere irrigation');
  await planProject(page, 'Dustwell irrigation');
  await planProject(page, 'Lowmere grain store');
  await planProject(page, 'Southbank grain store');

  const why = (await seed(page)).getByRole('note', {
    name: 'Why Drought-resistant seed cannot be started',
  });
  await expect(why).toContainText(
    'The treasury holds $42.0m, which does not cover the $44.0m needed to start 5 projects.',
  );
  await expect((await seed(page)).getByRole('button')).toHaveCount(0);
});
