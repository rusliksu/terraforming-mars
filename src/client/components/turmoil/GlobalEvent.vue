<template>
  <div :class="klass">
    <div class="card-container global-event-container">
      <div class="card-content-wrapper" v-i18n>
        <CardParty class="card-party--revealed" :party="revealed" />
        <CardParty class="card-party--current" :party="current" />
        <div ref="title" class="global-event-title">{{globalEventName}}</div>
        <div class="card-content global-event-card-content">
          <CardRenderData v-if="renderData !== undefined" :renderData="renderData" />
          <CardDescription :item='description' />
        </div>
      </div>
    </div>
    <span v-if="showDistance" class="global-event-distance" v-i18n>{{ type }}</span>
    <slot></slot>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import CardRenderData from '@/client/components/card/CardRenderData.vue';
import CardParty from '@/client/components/card/CardParty.vue';
import {IClientGlobalEvent} from '@/common/turmoil/IClientGlobalEvent';
import {getGlobalEvent} from '@/client/turmoil/ClientGlobalEventManifest';
import CardDescription from '@/client/components/card/CardDescription.vue';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';
import {ICardRenderRoot} from '@/common/cards/render/Types';
import {PartyName} from '@/common/turmoil/PartyName';
import {fitTextWhenReady} from '@/client/utils/textFit';

export type RenderType = 'coming' | 'current' | 'distant' | 'prior';

type Refs = {
  title: HTMLElement | undefined;
};

export default defineComponent({
  name: 'GlobalEvent',
  components: {
    CardRenderData,
    CardParty,
    CardDescription,
  },
  mounted() {
    this.fitTitle();
  },
  watch: {
    // Turmoil.vue renders each distant/coming/current slot without a :key, so as the game
    // proceeds the same component instance receives the next event of that slot. The card
    // content below is derived from the prop, so only the fitted title has to follow it.
    globalEventName() {
      this.fitTitle();
    },
  },
  props: {
    globalEventName: {
      type: String as () => GlobalEventName,
      required: true,
    },
    type: {
      type: String as () => RenderType,
      required: true,
    },
    showDistance: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    fitTitle(): void {
      fitTextWhenReady(this.typedRefs.title, 'global-event-title');
    },
  },
  computed: {
    // Never snapshot the manifest entry: the same instance renders a new global event
    // every generation, and a copied value would keep the previous card's body.
    globalEvent(): IClientGlobalEvent {
      const globalEvent: IClientGlobalEvent | undefined = getGlobalEvent(this.globalEventName);
      if (globalEvent === undefined) {
        throw new Error(`Can't find card ${this.globalEventName}`);
      }
      return globalEvent;
    },
    renderData(): ICardRenderRoot {
      return this.globalEvent.renderData;
    },
    revealed(): PartyName {
      return this.globalEvent.revealedDelegate;
    },
    current(): PartyName {
      return this.globalEvent.currentDelegate;
    },
    description(): string {
      return this.globalEvent.description;
    },
    klass(): string {
      const common = 'global-event global-event--' + this.type;
      if (this.showDistance) {
        return common + ' global-event--show-distance';
      }
      return common;
    },
    typedRefs(): Refs {
      return this.$refs as unknown as Refs;
    },
  },
});

</script>
