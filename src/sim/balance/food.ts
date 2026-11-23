/**
 * `balance.food`, `balance.relief`, `balance.population` and `balance.hunger`: what people
 * eat, what the land grows and the reserve keeps, what food relief moves, how the people grow
 * in number, and when hunger becomes famine.
 */
export const foodBalance = {
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
      bonusPermillePerThousandMoney: 600,
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
  relief: {
    /** Tonnes of food that one Money unit ($100,000) of food relief spending can move. */
    tonnesPerMoney: 200,
  },
  population: {
    /**
     * How fast each region's people grow in number, in ten-thousandths a quarter, unless its
     * country file sets its own rate. 30 is about 1.2% a year. A region in famine does not grow.
     */
    growthPerTenThousandPerQuarter: 30,
    /** The fastest yearly growth, in percent, that a country file may give a region. */
    maxGrowthPercentPerYear: 10,
  },
  hunger: {
    /** A region is fed when its people eat at least this share of their needs, in thousandths. */
    fedSharePermille: 950,
    /** A shortage deepens into famine only when people eat less than this share. */
    famineSharePermille: 800,
    /** The share of a region's people who die in each quarter of famine, in thousandths. */
    famineDeathsPermillePerQuarter: 30,
    /** The state collapses when one region has been in famine this many quarters running. */
    collapseAfterFamineQuarters: 2,
  },
} as const;
