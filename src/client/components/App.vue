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
    <aside v-if="!wrybitMode && screen !== 'cards'" class="classic-mode-switch">
      <button type="button" class="btn" data-test="wrybit-layout" @click="useWrybitInterface" v-i18n>Wrybit layout</button>
    </aside>
    <div class="main-container" :class="{'wrybit-booting': wrybitMode && !wrybitReady}">
      <div v-if="wrybitMode && !wrybitReady" class="wrybit-boot" role="status" aria-live="polite">
        <div class="wrybit-boot__spinner"></div>
      </div>
      <component :is="wrybitMode && wrybitReady && wrybitViews.startScreen ? wrybitViews.startScreen : 'StartScreen'" v-if="screen === 'start-screen'" />
      <CreateGameForm
        v-else-if="screen === 'create-game-form'"
      />
      <component :is="wrybitMode && wrybitReady && wrybitViews.loadGame ? wrybitViews.loadGame : 'LoadGameForm'" v-else-if="screen === 'load'" />
      <GameHome
        v-else-if="screen === 'game-home' && game !== undefined"
        :game="game"
      />
      <component :is="wrybitMode && wrybitReady && wrybitViews.playerHome ? wrybitViews.playerHome : 'PlayerHome'"
        v-else-if="screen === 'player-home' && playerView !== undefined"
        :player-view="playerView"
        :key="playerkey"
      />
      <component :is="wrybitMode && wrybitReady && wrybitViews.spectatorHome ? wrybitViews.spectatorHome : 'SpectatorHome'"
        v-else-if="screen === 'spectator-home' && spectator !== undefined"
        :spectator="spectator"
        :key="spectator.id"
      />
      <component
        :is="wrybitMode && wrybitReady && wrybitViews.gameEnd ? wrybitViews.gameEnd : 'GameEnd'"
        v-else-if="screen === 'the-end' && participant !== undefined"
        :participant="participant"
      />
      <ReplayHome v-else-if="screen === 'replay'" />
      <component :is="wrybitMode && wrybitReady && wrybitViews.gamesOverview ? wrybitViews.gamesOverview : 'GamesOverview'" v-else-if="screen === 'games-overview'" />
      <component v-else-if="screen === 'cards'" :is="wrybitMode && wrybitReady && wrybitViews.cards ? wrybitViews.cards : 'CardList'" />
      <CardMaker v-else-if="screen === 'card-maker'" />
      <CardLibrary v-else-if="screen === 'card-library'" />
      <MapEditor v-else-if="screen === 'map-editor'" />
      <MapLibrary v-else-if="screen === 'map-library'" />
      <component :is="wrybitMode && wrybitReady && wrybitViews.adminHome ? wrybitViews.adminHome : 'AdminHome'" v-else-if="screen === 'admin'" />
      <component :is="wrybitMode && wrybitReady && wrybitViews.loginHome ? wrybitViews.loginHome : 'LoginHome'" v-else-if="screen === 'login-home'" />
      <component :is="wrybitMode && wrybitReady && wrybitViews.help ? wrybitViews.help : 'Help'" v-else-if="screen === 'help'" />
      <component :is="wrybitViews.stats ?? 'StartScreen'" v-else-if="screen === 'stats'" />
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
import {computed, defineAsyncComponent, defineComponent, provide, ref, shallowRef} from 'vue';
import {CREATE_CONTROLS, CREATE_PRESENTATION} from '@/client/wrybit/create/presentation';
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
import {statusCode} from '@/common/http/statusCode';
import {PlayerViewModel, ViewModel} from '@/common/models/PlayerModel';
import {applyFetchedPlayerView, isGameShellEnabled, restoreGameShellAppState, subscribeGameShellAppState} from '@/client/shell';
import {SimpleGameModel} from '@/common/models/SimpleGameModel';
import {SpectatorModel} from '@/common/models/SpectatorModel';
import {isPlayerId, isSpectatorId} from '@/common/Types';
import {hasShowModal, showModal, windowHasHTMLDialogElement} from './HTMLDialogElementCompatibility';
import {getLoadErrorMessage} from '@/client/utils/loadErrorMessage';
import {redirectToLogin} from '@/client/utils/loginRedirect';
import {getPreferences, PreferencesManager} from '@/client/utils/PreferencesManager';
import {loadHotkeys} from '@/client/hotkeys/hotkeyStore';
import {startHotkeyAvailability} from '@/client/hotkeys/hotkeyAvailability';
import {startKeyLabelDetection} from '@/client/hotkeys/hotkeyKeyLabels';
import {installHotkeys} from '@/client/hotkeys/hotkeyDispatcher';
import WrybitBoundary from '@/client/wrybit/shell/WrybitBoundary.vue';
import type {WrybitViews} from '@/client/wrybit/shell/presentationViews';
import {inputContext} from '@/client/wrybit/shell/inputContext';
import InputPortal from '@/client/wrybit/shell/InputPortal.vue';
import WaitingFor from '@/client/components/WaitingFor.vue';
import {createInputHosts, INPUT_HOSTS} from '@/client/wrybit/shell/inputHosts';
import {INPUT_PRESENTATIONS} from '@/client/wrybit/inputs/presentation';
import {createInputBridge, INPUT_BRIDGE} from '@/client/wrybit/shell/inputBridge';

