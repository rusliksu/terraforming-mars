export type TeamActionCosts = {
  givePatent: number;
  facilitySharing: number;
  donation: number;
}

export type ConglomeratesPlayerData = {
  coordination: number;
  /** Each Team Action's current Coordination cost, tracked per-player: it climbs by 1 for
   * whichever teammate actually uses it (not their teammate too), resetting to base each
   * generation. */
  teamActionCosts: TeamActionCosts;
}
