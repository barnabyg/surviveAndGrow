/**
 * Every value that tunes the game lives here as data. The rules in the rest of the
 * simulation read these values and hold none of their own.
 */
export const balance = {
  calendar: {
    /** The season of each quarter. */
    seasons: { 1: 'Dry season', 2: 'Planting season', 3: 'Growing season', 4: 'Harvest season' },
  },
  budget: {
    /** The tax rate, as a whole percentage of each region's output. */
    taxRatePercent: { min: 5, max: 40 },
    /** What may be spent on one area in a quarter, in Money units ($100,000). */
    spending: { min: 0, max: 200, step: 10 },
  },
  food: {
    /** What one person eats in a quarter, in kilograms. */
    consumptionKgPerPersonPerQuarter: 50,
    /** Tonnes grown on one unit (1,000 hectares) of farmland in an average year, by terrain. */
    harvestTonnesPerFarmland: {
      plains: 1200,
      highlands: 600,
      coast: 900,
      arid: 500,
      delta: 1300,
      valley: 1400,
    },
    /**
     * Each quarter the weather moves a region's coming harvest by up to this many
     * thousandths either way. Four quarters of it make the year's weather.
     */
    weatherSwingPermillePerQuarter: 40,
    agriculture: {
      /** The share of the full yield, in thousandths, grown with no agriculture spending. */
      basePermille: 850,
      /** Thousandths of yield added for each 1,000 Money units spent over the growing year. */
      bonusPermillePerThousandMoney: 375,
    },
    /** How many quarters of its own needs a region keeps back from its harvest. */
    regionKeepQuarters: 4,
    /** The share, in thousandths, of what a region sends to the reserve that never arrives. */
    transportLossPermille: 150,
    /** The share, in thousandths, of the national reserve that spoils each quarter. */
    reserveSpoilagePermillePerQuarter: 80,
    /** The reserve is safe when it holds at least this many months of what the country eats. */
    safeReserveMonths: 3,
  },
} as const;
