<template>
  <div class="log-container">
    <div class="log-generations">
      <h2 :class="getTitleClasses()">
          <span v-i18n>Game log</span>
      </h2>
      <div class="log-gen-title"  v-i18n>Gen: </div>
      <div class="log-gen-numbers">
        <div v-for="n in getGenerationsRange()" :key="n" :class="getClassesGenIndicator(n)" @click.prevent="selectGeneration(n)">
          {{ n }}
        </div>
      </div>
      <div :class="getClassesRecentLogs()" @click.prevent="selectRecentLogs()" v-i18n>
        Last 100
      </div>
      <div v-if="players.length > 1" class="log-player-filters">
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
      </div>
      <span class="label-additional" v-if="players.length === 1"><span :class="lastGenerationClass" v-i18n>of {{lastSoloGeneration}}</span></span>
    </div>
    <div class="panel log-panel">
      <div id="logpanel-scrollable" class="panel-body">
        <ul v-if="messages">
          <LogMessageComponent v-for="(message, index) in filteredMessages" :key="message.timestamp + '-' + index" :message="message" :viewModel="viewModel" @click="messageClicked(message)" @spaceClicked="spaceClicked"/>
        </ul>
      </div>
      <div class='debugid'>(debugid {{step}})</div>
    </div>
    <CardPanel v-if="selectedMessage !== undefined" :message="selectedMessage" :players="players" @hide="selectedMessage = undefined"/>
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
import {ParticipantId, SpaceId} from '@/common/Types';
import LogMessageComponent from '@/client/components/logpanel/LogMessageComponent.vue';
import CardPanel from '@/client/components/logpanel/CardPanel.vue';
import {isMarsSpace} from '@/common/boards/spaces';

let logAbortController: AbortController | undefined;

type LogPanelModel = {
  messages: Array<LogMessage>,
  selectedGeneration: number,
  selectedRecentLimit: number | undefined,
  selectedMessage: LogMessage | undefined,
  selectedPlayerColor: Color | undefined,
  stickToBottom: boolean,
  resizeObserver: ResizeObserver | undefined,
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
      selectedMessage: undefined,
      selectedPlayerColor: undefined,
      stickToBottom: true,
      resizeObserver: undefined,
    };
  },
  components: {
    LogMessageComponent,
    CardPanel,
  },
  methods: {
    messageClicked(message: LogMessage) {
      this.selectedMessage = message;
    },
    spaceClicked(spaceId: SpaceId) {
      const id = isMarsSpace(spaceId) ? 'shortkey-board' : 'shortkey-moonBoard';
      const el = document.getElementById(id);
      el?.scrollIntoView({block: 'center', inline: 'center', behavior: 'auto'});

      const regions = ['main_board', 'moon_board', 'moon_board_outer_spaces'];
      for (const region of regions) {
        const board = document.getElementById(region);
        if (board !== null) {
          const array = board.getElementsByClassName('board-log-highlight');
          for (let i = 0, length = array.length; i < length; i++) {
            const element = array[i] as HTMLElement;
            if (element.getAttribute('data_log_highlight_id') === spaceId) {
              element.classList.add('highlight');
              setTimeout(() => {
                element.classList.remove('highlight');
              }, 3000);
              return;
            }
          }
        }
      }
    },
    selectGeneration(gen: number): void {
      if (gen !== this.selectedGeneration || this.selectedRecentLimit !== undefined) {
        this.selectedGeneration = gen;
        this.selectedRecentLimit = undefined;
        this.getLogsForGeneration(gen, true);
      }
    },
    getLogsForGeneration(generation: number, forceScrollToEnd = false): void {
      const url = `${paths.API_GAME_LOGS}?id=${this.id}&generation=${generation}&gameAge=${this.gameAge}`;
      this.loadLogs(url, generation === this.generation, forceScrollToEnd);
    },
    selectRecentLogs(): void {
      if (this.selectedRecentLimit !== 100) {
        this.selectedGeneration = -1;
        this.selectedRecentLimit = 100;
        this.getRecentLogs(true);
      }
    },
    selectPlayer(color: Color | undefined): void {
      this.selectedPlayerColor = color;
    },
    getRecentLogs(forceScrollToEnd = false): void {
      const url = `${paths.API_GAME_LOGS}?id=${this.id}&limit=100&gameAge=${this.gameAge}`;
      this.loadLogs(url, true, forceScrollToEnd);
    },
    loadLogs(url: string, liveLogs: boolean, forceScrollToEnd = false): void {
      const messages = this.messages;
      const scrollablePanel = this.getScrollablePanel();
      const previousScrollTop = scrollablePanel?.scrollTop ?? 0;
      const shouldStickToBottom = liveLogs && (forceScrollToEnd || this.isNearBottom());
      this.stickToBottom = shouldStickToBottom;
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
            return;
          }
          messages.splice(0, messages.length);
          messages.push(...data);
          if (liveLogs) {
            this.$nextTick(() => {
              this.installAutoScrollObserver();
              if (shouldStickToBottom) {
                this.scrollToEnd();
              } else {
                this.restoreScrollTop(previousScrollTop);
              }
            });
          }
        })
        .catch((err) => {
          if (err.name === 'AbortError') {
            // ignore aborted requests
            return;
          }
          console.error('error updating messages, unable to reach server');
        });
    },
    handleScroll() {
      this.stickToBottom = this.isNearBottom();
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
      return color === this.selectedPlayerColor ? 'log-player-filter--selected' : '';
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
    generation(): number {
      return this.viewModel.game.generation;
    },
    gameAge(): number {
      return this.viewModel.game.gameAge;
    },
    lastSoloGeneration(): number {
      return this.viewModel.game.lastSoloGeneration;
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
      return this.messages.filter((message) => {
        if (message.type === LogMessageType.NEW_GENERATION) {
          return true;
        }
        if (this.selectedPlayerColor === this.color && this.id !== undefined && message.playerId === this.id) {
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
    this.selectedRecentLimit = 100;
    const scrollablePanel = this.getScrollablePanel();
    scrollablePanel?.addEventListener('scroll', this.handleScroll);
    this.getRecentLogs(true);
  },
  beforeUnmount() {
    const scrollablePanel = this.getScrollablePanel();
    scrollablePanel?.removeEventListener('scroll', this.handleScroll);
    this.teardownAutoScrollObserver();
  },
});

</script>
