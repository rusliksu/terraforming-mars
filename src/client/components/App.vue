<template>
  <div :class="['topmost-'+screen, {'wrybit-ui': wrybitMode && wrybitReady}]">
    <section>
      <dialog id="alert-dialog" class="alert-dialog">
        <form method="dialog">
          <p id="alert-dialog-title" class="title" v-i18n>Error with input</p>
          <p id="alert-dialog-message"></p>
          <menu class="dialog-menu centered-content">
            <button id="alert-dialog-button" class="btn btn-lg btn-primary">OK</button>
          </menu>
        </form>
      </dialog>
    </section>
    <WrybitBoundary :enabled="wrybitMode" :screen="screen" @classic="useClassicInterface" @active="wrybitReady = $event" @views="wrybitViews = $event" />
    <div class="main-container">
      <StartScreen v-if="screen === 'start-screen'"/>
      <CreateGameForm
        v-else-if="screen === 'create-game-form'"
      />
      <LoadGameForm v-else-if="screen === 'load'"/>
      <GameHome
        v-else-if="screen === 'game-home' && game !== undefined"
        :game="game"
      />
      <PlayerHome
        v-else-if="screen === 'player-home' && playerView !== undefined"
        :player-view="playerView"
        :key="playerkey"
      />
      <SpectatorHome
        v-else-if="screen === 'spectator-home' && spectator !== undefined"
        :spectator="spectator"
        :key="'spectator-' + playerkey"
      />
      <GameEnd
        v-else-if="screen === 'the-end' && participant !== undefined"
        :participant="participant"
      />
      <ReplayHome v-else-if="screen === 'replay'"/>
      <GamesOverview
        v-else-if="screen === 'games-overview'"
      />
      <component v-else-if="screen === 'cards'" :is="wrybitMode && wrybitReady && wrybitViews.cards ? wrybitViews.cards : 'CardList'"/>
      <CardMaker v-else-if="screen === 'card-maker'"/>
      <CardLibrary v-else-if="screen === 'card-library'"/>
      <MapEditor v-else-if="screen === 'map-editor'"/>
      <MapLibrary v-else-if="screen === 'map-library'"/>
      <AdminHome v-else-if="screen === 'admin'"/>
      <LoginHome v-else-if="screen === 'login-home'"/>
      <Help v-else-if="screen === 'help'"/>
    </div>
    <InputPortal v-if="screen === 'player-home' && playerView !== undefined && playerView.game.phase !== 'end'"
      :target="inputHosts.target.value">
      <WaitingFor :key="inputRevision" :player-view="playerView" :waitingfor="playerView.waitingFor" />
    </InputPortal>
    <div class="notice" v-i18n>
      Not affiliated with FryxGames, Asmodee Digital or Steam in any way.
    </div>
  </div>
</template>

<script lang="ts">
import {defineAsyncComponent, defineComponent, provide} from 'vue';
import * as constants from '@/common/constants';

