<template>
  <!-- Card size in the action box: small card, slider, large card. One value for all tabs (cardZoom.ts) -->
  <label ref="slider" class="card-zoom-slider" :title="$t('Card size')">
    <span class="card-zoom-slider__label">{{ $t('Zoom') }}</span>
    <span class="card-zoom-slider__icon card-zoom-slider__icon--small" aria-hidden="true"></span>
    <input type="range" :min="CARD_ZOOM_MIN" :max="CARD_ZOOM_MAX" step="0.02" :value="zoom" :aria-label="$t('Card size')" @input="onInput">
    <span class="card-zoom-slider__icon" aria-hidden="true"></span>
  </label>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {CARD_ZOOM_MAX, CARD_ZOOM_MIN, cardZoomState, setCardZoom, attachCardZoom} from '@/client/wrybit/visuals/cardfilter/cardZoom';

const zoomCleanup = new WeakMap<object, () => void>();

export default defineComponent({
  name: 'CardZoomSlider',
  mounted() {
    const root = (this.$refs.slider as HTMLElement).closest<HTMLElement>('.wrybit-ui');
    if (root !== null) {
      zoomCleanup.set(this, attachCardZoom(root));
    }
  },
  beforeUnmount() {
    zoomCleanup.get(this)?.();
    zoomCleanup.delete(this);
  },
  computed: {
    CARD_ZOOM_MIN(): number {
      return CARD_ZOOM_MIN;
    },
    CARD_ZOOM_MAX(): number {
      return CARD_ZOOM_MAX;
    },
    zoom(): number {
      return cardZoomState.zoom;
    },
  },
  methods: {
    onInput(event: Event) {
      setCardZoom(Number((event.target as HTMLInputElement).value));
    },
  },
});
</script>
