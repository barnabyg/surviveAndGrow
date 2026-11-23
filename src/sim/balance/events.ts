import type { EventDefinition } from '../events';
import type { EventType } from '../vocabulary';

/** `balance.events`: each event, when it begins and ends and what it does. */
export const eventsBalance = {
  events: {
    drought: {
      name: 'Drought',
      // It begins in the planting season, two quarters before the harvest it spoils.
      conditions: { beginsInQuarters: [2] },
      endsAfterHarvest: true,
      effects: {
        harvestPermille: 600,
        decaysSites: false,
        heldBy: ['harvestWeather', 'weatherAndDrought'],
      },
      announcement: {
        begins: 'The rains have failed.',
        ends: 'The harvest it spoiled is in, and the next growing year starts afresh.',
      },
    },
    flood: {
      name: 'Flood',
      // The rivers rise with the planting rains, two quarters before the harvest it spoils.
      // It begins in the same quarter as drought, so the two share the region's roll and never
      // strike one region in the same year.
      conditions: { beginsInQuarters: [2] },
      endsAfterHarvest: true,
      // It takes less of the harvest than a drought, but the water damages every site in use
      // in the region: each decays until its upkeep is paid again. Irrigation softens what it
      // does to the harvest as it softens the weather (`sites.irrigation.effects`), but
      // drought-resistant seed does not.
      effects: { harvestPermille: 700, decaysSites: true, heldBy: ['harvestWeather'] },
      announcement: {
        begins: 'The rivers have burst their banks.',
        ends: 'The harvest it spoiled is in, and the next growing year starts afresh.',
      },
    },
  } satisfies Record<EventType, EventDefinition>,
} as const;
