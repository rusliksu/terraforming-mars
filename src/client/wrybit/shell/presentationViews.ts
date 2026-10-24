import type {Component} from 'vue';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {SpectatorModel} from '@/common/models/SpectatorModel';
import type {InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import type {CreateControls, CreatePresentation} from '@/client/wrybit/create/presentation';

/** Optional presentation components; routing and actions stay in App. */
export type WrybitViews = {
  cards?: Component;
  startScreen?: Component;
  loadGame?: Component;
  gamesOverview?: Component;
  adminHome?: Component;
  loginHome?: Component;
  help?: Component;
  gameEnd?: Component;
  playerHome?: Component<{playerView: PlayerViewModel}>;
  spectatorHome?: Component<{spectator: SpectatorModel}>;
  inputs?: InputPresentationRegistry;
  create?: CreatePresentation;
  createControls?: CreateControls;
};
