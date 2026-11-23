/** `balance.power`: what power gives a region a power line links to a station. */
export const powerBalance = {
  /**
   * What power gives a region while a power line in use links it to a power station in use:
   * `outputPermille` thousandths more output, before anything a chain adds, and
   * `infrastructurePermille` thousandths of infrastructure access. While the station or a
   * line of the link decays, the region has only `upkeep.decayingEffectPermille` of each.
   */
  power: {
    outputPermille: 200,
    infrastructurePermille: 150,
  },
} as const;
