import type { CreditRating, SpendingArea } from '../vocabulary';

/** The balance values of one step of the credit rating. */
export interface CreditStepBalance {
  /** The score, in points, the step begins at. */
  readonly fromScore: number;
  /** What it adds to the rate of a loan on the menu, in hundredths of a percent a year. */
  readonly loanRateBasisPoints: number;
  /**
   * What it adds to the rate of a bond on the menu, in hundredths of a percent a year, where
   * bonds may be issued at all (`finance.bonds.leastRating`).
   */
  readonly bondRateBasisPoints: number;
  /** The most the nation may owe, in thousandths of a year's revenue. */
  readonly debtLimitPermille: number;
}

/**
 * `balance.finance`: loans, bonds, the debt a country may start with, the bailout, austerity
 * and the credit rating.
 */
export const financeBalance = {
  /**
   * Borrowing. Money is in Money units ($100,000) and rates in hundredths of a percent a
   * year: 600 is 6% a year. A loan is repaid in equal quarterly repayments of interest and
   * principal over its term, starting the quarter after its money arrives. Interest each
   * quarter is a quarter of the yearly rate on what is still owed.
   */
  finance: {
    loans: {
      /** The sums a loan may be taken out for. */
      amounts: [100, 250, 500],
      /**
       * The terms a loan may be taken over, each with the rate it is lent at to a nation
       * rated A. The credit rating moves it (`credit.ratings`).
       */
      terms: [
        { quarters: 4, annualRateBasisPoints: 600 },
        { quarters: 8, annualRateBasisPoints: 800 },
        { quarters: 12, annualRateBasisPoints: 1000 },
      ],
    },
    /**
     * Bonds: only interest is paid each quarter, and the whole sum falls due in one payment
     * at maturity. They raise more than a loan, at a lower rate, but only a nation rated well
     * enough may issue them.
     */
    bonds: {
      /**
       * The worst credit rating at which bonds may be issued: the best there is, so a nation
       * that opens at A must earn it by repaying debt on time (25 points a quarter, about nine
       * quarters with a small loan and no deficit).
       */
      leastRating: 'aa' as CreditRating,
      /** The sums a bond may be issued for. */
      amounts: [200, 500, 1000, 2000],
      /**
       * The terms a bond may run for, each with its base rate, the one a nation rated A would
       * get. The credit rating moves it (`credit.ratings`): at AA, where bonds are issued, it
       * is half a point lower, and still below every loan's rate there.
       */
      terms: [
        { quarters: 8, annualRateBasisPoints: 400 },
        { quarters: 12, annualRateBasisPoints: 450 },
        { quarters: 16, annualRateBasisPoints: 500 },
      ],
    },
    /**
     * Debt a country file may start the game with (format 4): loans already owed, each with
     * its own rate and the quarters left to repay it, repaid level from the first quarter.
     * The limits keep a country from opening on debt it cannot carry.
     */
    startingDebt: {
      /** The most loans a country may start with. */
      mostLoans: 5,
      /** The highest yearly rate a starting loan may carry, in percent. */
      mostRatePercent: 25,
      /** The most quarters a starting loan may have left to run. */
      mostQuarters: 40,
      /**
       * The most that may be owed at the start, in thousandths of a year's output from all
       * the regions: half of it. A country's first repayments must also be payable from its
       * starting treasury and the first quarter's tax on that output. The check counts tax
       * before unrest, so a country that opens in unrest may still miss its first payment.
       */
      mostOwedPermille: 500,
    },
    /**
     * A bailout: what a missed payment on any debt brings. Lenders consolidate everything
     * owed into one bailout loan on their terms, repaid level from the quarter after, and
     * austerity follows (`austerity` below).
     */
    bailout: {
      /** The rate the bailout loan is lent at, in hundredths of a percent a year. */
      annualRateBasisPoints: 700,
      /** The quarters the bailout loan is repaid over, from the quarter after the bailout. */
      termQuarters: 16,
      /**
       * The push a bailout gives approval in every region as it lands, in thousandths. It
       * fades like any passing event. A missed payment during austerity gives none. It is
       * heavy enough that a government bailed out in the run-up to a vote is likely to lose it.
       */
      approvalPermille: -120,
    },
    /**
     * Austerity: the bailout's terms, in force for a fixed number of quarters after it. The
     * tax rate may not go below a floor, spending on some areas may not go above a cap, and
     * nothing may be borrowed nor any project started. Projects already under way carry on.
     */
    austerity: {
      /** The quarters austerity lasts, counting from the quarter after the bailout. */
      quarters: 8,
      /** What a missed payment during austerity adds to the quarters it has left. */
      extendQuarters: 4,
      /** The lowest tax rate allowed, as a whole percentage. */
      taxFloorPercent: 25,
      /**
       * The capped areas, each capped at this share, in thousandths, of what the country's
       * starting budget spends on it, brought down onto a step of the slider but never below
       * one step unless the starting budget spends nothing there. Areas left out are not
       * capped: food relief and upkeep, so that austerity starves no one and lets nothing
       * decay that the player keeps up.
       */
      spendingCapPermille: {
        agriculture: 1000,
        health: 800,
        education: 800,
        security: 800,
        defence: 800,
      } satisfies Partial<Record<SpendingArea, number>> as Partial<Record<SpendingArea, number>>,
    },
    /**
     * The credit rating, reassessed as each quarter ends. Its score is the payment record
     * less a share of the debt burden and a share of the quarter's deficit, in points: the
     * rating is the best step whose score it reaches (see `credit.ts`).
     */
    credit: {
      /** The payment record a nation starts with, in points. */
      startingRecord: 700,
      /** The best payment record there is. */
      bestRecord: 1000,
      /**
       * The payment record a quarter with a missed payment leaves: nothing. With nothing to
       * its record the score can reach no step but the lowest, which a bailout brings.
       */
      missedPaymentRecord: 0,
      /** What a quarter whose repayments were all made on time adds to the payment record. */
      onTimePoints: 25,
      /**
       * The points taken off the score for each thousandth of debt burden, in thousandths:
       * owing a whole year's revenue costs 400 points.
       */
      burdenWeightPermille: 400,
      /**
       * The points taken off for each thousandth of the quarter's revenue spent beyond it, in
       * thousandths. Repaying principal is not counted as a deficit; interest is.
       */
      deficitWeightPermille: 300,
      /** A deficit is counted up to this many thousandths of the quarter's revenue. */
      deficitCapPermille: 1000,
      /**
       * Each step of the rating: the score it begins at, what it does to the rate a loan or a
       * bond is offered at, in hundredths of a percent a year, and the most the nation may owe,
       * counting what it means to borrow this quarter, in thousandths of a year's revenue at
       * the budget in force. The worst step begins at 0, where the score stops.
       */
      ratings: {
        aa: {
          fromScore: 850,
          loanRateBasisPoints: -100,
          bondRateBasisPoints: -50,
          debtLimitPermille: 1250,
        },
        a: {
          fromScore: 550,
          loanRateBasisPoints: 0,
          bondRateBasisPoints: 0,
          debtLimitPermille: 1000,
        },
        bbb: {
          fromScore: 400,
          loanRateBasisPoints: 150,
          bondRateBasisPoints: 100,
          debtLimitPermille: 750,
        },
        bb: {
          fromScore: 200,
          loanRateBasisPoints: 300,
          bondRateBasisPoints: 200,
          debtLimitPermille: 500,
        },
        b: {
          fromScore: 0,
          loanRateBasisPoints: 500,
          bondRateBasisPoints: 350,
          debtLimitPermille: 250,
        },
      } satisfies Record<CreditRating, CreditStepBalance>,
    },
  },
} as const;
