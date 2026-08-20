<template>
  <div>
  <template v-if="waitingfor === undefined || waitingfor.optional">
    <template v-if="waitingfor === undefined">
      {{ $t('Not your turn to take any actions') }}
    </template>
    <template v-else>
      {{ $t('Waiting for other players') }}
    </template>
    <template v-if="playersWaitingFor.length > 0">
      (⌛ <span v-for="color in playersWaitingFor" class="log-player" :class="playerColorClass(color, 'bg')" :key="color">{{ getPlayerName(color) }}</span>)
    </template>
  </template>
  <div v-if="showResearchPurchaseUndo()" class="wf-options wf-undo-controls">
    <AppButton title="Undo card purchase (experimental)" type="submit" size="normal" @click="undoResearchPurchase" />
  </div>
  <div v-if="waitingfor !== undefined" class="wf-root">
    <template v-if="preferences().experimental_ui && playerView.game.phase === Phase.ACTION">
      <input type="checkbox" name="suspend" id="suspend-checkbox" v-model="suspend" @change="updateSuspend">
      <label for="suspend-checkbox">
        <span v-i18n>Pause updates</span>
      </label>
      <div v-if="showRefresh()">Refresh<span class="reset"></span></div>
    </template>
    <PlayerInputFactory :players="playerView.players"
                          :playerView="playerView"
                          :playerinput="playerinputWithStepBack()"
                          :onsave="onsavePlayerInput"
                          :showsave="true"
                          :showtitle="true" />
  </div>
  <div v-if="showUndoFooter()" class="wf-options wf-undo-controls">
    <label v-if="showUndoAction()" class="form-radio">
      <input v-model="undoChoice" type="radio" :name="undoRadioElementName" value="action">
      <i class="form-icon"></i>
      <span v-i18n>Undo action</span>
    </label>
    <label v-if="showStepBack()" class="form-radio">
      <input v-model="undoChoice" type="radio" :name="undoRadioElementName" value="step">
      <i class="form-icon"></i>
      <span v-i18n>Undo one step (experimental)</span>
    </label>
    <div v-if="undoChoice" style="margin: 5px 30px 10px" class="wf-action">
      <AppButton title="Undo" type="submit" size="normal" @click="undoSelected" />
    </div>
  </div>
  </div>
</template>

<script lang="ts">
/* global RequestInit */

import {defineComponent} from 'vue';
import * as constants from '@/common/constants';
import raw_settings from '@/genfiles/settings.json';
import {vueRoot} from '@/client/components/vueRoot';
import {PlayerInputModel} from '@/common/models/PlayerInputModel';
import {playerColorClass} from '@/common/utils/utils';
import {PlayerViewModel, ViewModel} from '@/common/models/PlayerModel';
import {getPreferences} from '@/client/utils/PreferencesManager';
import {SoundManager} from '@/client/utils/SoundManager';
import {WaitingForModel} from '@/common/models/WaitingForModel';
import {Phase} from '@/common/Phase';
import {paths} from '@/common/app/paths';
import {statusCode} from '@/common/http/statusCode';
import {isPlayerId} from '@/common/Types';
import {InputResponse} from '@/common/inputs/InputResponse';
import {INVALID_RUN_ID, UNDO_REVEALED_HIDDEN_INFORMATION, AppErrorResponse} from '@/common/app/AppErrorId';
import {Color} from '@/common/Color';
import {gameDocumentTitle} from '../utils/documentTitle';
import {setFaviconStatus, setFaviconTurnFrame} from '@/client/utils/favicon';
import AppButton from '@/client/components/common/AppButton.vue';

let ui_update_timeout_id: number | undefined;
let documentTitleTimer: number | undefined;
let animationFrame = 0;
let undoChoiceSequence = 0;

// The spinning ◑◒◐◓ symbol used to indicate it's your turn.
const TURN_SEQUENCE = '◑◒◐◓';

