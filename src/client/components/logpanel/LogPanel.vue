<template>
  <div class="log-container">
    <LogGenerationList
      :max="generation"
      :selected="selectedGeneration"
      :lastSoloGeneration="lastSoloGeneration"
      @selected="selectGeneration">
      <template #title>
        <h2 :class="getTitleClasses()">
          <span v-i18n>Game log</span>
        </h2>
      </template>
      <template #after-generations>
        <div :class="getClassesRecentLogs()" @click.prevent="selectRecentLogs()" v-i18n>
          Last 100
        </div>
      </template>
    </LogGenerationList>
    <div class="panel log-panel">
      <div id="logpanel-scrollable" class="panel-body" @scroll="handleScroll">
        <ul v-if="messages">
          <LogMessageComponent v-for="(message, index) in filteredMessages" :key="message.timestamp + '-' + index" :message="message" :viewModel="viewModel" @click="messageClicked(message)" @spaceClicked="$emit('spaceClicked', $event)"/>
        </ul>
      </div>
      <button
        v-show="showScrollToBottomButton"
        type="button"
        class="log-latest-button"
        aria-label="Latest logs"
        title="Latest logs"
        data-test="log-latest"
        @click="showLatestLogs"
      >
        <svg class="log-latest-button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
          <path d="M12 5v14M19 12l-7 7-7-7"/>
        </svg>
      </button>
      <div class='debugid'>(debugid {{step}})</div>
    </div>
    <div class="log-player-filters">
      <template v-if="players.length > 1">
        <button
          type="button"
          class="log-player-filter"
          :class="getClassesPlayerFilter(undefined)"
          :aria-pressed="selectedPlayerColor === undefined"
          data-test="log-player-filter-all"
          @click="selectPlayer(undefined)"
          v-i18n
        >All</button>
        <button
          v-for="player in players"
          :key="player.color"
          type="button"
          class="log-player-filter"
          :class="getClassesPlayerFilter(player.color)"
          :aria-pressed="selectedPlayerColor === player.color"
          :data-test="'log-player-filter-' + player.color"
          @click="selectPlayer(player.color)"
        >{{ player.name }}</button>
      </template>
    </div>
    <LogMessageInspector ref="messageInspector" :viewModel="viewModel"/>
  </div>
</template>

<script lang="ts">

import {defineComponent} from '@/client/vue3-compat';
import {paths} from '@/common/app/paths';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {PublicPlayerModel, ViewModel} from '@/common/models/PlayerModel';
import {playerColorClass} from '@/common/utils/utils';
import {Color} from '@/common/Color';
import {ParticipantId} from '@/common/Types';
import LogMessageComponent from '@/client/components/logpanel/LogMessageComponent.vue';
import LogMessageInspector from '@/client/components/logpanel/LogMessageInspector.vue';
import LogGenerationList from '@/client/components/logpanel/LogGenerationList.vue';
import {SoundManager} from '@/client/utils/SoundManager';
import {getPreferences} from '@/client/utils/PreferencesManager';

let logAbortController: AbortController | undefined;

type LogPanelViewState = {
  selectedGeneration: number,
  selectedRecentLimit: number | undefined,
  selectedPlayerColor: Color | undefined,
  scrollTop: number,
  stickToBottom: boolean,
};

const logPanelViewStates = new Map<ParticipantId, LogPanelViewState>();

type LogPanelModel = {
  messages: Array<LogMessage>,
  selectedGeneration: number,
  selectedRecentLimit: number | undefined,
  selectedPlayerColor: Color | undefined,
  stickToBottom: boolean,
  showScrollToBottomButton: boolean,
  isRestoringScrollPosition: boolean,
  resizeObserver: ResizeObserver | undefined,
};

type Refs = {
  messageInspector: InstanceType<typeof LogMessageInspector>;
};