const AdminHome = defineAsyncComponent(() => import(/* webpackChunkName: "admin" */ '@/client/components/admin/AdminHome.vue'));
const CardList = defineAsyncComponent(() => import(/* webpackChunkName: "card-list" */ '@/client/components/cardlist/CardList.vue'));
const CreateGameForm = defineAsyncComponent(() => import(/* webpackChunkName: "create-game" */ '@/client/components/create/CreateGameForm.vue'));
const GameEnd = defineAsyncComponent(() => import(/* webpackChunkName: "game-end" */ '@/client/components/GameEnd.vue'));
const GameHome = defineAsyncComponent(() => import(/* webpackChunkName: "game-home" */ '@/client/components/GameHome.vue'));
const GamesOverview = defineAsyncComponent(() => import(/* webpackChunkName: "games-overview" */ '@/client/components/GamesOverview.vue'));
const Help = defineAsyncComponent(() => import(/* webpackChunkName: "help" */ '@/client/components/help/Help.vue'));
const LoginHome = defineAsyncComponent(() => import(/* webpackChunkName: "login" */ '@/client/components/auth/LoginHome.vue'));
const LoadGameForm = defineAsyncComponent(() => import(/* webpackChunkName: "load-game" */ '@/client/components/LoadGameForm.vue'));
const PlayerHome = defineAsyncComponent(() => import(/* webpackChunkName: "player-home" */ '@/client/components/PlayerHome.vue'));
const SpectatorHome = defineAsyncComponent(() => import(/* webpackChunkName: "spectator-home" */ '@/client/components/SpectatorHome.vue'));
const ReplayHome = defineAsyncComponent(() => import(/* webpackChunkName: "replay" */ '@/client/components/replay/ReplayHome.vue'));
const StartScreen = defineAsyncComponent(() => import(/* webpackChunkName: "start-screen" */ '@/client/components/StartScreen.vue'));
const MapEditor = defineAsyncComponent(() => import(/* webpackChunkName: "map-editor" */ '@/client/components/MapEditor.vue'));
const CardMaker = defineAsyncComponent(() => import(/* webpackChunkName: "card-maker" */ '@/client/components/cardmaker/CardMaker.vue'));
const CardLibrary = defineAsyncComponent(() => import(/* webpackChunkName: "card-library" */ '@/client/components/cardlibrary/CardLibrary.vue'));
const MapLibrary = defineAsyncComponent(() => import(/* webpackChunkName: "map-library" */ '@/client/components/maplibrary/MapLibrary.vue'));
import {$t, setTranslationContext} from '@/client/directives/i18n';
import {paths} from '@/common/app/paths';
import {PlayerViewModel, ViewModel} from '@/common/models/PlayerModel';
import {SimpleGameModel} from '@/common/models/SimpleGameModel';
import {SpectatorModel} from '@/common/models/SpectatorModel';
import {isPlayerId, isSpectatorId} from '@/common/Types';
import {hasShowModal, showModal, windowHasHTMLDialogElement} from './HTMLDialogElementCompatibility';
import {getLoadErrorMessage} from '@/client/utils/loadErrorMessage';
import {getPreferences, PreferencesManager} from '@/client/utils/PreferencesManager';
import WrybitBoundary from '@/client/wrybit/shell/WrybitBoundary.vue';
import type {WrybitViews} from '@/client/wrybit/shell/presentationViews';
import {inputContext} from '@/client/wrybit/shell/inputContext';
import InputPortal from '@/client/wrybit/shell/InputPortal.vue';
import WaitingFor from '@/client/components/WaitingFor.vue';
import {createInputHosts, INPUT_HOSTS} from '@/client/wrybit/shell/inputHosts';

import dialogPolyfill from 'dialog-polyfill';
import {setDocumentTitle} from '../utils/documentTitle';

type Screen = 'admin' |
            'create-game-form' |
            'cards' |
            'empty' |
            'game-home' |
            'games-overview' |
            'help' |
            'load' |
            'login-home' |
            'card-maker' |
            'card-library' |
            'map-editor' |
            'map-library' |
            'player-home' |
            'replay' |
            'spectator-home' |
            'start-screen' |
            'the-end';
export type MainAppData = {
    screen: Screen;
    /**
     * player or spectator are set once the app component has loaded.
     * Vue only watches properties that exist initially. When we
     * use this property we can't trigger vue state without
     * a refactor.
     */
    spectator?: SpectatorModel;
    playerView?: PlayerViewModel;
    // playerKey might seem to serve no function, but it is an arbitrary value used
    // to force a rerender / refresh.
    playerkey: number;
    inputRevision: number;
    refreshRevision: number;
    wrybitReady: boolean;
    wrybitViews: WrybitViews;
    isServerSideRequestInProgress: boolean;
    componentsVisibility: {[x: string]: boolean};
    game: SimpleGameModel | undefined;
    login: string | undefined;
}

