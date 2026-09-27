export type DeltaProjectPlayerModel = {
  position: number;
  jovianBonus: boolean;
  /** Set by Little Dutch Boy: this marker can't advance or retreat for the rest of the
   * generation it was blocked in. Cleared automatically at the start of the next generation. */
  blocked?: boolean;
}
