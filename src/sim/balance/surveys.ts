/** `balance.surveys`: what a survey costs and takes, and how large a deposit may be. */
export const surveysBalance = {
  /**
   * Surveys. A survey of a region is a project on no site, like research: it costs `cost`
   * Money units, paid over the `surveyQuarters` it takes, and is paid for, paused and barred
   * like any project. What it finds is the country file's: a hidden deposit, there or not by
   * its likelihood, of a size somewhere in its range. A deposit's size is a whole number of
   * `tonnesStep` tonnes of ore a quarter, from one step to `mostTonnes`.
   */
  surveys: {
    // Cheap beside the mine it may reveal, so that a gamble on one is worth taking, but dear
    // enough that surveying every region at once stretches an opening treasury.
    cost: 40,
    surveyQuarters: 2,
    tonnesStep: 10_000,
    mostTonnes: 1_500_000,
  },
} as const;