// NOTE: this simplistic truncation to the last segment might cause issues if
// this page starts supporting paths more than one level deep.
function getLastPathSegment() {
  // Leave only the last part of /path
  return window.location.pathname.replace(/.*\//g, '');
}

function retainAdminSearch(targetPath: string, id: string | undefined) {
  const params = new URLSearchParams();
  if (id !== undefined) {
    params.set('id', id);
  }
  const current = new URLSearchParams(window.location.search);
  const serverId = current.get('serverId');
  if (serverId !== null && serverId !== '') {
    params.set('serverId', serverId);
  }
  const query = params.toString();
  return query === '' ? targetPath : `${targetPath}?${query}`;
}

class AppFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export default defineComponent({
  name: 'App',
  setup() {
    const inputHosts = createInputHosts();
    provide(INPUT_HOSTS, inputHosts);
    return {inputHosts};
  },
  data(): MainAppData {
    return {
      screen: 'empty',
      playerkey: 0,
      inputRevision: 0,
      refreshRevision: 0,
      wrybitReady: false,
      wrybitViews: {},
      isServerSideRequestInProgress: false,
      componentsVisibility: {
        'milestones': true,
        'awards_list': true,
        'tags_concise': false,
        'pinned_player_0': false,
        'pinned_player_1': false,
        'pinned_player_2': false,
        'pinned_player_3': false,
        'pinned_player_4': false,
        'turmoil_parties': false,
      } as {[x: string]: boolean},
      game: undefined as SimpleGameModel | undefined,
      playerView: undefined,
      spectator: undefined,
      login: undefined,
    };
  },
  components: {
    WrybitBoundary,
    InputPortal,
    WaitingFor,
    StartScreen,
    MapEditor,
    MapLibrary,
    CardMaker,
    CardLibrary,
    CreateGameForm,
    LoadGameForm,
    GameHome,
    PlayerHome,
    SpectatorHome,
    ReplayHome,
    GameEnd,
    GamesOverview,
    CardList,
    Help,
    AdminHome,
    LoginHome,
  },
  computed: {
    wrybitMode(): boolean {
      return getPreferences().experimental_layout;
    },
    participant(): ViewModel | undefined {
      return this.playerView ?? this.spectator;
    },
  },
  watch: {
    playerkey() {
      if (this.screen !== 'spectator-home' &&
          (this.screen !== 'player-home' || getPreferences().experimental_layout)) {
        return;
      }
      const {scrollX, scrollY} = window;
      if (scrollX !== 0 || scrollY !== 0) {
        this.$nextTick(() => window.scrollTo(scrollX, scrollY));
      }
    },
  },
  methods: {
    applyPlayerView(next: PlayerViewModel | undefined, acceptedInput = false): void {
      if (acceptedInput) {
        this.refreshRevision++;
      }
      const previousContext = inputContext(this.playerView);
      if (!this.wrybitMode || acceptedInput || previousContext === undefined || previousContext !== inputContext(next)) {
        this.inputRevision++;
      }
      this.playerView = next;
      this.playerkey++;
      if (next !== undefined) {
        setTranslationContext(next);
      }
    },
    useClassicInterface(): void {
      PreferencesManager.INSTANCE.set('experimental_layout', false);
    },
    showAlert(title: string, message: string, cb: () => void = () => {}): void {
      const dialogElement: HTMLElement | null = document.getElementById('alert-dialog');
      const buttonElement: HTMLElement | null = document.getElementById('alert-dialog-button');
      const messageElement: HTMLElement | null = document.getElementById('alert-dialog-message');
      const titleElement: HTMLElement | null = document.getElementById('alert-dialog-title');
      if (buttonElement !== null && titleElement !== null && messageElement !== null && dialogElement !== null && hasShowModal(dialogElement)) {
        messageElement.innerHTML = $t(message);
        titleElement.textContent = $t(title);
        const handler = () => {
          buttonElement.removeEventListener('click', handler);
          cb();
        };
        buttonElement.addEventListener('click', handler);
        showModal(dialogElement);
      } else {
        alert(message);
        cb();
      }
    },
    setVisibilityState(targetVar: string, isVisible: boolean) {
      if (isVisible === this.getVisibilityState(targetVar)) {
        return;
      }
      (this as unknown as MainAppData).componentsVisibility[targetVar] = isVisible;
    },
    getVisibilityState(targetVar: string): boolean {
      return (this as unknown as MainAppData).componentsVisibility[targetVar] ? true : false;
    },
    update(path: typeof paths.PLAYER | typeof paths.SPECTATOR): void {
      const currentPathname = getLastPathSegment();
      const app = this as unknown as MainAppData;
      const revision = ++app.refreshRevision;

      const url = 'api/' + path + window.location.search.replace('&noredirect', '');

      fetch(url)
        .then((resp) => {
          if (!resp.ok) {
            throw new AppFetchError(`Error getting game data: ${resp.statusText}`, resp.status);
          }
          return resp.json();
        })
        .then((model: ViewModel) => {
          if (revision !== app.refreshRevision || (path === paths.PLAYER && app.isServerSideRequestInProgress)) {
            return;
          }
          if (path === paths.PLAYER) {
            this.applyPlayerView(model as PlayerViewModel);
          } else if (path === paths.SPECTATOR) {
            app.spectator = model as SpectatorModel;
            app.playerkey++;
          }
          if (
            model.game.phase === 'end' &&
              window.location.search.includes('&noredirect') === false
          ) {
            app.screen = 'the-end';
            if (currentPathname !== paths.THE_END) {
              window.history.replaceState(
                model,
                `${constants.APP_NAME} - Player`,
                retainAdminSearch(paths.THE_END, model.id),
              );
            }
          } else {
            if (path === paths.PLAYER) {
              app.screen = 'player-home';
            } else if (path === paths.SPECTATOR) {
              app.screen = 'spectator-home';
            }
            if (currentPathname !== path) {
              window.history.replaceState(
                model,
                `${constants.APP_NAME} - Game`,
                retainAdminSearch(path, model.id),
              );
            }
          }
        })
        .catch((err) => {
          if (revision !== app.refreshRevision || (path === paths.PLAYER && app.isServerSideRequestInProgress)) {
            return;
          }
          alert(getLoadErrorMessage(path, err instanceof AppFetchError ? err.status : 0));
          console.error(err);
        });
    },
    updatePlayer() {
      this.update(paths.PLAYER);
    },
    updateSpectator() {
      this.update(paths.SPECTATOR);
    },
  },
  mounted() {
    setDocumentTitle();
    if (!windowHasHTMLDialogElement()) {
      dialogPolyfill.registerDialog(document.getElementById('alert-dialog') as HTMLDialogElement);
    }
    const currentPathname = getLastPathSegment();
    const app = this as unknown as MainAppData & {updatePlayer(): void; updateSpectator(): void};
    if (currentPathname === paths.PLAYER) {
      app.updatePlayer();
    } else if (currentPathname === paths.THE_END) {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id') || '';
      if (isPlayerId(id)) {
        app.updatePlayer();
      } else if (isSpectatorId(id)) {
        app.updateSpectator();
      } else {
        alert('Bad id URL parameter.');
      }
    } else if (currentPathname === paths.GAME) {
      const url = paths.API_GAME + window.location.search;
      fetch(url)
        .then((resp) => {
          if (!resp.ok) {
            throw new AppFetchError(`Error getting game data: ${resp.statusText}`, resp.status);
          }
          return resp.json();
        })
        .then((appGame: SimpleGameModel) => {
          app.screen = 'game-home';
          app.game = appGame;
          window.history.replaceState(
            appGame,
            `${constants.APP_NAME} - Game`,
            retainAdminSearch(paths.GAME, appGame.id),
          );
        })
        .catch((err) => {
          alert(getLoadErrorMessage(paths.GAME, err instanceof AppFetchError ? err.status : 0));
          console.error(err);
        });
    } else if (currentPathname === paths.GAMES_OVERVIEW) {
      app.screen = 'games-overview';
    } else if (currentPathname === paths.NEW_GAME) {
      app.screen = 'create-game-form';
    } else if (currentPathname === paths.LOAD) {
      app.screen = 'load';
    } else if (currentPathname === paths.CARDS) {
      app.screen = 'cards';
    } else if (currentPathname === paths.CUSTOM_CARD_MAKER) {
      app.screen = 'card-maker';
    } else if (currentPathname === paths.CARD_LIBRARY) {
      app.screen = 'card-library';
    } else if (currentPathname === paths.MAP_EDITOR) {
      app.screen = 'map-editor';
    } else if (currentPathname === paths.MAP_LIBRARY) {
      app.screen = 'map-library';
    } else if (currentPathname === paths.HELP) {
      app.screen = 'help';
    } else if (currentPathname === paths.SPECTATOR) {
      app.updateSpectator();
    } else if (currentPathname === paths.REPLAY) {
      app.screen = 'replay';
    } else if (currentPathname === paths.ADMIN) {
      app.screen = 'admin';
    } else if (currentPathname === paths.LOGIN) {
      app.screen = 'login-home';
    } else {
      app.screen = 'start-screen';
    }
  },
  errorCaptured(err: unknown) {
    // Chunk errors occur when the server is redeployed with new chunk names
    // and the client doesn't know about them. In that case, reload the page.
    if (err instanceof Error && err.name === 'ChunkLoadError') {
      console.error(err);
      this.showAlert('Page out of date', 'This page is out of date. Click OK to refresh it.', () => setTimeout(() => window.location.reload(), 100));
    }
  },
});
</script>

<style scoped>
.topmost-replay > .main-container { margin: 0; }
.topmost-replay > .notice { position: static; margin: 24px; }
</style>
