import type { DilemmaDefinition } from '../dilemmas';
import type { DilemmaType } from '../vocabulary';

/**
 * `balance.dilemmaRules` and `balance.dilemmas`: when a dilemma may arise, and each dilemma
 * with its story, its conditions and what each option does.
 */
export const dilemmasBalance = {
  dilemmaRules: {
    /** No dilemma arises before this quarter of the game, counting the first as 1. */
    earliestQuarter: 2,
    /** None arises in this many of the term's last quarters, the election quarter among them. */
    quartersClearBeforeElection: 1,
  },
  /**
   * The dilemmas. Money is in Money units ($100,000) for each million people, and food is a
   * share, in thousandths, of what the people concerned eat in a quarter, so the same data
   * serves a country of any size. Approval is in thousandths: it lands at once and fades.
   */
  dilemmas: {
    grainOffer: {
      name: 'Grain from a neighbour',
      title: 'A neighbour offers grain',
      story:
        'The national reserve is below its safe level, and a neighbouring government has noticed. It offers a shipment of grain at the world price, to be paid for at once.',
      conditions: { reserve: 'belowSafe', restQuarters: 4 },
      options: [
        {
          id: 'buy',
          label: 'Buy the whole shipment',
          effects: [
            { kind: 'atWorldPrice', good: 'grain', needPermille: 200, pricePermille: 1000 },
            { kind: 'reserve', needPermille: 200 },
          ],
        },
        {
          id: 'half',
          label: 'Buy half of it',
          effects: [
            { kind: 'atWorldPrice', good: 'grain', needPermille: 100, pricePermille: 1000 },
            { kind: 'reserve', needPermille: 100 },
          ],
        },
        { id: 'decline', label: 'Decline the offer', effects: [] },
      ],
    },
    merchantOffer: {
      name: 'Grain sold to merchants',
      title: 'Merchants offer to buy grain',
      story:
        'The harvest is in and the national reserve is above its safe level. Grain merchants offer to buy a part of it at the world price, and to fetch it themselves. The money is good, and the grain will be gone before the next harvest is known.',
      // It comes with the new year, when the harvest has just reached the reserve.
      conditions: { inQuarters: [1], reserve: 'aboveSafe', restQuarters: 4 },
      options: [
        {
          id: 'sell',
          label: 'Sell them a large part',
          effects: [
            { kind: 'reserve', needPermille: -300 },
            { kind: 'atWorldPrice', good: 'grain', needPermille: -300, pricePermille: 1000 },
          ],
        },
        {
          id: 'some',
          label: 'Sell them a little',
          effects: [
            { kind: 'reserve', needPermille: -150 },
            { kind: 'atWorldPrice', good: 'grain', needPermille: -150, pricePermille: 1000 },
          ],
        },
        { id: 'keep', label: 'Keep the grain', effects: [] },
      ],
    },
    emergencyWorks: {
      name: 'Emergency works',
      title: '{region} asks for emergency works',
      story:
        'Drought or flood has left {region} without work in its fields. Its council asks for public works to carry families through to the harvest, or failing that for grain from the national reserve.',
      conditions: { place: 'struckByEvent', restQuarters: 3 },
      options: [
        {
          id: 'works',
          label: 'Pay for the works',
          effects: [
            { kind: 'treasury', perMillionPeople: -6 },
            { kind: 'approval', permille: 60, where: 'region' },
          ],
        },
        {
          id: 'grain',
          label: 'Send grain instead',
          effects: [
            { kind: 'regionGrain', needPermille: 500 },
            { kind: 'approval', permille: 20, where: 'region' },
          ],
        },
        {
          id: 'refuse',
          label: 'Refuse both',
          effects: [{ kind: 'approval', permille: -50, where: 'region' }],
        },
      ],
    },
    strikeTalks: {
      name: 'Talks with the strikers',
      title: 'Strikers in {region} ask for talks',
      story:
        'The strike committee in {region} offers to send people back to work if their grievances are met. Giving way costs money and shows that striking pays. Holding out costs nothing today and hardens them.',
      conditions: { place: 'inUnrest', restQuarters: 4 },
      options: [
        {
          id: 'concede',
          label: 'Meet their demands',
          effects: [
            { kind: 'treasury', perMillionPeople: -8 },
            { kind: 'approval', permille: 80, where: 'region' },
          ],
        },
        {
          id: 'refuse',
          label: 'Hold out',
          effects: [{ kind: 'approval', permille: -30, where: 'region' }],
        },
      ],
    },
    teachersPay: {
      name: 'Teachers’ pay',
      title: 'Teachers demand a pay rise',
      story:
        'The teachers’ union says its members cannot live on their pay and threatens to close the schools. Parents everywhere are watching what you do.',
      conditions: { restQuarters: 8 },
      options: [
        {
          id: 'grant',
          label: 'Grant the rise',
          effects: [
            { kind: 'treasury', perMillionPeople: -8 },
            { kind: 'approval', permille: 20, where: 'nation' },
          ],
        },
        {
          id: 'refuse',
          label: 'Refuse it',
          effects: [{ kind: 'approval', permille: -30, where: 'nation' }],
        },
      ],
    },
    donorGrant: {
      name: 'Donor grant',
      title: 'A donor offers a grant with conditions',
      story:
        'The treasury is low, and a foreign donor offers to fill it. In return it wants an end to subsidies that many households rely on, and people will know why prices rose.',
      conditions: { treasuryBelowPerMillionPeople: 60, restQuarters: 8 },
      options: [
        {
          id: 'accept',
          label: 'Accept the grant',
          effects: [
            { kind: 'treasury', perMillionPeople: 30 },
            { kind: 'approval', permille: -40, where: 'nation' },
          ],
        },
        { id: 'decline', label: 'Decline it', effects: [] },
      ],
    },
  } satisfies Record<DilemmaType, DilemmaDefinition>,
} as const;
