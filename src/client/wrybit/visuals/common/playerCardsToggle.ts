import {vueRoot} from '@/client/components/vueRoot';
import {playerTableauVisibilityKey} from '@/client/components/overview/playerVisibilityKeys';

/** Wrybit opens each player's played-card panel using our existing visibility owner. */
export function togglePlayerCards(root: ReturnType<typeof vueRoot>, index: number, playerCount: number): void {
  const visible = !root.getVisibilityState(playerTableauVisibilityKey(index));
  for (let current = 0; current < playerCount; current++) {
    root.setVisibilityState(playerTableauVisibilityKey(current), current === index && visible);
  }
}