// On a desktop browser the favicon is visible in the tab, so we spin it there
// rather than cluttering the document title. Mobile browsers don't show tab
// favicons, so they keep animating the title instead.
function isDesktopBrowser(): boolean {
  return !/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

type DataModel = {
  playersWaitingFor: Array<Color>
  suspend: boolean,
  savedPlayerView: PlayerViewModel | undefined;
  undoChoice: '' | 'action' | 'step';
  undoRadioElementName: string;
}

const CANNOT_CONTACT_SERVER = 'Unable to reach the server. It may be restarting or down for maintenance.';
const WAITING_FOR_POLL_RETRY_MESSAGE = 'Waiting-for poll failed; retrying.';

export default defineComponent({
  name: 'WaitingFor',
  props: {
    playerView: {
      type: Object as () => ViewModel,
      required: true,
    },
    waitingfor: {
      type: Object as () => PlayerInputModel | undefined,
      default: undefined,
    },
  },
  data(): DataModel {
    return {
      playersWaitingFor: [],
      suspend: false,
      savedPlayerView: undefined,
      undoChoice: '',
      undoRadioElementName: 'undo-choice-' + undoChoiceSequence++,
    };
  },
  components: {
    AppButton,
  },
  watch: {
    waitingfor() {
      this.undoChoice = '';
    },
  },
  methods: {
    getPlayerName(color: Color): string {
      const player = this.playerView.players.find((p) => p.color === color);
      return player ? player.name : color;
    },
    animateTitle() {
      if (!getPreferences().animated_title) {
        return;
      }

      animationFrame = (animationFrame + 1) % TURN_SEQUENCE.length;
      const experimental = getPreferences().experimental_ui;
      // The favicon annotation is an experimental feature.
      if (experimental) {
        setFaviconTurnFrame(animationFrame);
      }
      // Existing behavior spins the symbol in the document title. With
      // experimental UI on a desktop browser we show it only in the tab favicon
      // instead; otherwise keep animating the title.
      if (!(experimental && isDesktopBrowser())) {
        document.title = TURN_SEQUENCE[animationFrame] + ' ' + gameDocumentTitle(this.playerView.game);
      }
    },
    onsave(out: InputResponse) {
      this.fetchPlayerInput(
        paths.PLAYER_INPUT + '?id=' + this.playerView.id,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({runId: this.playerView.runId, ...out}),
        });
    },
    stepBack() {
      this.fetchPlayerInput(
        paths.RESET + '?id=' + this.playerView.id + '&mode=step',
        {method: 'GET'});
    },
    undoResearchPurchase() {
      this.fetchPlayerInput(
        paths.RESET + '?id=' + this.playerView.id + '&mode=research',
        {method: 'GET'});
    },
    reset() {
      this.fetchPlayerInput(
        paths.RESET + '?id=' + this.playerView.id,
        {method: 'GET'});
    },
    undoSelected() {
      if (this.undoChoice === 'step') {
        this.stepBack();
      } else if (this.undoChoice === 'action') {
        this.reset();
      }
    },
    onsavePlayerInput(out: InputResponse) {
      if (this.isStepBackResponse(out)) {
        this.stepBack();
        return;
      }
      this.onsave(out);
    },
    fetchPlayerInput(url: string, options: RequestInit) {
      const root = vueRoot(this);
      if (root.isServerSideRequestInProgress) {
        console.warn('Server request in progress');
        return;
      }

      root.isServerSideRequestInProgress = true;
      fetch(url, options)
        .then(async (response) => {
          if (response.ok) {
            this.updatePlayerView(await response.json());
            return;
          }

          const showAlert = vueRoot(this).showAlert;
          if (response.status === statusCode.badRequest) {
            const resp = await this.readAppError(response);
            if (resp.id === UNDO_REVEALED_HIDDEN_INFORMATION &&
                !url.includes('confirmHiddenInformation=true')) {
              if (window.confirm(resp.message)) {
                const separator = url.includes('?') ? '&' : '?';
                window.setTimeout(() => {
                  this.fetchPlayerInput(url + separator + 'confirmHiddenInformation=true', options);
                }, 0);
              }
              return;
            }
            let cb = () => root.updatePlayer();
            if (resp.id === INVALID_RUN_ID) {
              cb = () => setTimeout(() => window.location.reload(), 100);
            }
            showAlert('Error with input', resp.message, cb);
          } else {
            showAlert('Error processing response', 'Unexpected response from server. Please try again.');
            console.error(response.statusText);
          }
        })
        .catch((e) => {
          root.showAlert('Error sending input,', CANNOT_CONTACT_SERVER);
          console.error(e);
        })
        .finally(() => {
          root.isServerSideRequestInProgress = false;
        });
    },
    async readAppError(response: Response): Promise<AppErrorResponse> {
      try {
        return await response.clone().json() as AppErrorResponse;
      } catch (_err) {
        return {
          id: undefined,
          message: await response.text(),
        };
      }
    },
    updatePlayerView(playerView: PlayerViewModel | undefined) {
      if (this.suspend === false) {
        const root = vueRoot(this);
        root.screen = 'empty';
        root.playerView = playerView;
        root.playerkey++;
        root.screen = 'player-home';
        if (this.playerView.game.phase === 'end' && window.location.pathname !== paths.THE_END) {
          window.location = window.location as any as (string & Location);
        }
        this.savedPlayerView = undefined;
      } else {
        this.savedPlayerView = playerView;
      }
    },
    waitForUpdate() {
      const vueApp = this;
      const root = vueRoot(this);
      clearTimeout(ui_update_timeout_id);
      const retryAfterWaitingForPollError = (reason: string) => {
        console.warn(`${WAITING_FOR_POLL_RETRY_MESSAGE} ${reason}`);
        vueApp.waitForUpdate();
      };
      const askForUpdate = () => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', paths.API_WAITING_FOR + window.location.search + '&gameAge=' + this.playerView.game.gameAge + '&undoCount=' + this.playerView.game.undoCount);
        xhr.onerror = function() {
          retryAfterWaitingForPollError(CANNOT_CONTACT_SERVER);
        };
        xhr.onload = () => {
          if (xhr.status === statusCode.ok) {
            const result = xhr.response as WaitingForModel;
            this.playersWaitingFor = result.waitingFor;
            if (result.result === 'GO') {
              // Will only apply to player, not spectator.
              root.updatePlayer();
              this.notify();
              // We don't need to wait anymore - it's our turn
              return;
            } else if (result.result === 'REFRESH') {
              // Something changed, let's refresh UI
              if (isPlayerId(this.playerView.id)) {
                root.updatePlayer();
              } else {
                root.updateSpectator();
              }

              return;
            }
            vueApp.waitForUpdate();
          } else {
            retryAfterWaitingForPollError(`Received unexpected response from server (${xhr.status}).`);
          }
        };
        xhr.responseType = 'json';
        xhr.send();
      };
      ui_update_timeout_id = window.setTimeout(askForUpdate, raw_settings.waitingForTimeout);
    },
    async notify() {
      if (getPreferences().enable_sounds) {
        SoundManager.playActivePlayerSound();
      }

      const notificationOptions = {
        icon: 'favicon.ico',
        body: 'It\'s your turn!',
      };
      const notificationTitle = constants.APP_NAME;

      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            return;
          }
        } catch (err) {
          console.warn('Failed to request notification permission', err);
          return;
        }
      }

      try {
        if (typeof Notification === 'undefined') {
          throw new Error('Notification API unavailable');
        }
        new Notification(notificationTitle, notificationOptions);
      } catch (e) {
        // ok so the native Notification doesn't work which will happen
        // try to use the service worker
        if (!window.isSecureContext || !navigator.serviceWorker) {
          return;
        }
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(notificationTitle, notificationOptions);
        }).catch((err) => {
          // avoid promise going uncaught
          console.warn('Failed to display notification with serviceWorker', err);
        });
      }
    },
    updateSuspend() {
      if (this.suspend === false && this.savedPlayerView !== undefined) {
        this.updatePlayerView(this.savedPlayerView);
      }
    },
    showRefresh(): boolean {
      return this.suspend === true && this.savedPlayerView !== undefined;
    },
    showResearchPurchaseUndo(): boolean {
      return this.playerView.canUndoResearchPurchase === true && this.playerView.game.phase === Phase.RESEARCH;
    },
    showStepBack(): boolean {
      return this.playerView.game.gameOptions?.undoStepOption === true &&
        this.playerView.canStepBack === true &&
        this.waitingfor !== undefined &&
        this.playerView.thisPlayer?.isActive === true;
    },
    showStepBackOption(): boolean {
      return this.isMainActionPrompt() && this.showStepBack();
    },
    showUndoAction(): boolean {
      const phase = this.playerView.game.phase;
      const supportedPhase = phase === Phase.ACTION || phase === Phase.PRELUDES || phase === Phase.CEOS;
      const enabled = this.playerView.players.length === 1 ||
        this.playerView.game.gameOptions?.undoOption === true ||
        this.playerView.game.gameOptions?.undoStepOption === true;
      return supportedPhase && enabled && this.playerView.thisPlayer?.isActive === true;
    },
    showUndoFooter(): boolean {
      return !this.isMainActionPrompt() && (this.showUndoAction() || this.showStepBack());
    },
    playerinputWithStepBack(): PlayerInputModel {
      const playerinput = this.waitingfor;
      if (playerinput === undefined) {
        throw new Error('Missing player input');
      }
      if (!this.showStepBackOption() || playerinput.type !== 'or') {
        return playerinput;
      }
      return {
        ...playerinput,
        options: [...playerinput.options, {type: 'option', title: 'Undo one step (experimental)', buttonLabel: 'Undo'}],
      };
    },
    isStepBackResponse(out: InputResponse): boolean {
      const playerinput = this.waitingfor;
      return this.showStepBackOption() &&
        playerinput?.type === 'or' &&
        out.type === 'or' &&
        out.index === playerinput.options.length &&
        out.response.type === 'option';
    },
    isMainActionPrompt(): boolean {
      return this.waitingfor?.type === 'or' && this.waitingfor.buttonLabel === 'Take action';
    },
    playerName(color: Color) {
      const player = this.playerView.players.find((p) => p.color === color);
      return player?.name ?? '';
    },
  },
  mounted() {
    document.title = gameDocumentTitle(this.playerView.game);
    if (getPreferences().experimental_ui) {
      setFaviconStatus(this.waitingfor !== undefined ? 'turn' : 'idle');
    }
    window.clearInterval(documentTitleTimer);
    if (this.waitingfor === undefined || this.waitingfor.optional) {
      this.waitForUpdate();
    }
    if (this.playerView.players.length > 1 && this.waitingfor !== undefined && !this.waitingfor.optional) {
      documentTitleTimer = window.setInterval(() => this.animateTitle(), 1000);
    }
  },
  unmounted() {
    window.clearTimeout(ui_update_timeout_id);
    window.clearInterval(documentTitleTimer);
  },
  computed: {
    Phase(): typeof Phase {
      return Phase;
    },
    preferences(): typeof getPreferences {
      return getPreferences;
    },
    playerColorClass(): typeof playerColorClass {
      return playerColorClass;
    },
  },
});

</script>
