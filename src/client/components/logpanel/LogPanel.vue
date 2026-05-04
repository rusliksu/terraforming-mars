<template>
  <div class="log-container">
    <div class="log-generations">
      <h2 :class="getTitleClasses()">
          <span v-i18n>Game log</span>
      </h2>
      <div class="log-gen-title"  v-i18n>Gen: </div>
      <div class="log-gen-numbers">
        <div v-for="n in getGenerationsRange()" :key="n" :class="getClassesGenIndicator(n)" v-on:click.prevent="selectGeneration(n)">
          {{ n }}
        </div>
      </div>
      <span class="label-additional" v-if="players.length === 1"><span :class="lastGenerationClass" v-i18n>of {{lastSoloGeneration}}</span></span>
    </div>
    <div class="panel log-panel">
      <div id="logpanel-scrollable" class="panel-body">
        <ul v-if="messages">
          <log-message-component v-for="(message, index) in messages" :key="index" :message="message" :viewModel="viewModel" v-on:click="messageClicked(message)" @spaceClicked="spaceClicked"></log-message-component>
        </ul>
      </div>
      <div class='debugid'>(debugid {{step}})</div>
    </div>
    <card-panel v-if="selectedMessage !== undefined" :message="selectedMessage" :players="players" v-on:hide="selectedMessage = undefined"></card-panel>
  </div>
</template>

<script lang="ts">

import {defineComponent} from '@/client/vue3-compat';
import {paths} from '@/common/app/paths';
import {LogMessage} from '@/common/logs/LogMessage';
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
  selectedMessage: LogMessage | undefined,
  stickToBottom: boolean,
  resizeObserver: ResizeObserver | undefined,
};

export default defineComponent({
  name: 'log-panel',
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
      selectedMessage: undefined,
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
      if (gen !== this.selectedGeneration) {
        this.getLogsForGeneration(gen);
      }
      this.selectedGeneration = gen;
    },
    getLogsForGeneration(generation: number): void {
      const messages = this.messages;
      this.stickToBottom = generation === this.generation && this.isNearBottom();
      // abort any pending requests
      if (logAbortController) {
        logAbortController.abort();
        logAbortController = undefined;
      }

      const url = `${paths.API_GAME_LOGS}?id=${this.id}&generation=${generation}&gameAge=${this.gameAge}`;
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
          if (!data) {
            return;
          }
          messages.splice(0, messages.length);
          messages.push(...data);
          if (generation === this.generation) {
            this.stickToBottom = true;
            this.$nextTick(() => {
              this.installAutoScrollObserver();
              this.scrollToEnd();
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
      if (scrollablePanel === null) return true;
      const remaining = scrollablePanel.scrollHeight - scrollablePanel.clientHeight - scrollablePanel.scrollTop;
      return remaining <= 24;
    },
    installAutoScrollObserver() {
      this.teardownAutoScrollObserver();
      const scrollablePanel = this.getScrollablePanel();
      const list = scrollablePanel?.querySelector('ul');
      if (!scrollablePanel || !list) return;
      if (typeof ResizeObserver === 'undefined') return;

      this.resizeObserver = new ResizeObserver(() => {
        if (this.selectedGeneration === this.generation && this.stickToBottom) {
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
    getClassesGenIndicator(gen: number): string {
      const classes = ['log-gen-indicator'];
      if (gen === this.selectedGeneration) {
        classes.push('log-gen-indicator--selected');
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
  },
  watch: {
    gameAge() {
      if (this.selectedGeneration === this.generation) {
        this.getLogsForGeneration(this.generation);
      }
    },
  },
  mounted() {
    this.selectedGeneration = this.generation;
    const scrollablePanel = this.getScrollablePanel();
    scrollablePanel?.addEventListener('scroll', this.handleScroll);
    this.getLogsForGeneration(this.generation);
  },
  beforeUnmount() {
    const scrollablePanel = this.getScrollablePanel();
    scrollablePanel?.removeEventListener('scroll', this.handleScroll);
    this.teardownAutoScrollObserver();
  },
});

</script>
