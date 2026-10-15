import type {Component} from 'vue';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';

/** Optional presentation components; routing and actions stay in App. */
export type WrybitViews = {
  cards?: Component;
  playerHome?: Component<{playerView: PlayerViewModel}>;
  inputs?: InputPresentationRegistry;
};