import dialogPolyfill from 'dialog-polyfill';
import {setDocumentTitle} from '../utils/documentTitle';
import {enforceClassicViewport} from '@/client/utils/viewport';

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
            'stats' |
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
    isServerSideRequestInProgress: boolean;
    componentsVisibility: {[x: string]: boolean};
    game: SimpleGameModel | undefined;
    login: string | undefined;
    shellUnsubscribe?: () => void;
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
    provide(INPUT_BRIDGE, createInputBridge());
    const wrybitReady = ref(false);
    const wrybitViews = shallowRef<WrybitViews>({});
    provide(INPUT_PRESENTATIONS, computed(() => getPreferences().experimental_layout && wrybitReady.value ? wrybitViews.value.inputs : undefined));
    provide(CREATE_PRESENTATION, computed(() => getPreferences().experimental_layout && wrybitReady.value ? wrybitViews.value.create : undefined));
    provide(CREATE_CONTROLS, computed(() => getPreferences().experimental_layout && wrybitReady.value ? wrybitViews.value.createControls : undefined));
    return {inputHosts, wrybitReady, wrybitViews};
  },
  data(): MainAppData {
    const restoredGameShell = restoreGameShellAppState(getLastPathSegment() === paths.PLAYER);
    return {
      screen: restoredGameShell.playerHome ? 'player-home' : 'empty',
      playerkey: restoredGameShell.playerkey,
      inputRevision: 0,
      refreshRevision: 0,
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
      playerView: restoredGameShell.playerView,
      shellUnsubscribe: undefined,
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
    screen() {
      // Classic screens always lay out for the classic canvas: a device-width viewport
      // left behind by a Wrybit or experimental surface must not follow them here.
      this.$nextTick(() => {
        if (!this.wrybitMode) {
          enforceClassicViewport();
        }
      });
    },
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
    useWrybitInterface(): void {
      PreferencesManager.INSTANCE.set('experimental_layout', true);
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
    /**
     * Fetches and shows the latest player or spectator view.
     *
     * Resolves to false when the fetch fails.
     */
    update(path: typeof paths.PLAYER | typeof paths.SPECTATOR): Promise<boolean> {
      const currentPathname = getLastPathSegment();
      const app = this as unknown as MainAppData;
      const revision = ++app.refreshRevision;

      const url = 'api/' + path + window.location.search.replace('&noredirect', '');

      return fetch(url)
        .then((resp) => {
          if (!resp.ok) {
            throw new AppFetchError(`Error getting game data: ${resp.statusText}`, resp.status);
          }
          return resp.json();
        })
        .then((model: ViewModel) => {
          if (revision !== app.refreshRevision || (path === paths.PLAYER && app.isServerSideRequestInProgress)) {
            // A newer refresh is already in flight and owns the next poll.
            return true;
          }
          if (path === paths.PLAYER) {
            const playerView = model as PlayerViewModel;
            if (isGameShellEnabled()) {
              app.playerView = playerView;
              setTranslationContext(playerView);
              applyFetchedPlayerView(app, playerView);
              app.inputRevision++;
            } else {
              this.applyPlayerView(playerView);
            }
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
          return true;
        })
        .catch((err) => {
          if (revision !== app.refreshRevision || (path === paths.PLAYER && app.isServerSideRequestInProgress)) {
            return true;
          }
          const status = err instanceof AppFetchError ? err.status : 0;
          if (path === paths.PLAYER && (status === statusCode.unauthorized || status === statusCode.forbidden)) {
            redirectToLogin();
            return false;
          }
          alert(getLoadErrorMessage(path, status));
          console.error(err);
          return false;
        });
    },
    updatePlayer(): Promise<boolean> {
      return this.update(paths.PLAYER);
    },
    updateSpectator(): Promise<boolean> {
      return this.update(paths.SPECTATOR);
    },
  },
  created() {
    // Keyboard shortcuts: own bindings, availability and one global listener (hotkeyDispatcher.ts).
    loadHotkeys();
    startHotkeyAvailability();
    startKeyLabelDetection();
    installHotkeys();
    const app = this as unknown as MainAppData;
    app.shellUnsubscribe = subscribeGameShellAppState(app, setTranslationContext);
  },
  beforeUnmount() {
    const app = this as unknown as MainAppData;
    app.shellUnsubscribe?.();
    app.shellUnsubscribe = undefined;
  },
  mounted() {
    setDocumentTitle();
    if (!windowHasHTMLDialogElement()) {
      dialogPolyfill.registerDialog(document.getElementById('alert-dialog') as HTMLDialogElement);
    }
    const currentPathname = getLastPathSegment();
    const app = this as unknown as MainAppData & {updatePlayer(): Promise<boolean>; updateSpectator(): Promise<boolean>};
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
    } else if (currentPathname === paths.STATS) {
      if (getPreferences().experimental_layout) {
        app.screen = 'stats';
      } else {
        window.location.replace('/elo/');
      }
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
.classic-mode-switch {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 201;
}

@media (max-width: 700px) {
  .classic-mode-switch {
    top: 6px;
    right: 6px;

    .btn {
      min-width: 0;
      height: 34px;
      padding: 0 8px;
      font-size: 10px;
    }
  }
}

.topmost-replay > .main-container { margin: 0; }
.topmost-replay > .notice { position: static; margin: 24px; }

/* While the optional Wrybit chunk loads, keep the classic page mounted but out of
   the way; otherwise it flashes before the new layout replaces it. */
.main-container.wrybit-booting > :not(.wrybit-boot) {
  visibility: hidden;
  pointer-events: none;
}
.wrybit-boot {
  display: grid;
  min-height: 70vh;
  place-items: center;
}

.wrybit-boot__spinner {
  width: 34px;
  height: 34px;
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-top-color: #b9adff;
  border-radius: 50%;
  animation: wrybit-boot-spin 0.8s linear infinite;
}

@keyframes wrybit-boot-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .wrybit-boot__spinner {
    animation: none;
  }
}
</style>
