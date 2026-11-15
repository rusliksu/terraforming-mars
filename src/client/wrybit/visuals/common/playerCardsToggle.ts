import {vueRoot} from '@/client/components/vueRoot';
import {playerTableauVisibilityKey} from '@/client/components/overview/playerVisibilityKeys';

/** The subset of the root component's visibility API this helper needs. */
type VisibilityRoot = {
  getVisibilityState(key: string): boolean;
  setVisibilityState(key: string, value: boolean): void;
};

/** Wrybit opens each player's played-card panel using our existing visibility owner. */
export function togglePlayerCards(root: ReturnType<typeof vueRoot>, index: number, playerCount: number): void {
  const visibility = root as unknown as VisibilityRoot;
  const visible = !visibility.getVisibilityState(playerTableauVisibilityKey(index));
  for (let current = 0; current < playerCount; current++) {
    visibility.setVisibilityState(playerTableauVisibilityKey(current), current === index && visible);
  }
}