export default defineComponent({
  name: 'LogPanel',
  props: {
    viewModel: {
      type: Object as () => ViewModel,
      required: true,
    },
    color: {
      type: String as () => Color,
      required: true,
    },
    step: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  data(): LogPanelModel {
    return {
      messages: [],
      selectedGeneration: -1,
      selectedRecentLimit: undefined,
      selectedPlayerColor: undefined,
      stickToBottom: true,
      showScrollToBottomButton: false,
      isRestoringScrollPosition: false,
      resizeObserver: undefined,
    };
  },
  components: {
    LogMessageComponent,
    LogMessageInspector,
    LogGenerationList,
  },
  emits: ['spaceClicked'],
  methods: {
    messageClicked(message: LogMessage) {
      this.typedRefs.messageInspector.show(message);
    },
    selectGeneration(gen: number): void {
      if (gen !== this.selectedGeneration || this.selectedRecentLimit !== undefined) {
        this.selectedGeneration = gen;
        this.selectedRecentLimit = undefined;
        this.getLogsForGeneration(gen, true);
      }
    },
    getLogsForGeneration(generation: number, forceScrollToEnd = false, restoredState?: LogPanelViewState): void {
      const url = `${paths.API_GAME_LOGS}?id=${this.id}&generation=${generation}&gameAge=${this.gameAge}`;
      this.loadLogs(url, generation === this.generation, forceScrollToEnd, restoredState);
    },
    selectRecentLogs(): void {
      if (this.selectedRecentLimit !== 100) {
        this.selectedGeneration = -1;
        this.selectedRecentLimit = 100;
        this.getRecentLogs(true);
      }
    },
    showLatestLogs(): void {
      this.selectedGeneration = -1;
      this.selectedRecentLimit = 100;
      this.selectedPlayerColor = undefined;
      this.stickToBottom = true;
      this.getRecentLogs(true);
    },
    selectPlayer(color: Color | undefined): void {
      this.selectedPlayerColor = color;
    },
    getRecentLogs(forceScrollToEnd = false, restoredState?: LogPanelViewState): void {
      const url = `${paths.API_GAME_LOGS}?id=${this.id}&limit=100&gameAge=${this.gameAge}`;
      this.loadLogs(url, true, forceScrollToEnd, restoredState);
    },
    loadLogs(url: string, liveLogs: boolean, forceScrollToEnd = false, restoredState?: LogPanelViewState): void {
      const messages = this.messages;
      const scrollablePanel = this.getScrollablePanel();
      const previousScrollTop = restoredState?.scrollTop ?? scrollablePanel?.scrollTop ?? 0;
      const shouldStickToBottom = restoredState?.stickToBottom ?? (liveLogs && (forceScrollToEnd || this.isNearBottom()));
      this.stickToBottom = shouldStickToBottom;
      this.isRestoringScrollPosition = (liveLogs || restoredState !== undefined) && !shouldStickToBottom;
      this.teardownAutoScrollObserver();
      // abort any pending requests
      if (logAbortController) {
        logAbortController.abort();
        logAbortController = undefined;
      }

      const controller = new AbortController();
      logAbortController = controller;

      fetch(url, {signal: controller.signal, cache: 'no-store'})
        .then((resp) => {
          if (!resp.ok) {
            console.error(`error updating messages, response code ${resp.status}`);
            return null;
          }
          return resp.json();
        })
        .then((data) => {
          if (controller.signal.aborted || logAbortController !== controller) {
            return;
          }
          if (!data) {
            this.isRestoringScrollPosition = false;
            return;
          }
          messages.splice(0, messages.length);
          messages.push(...data);
          if (getPreferences().enable_sounds && window.location.search.includes('experimental=1')) {
            SoundManager.newLog();
          }
          if (liveLogs || restoredState !== undefined) {
            this.$nextTick(() => {
              if (liveLogs) {
                this.installAutoScrollObserver();
              }
              if (shouldStickToBottom) {
                this.scrollToEnd();
              } else {
                this.restoreScrollTop(previousScrollTop);
              }
              this.isRestoringScrollPosition = false;
            });
          } else {
            this.isRestoringScrollPosition = false;
          }
        })
        .catch((err) => {
          if (err.name === 'AbortError') {
            // ignore aborted requests
            return;
          }
          this.isRestoringScrollPosition = false;
          console.error('error updating messages, unable to reach server');
        });
    },
    handleScroll() {
      if (!this.isRestoringScrollPosition) {
        this.stickToBottom = this.isNearBottom();
      }
      this.showScrollToBottomButton = !this.isNearBottom();
    },
    getScrollablePanel(): HTMLElement | null {
      return document.getElementById('logpanel-scrollable');
    },
    isNearBottom(): boolean {
      const scrollablePanel = this.getScrollablePanel();
      if (scrollablePanel === null) {
        return true;
      }
      const remaining = scrollablePanel.scrollHeight - scrollablePanel.clientHeight - scrollablePanel.scrollTop;
      return remaining <= 24;
    },
    installAutoScrollObserver() {
      this.teardownAutoScrollObserver();
      const scrollablePanel = this.getScrollablePanel();
      const list = scrollablePanel?.querySelector('ul');
      if (!scrollablePanel || !list) {
        return;
      }
      if (typeof ResizeObserver === 'undefined') {
        return;
      }

      this.resizeObserver = new ResizeObserver(() => {
        if ((this.selectedGeneration === this.generation || this.selectedRecentLimit !== undefined) && this.stickToBottom) {
          this.scrollToEnd();
        }
      });
      this.resizeObserver.observe(list);
    },
    teardownAutoScrollObserver() {
      this.resizeObserver?.disconnect();
      this.resizeObserver = undefined;
    },
    scrollToEnd() {
      const scrollablePanel = this.getScrollablePanel();
      if (scrollablePanel !== null) {
        scrollablePanel.scrollTop = scrollablePanel.scrollHeight;
        this.showScrollToBottomButton = false;
      }
    },
    restoreScrollTop(scrollTop: number) {
      const scrollablePanel = this.getScrollablePanel();
      if (scrollablePanel !== null) {
        scrollablePanel.scrollTop = scrollTop;
      }
    },
    getClassesGenIndicator(gen: number): string {
      const classes = ['log-gen-indicator'];
      if (gen === this.selectedGeneration) {
        classes.push('log-gen-indicator--selected');
      }
      return classes.join(' ');
    },
    getClassesRecentLogs(): string {
      const classes = ['log-recent-indicator'];
      if (this.selectedRecentLimit !== undefined) {
        classes.push('log-recent-indicator--selected');
      }
      return classes.join(' ');
    },
    getClassesPlayerFilter(color: Color | undefined): string {
      const classes = [];
      if (color !== undefined) {
        classes.push('log-player-filter--player', playerColorClass(color, 'bg'));
      }
      if (color === this.selectedPlayerColor) {
        classes.push('log-player-filter--selected');
        if (color === undefined) {
          classes.push('log-player-filter--selected-all');
        }
      }
      return classes.join(' ');
    },
    getGenerationsRange(): Array<number> {
      const generations: Array<number> = [];
      for (let i = 1; i <= this.generation; i++) {
        generations.push(i);
      }
      return generations;
    },
    getTitleClasses(): string {
      const classes = ['log-title'];
      classes.push(playerColorClass(this.color, 'shadow'));
      return classes.join(' ');
    },
    lastGenerationClass(): string {
      return this.lastSoloGeneration === this.generation ? 'last-generation blink-animation' : '';
    },
  },
  computed: {
    typedRefs(): Refs {
      return this.$refs as unknown as Refs;
    },
    generation(): number {
      return this.viewModel.game.generation;
    },
    gameAge(): number {
      return this.viewModel.game.gameAge;
    },
    lastSoloGeneration(): number | undefined {
      return this.players.length === 1 ? this.viewModel.game.lastSoloGeneration : undefined;
    },
    players(): Array<PublicPlayerModel> {
      return this.viewModel.players;
    },
    id(): ParticipantId | undefined {
      return this.viewModel.id;
    },
    filteredMessages(): Array<LogMessage> {
      if (this.selectedPlayerColor === undefined) {
        return this.messages;
      }
      const player = this.players.find((player) => player.color === this.selectedPlayerColor);
      return this.messages.filter((message) => {
        if (message.type === LogMessageType.NEW_GENERATION) {
          return true;
        }
        if (player?.id !== undefined && message.playerId === player.id) {
          return true;
        }
        return message.data.some((datum) => datum.type === LogMessageDataType.PLAYER && datum.value === this.selectedPlayerColor);
      });
    },
  },
  watch: {
    gameAge() {
      if (this.selectedRecentLimit !== undefined) {
        this.getRecentLogs();
      } else if (this.selectedGeneration === this.generation) {
        this.getLogsForGeneration(this.generation);
      }
    },
  },
  mounted() {
    const restoredState = this.id === undefined ? undefined : logPanelViewStates.get(this.id);
    if (restoredState === undefined) {
      this.selectedRecentLimit = 100;
    } else {
      this.selectedGeneration = restoredState.selectedGeneration;
      this.selectedRecentLimit = restoredState.selectedRecentLimit;
      this.selectedPlayerColor = restoredState.selectedPlayerColor;
      this.stickToBottom = restoredState.stickToBottom;
    }
    if (this.selectedRecentLimit !== undefined) {
      this.getRecentLogs(restoredState === undefined, restoredState);
    } else {
      this.getLogsForGeneration(this.selectedGeneration, false, restoredState);
    }
  },
  beforeUnmount() {
    const scrollablePanel = this.getScrollablePanel();
    if (this.id !== undefined) {
      logPanelViewStates.set(this.id, {
        selectedGeneration: this.selectedGeneration,
        selectedRecentLimit: this.selectedRecentLimit,
        selectedPlayerColor: this.selectedPlayerColor,
        scrollTop: scrollablePanel?.scrollTop ?? 0,
        stickToBottom: this.stickToBottom,
      });
    }
    this.teardownAutoScrollObserver();
  },
});

</script>
