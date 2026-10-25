<template>
  <div class="setup-summary">
    <dl class="setup-summary-values">
      <div class="setup-summary-item">
        <dt>{{ $t('Starting M€') }}</dt>
        <dd data-test="starting">{{ starting === undefined ? '–' : starting }}</dd>
      </div>
      <div v-if="preludes !== undefined" class="setup-summary-item">
        <dt>{{ $t('Prelude cards') }}</dt>
        <dd data-test="preludes">{{ signed(preludes) }}</dd>
      </div>
      <div class="setup-summary-item">
        <dt>{{ $t('Purchase') }} ({{ purchasedCount }} × {{ cardCost ?? '–' }})</dt>
        <dd :class="{'setup-summary-value--negative': starting !== undefined && purchase !== undefined && purchase > starting}" data-test="purchase">
          {{ purchase === undefined ? '–' : signed(-purchase) }}
        </dd>
      </div>
      <div class="setup-summary-item">
        <dt>{{ $t('Remaining') }}</dt>
        <dd>
          <span v-if="remaining !== undefined" :class="['setup-summary-coin', {'setup-summary-coin--negative': remaining < 0}]" data-test="remaining">{{ withMinus(remaining) }}</span>
          <template v-else>–</template>
        </dd>
      </div>
      <div class="setup-summary-item setup-summary-item--status">
        <dt>{{ $t('Status') }}</dt>
        <dd :class="statusReady ? 'setup-summary-status--ready' : 'setup-summary-status--open'">{{ $t(status) }}</dd>
      </div>
    </dl>
    <div class="setup-summary-actions"><slot></slot></div>
  </div>
</template>

<script setup lang="ts">
// All monetary values are supplied by our setup owner; this component only formats them.
defineProps<{starting: number | undefined, preludes: number | undefined, purchase: number | undefined, remaining: number | undefined,
  purchasedCount: number, cardCost: number | undefined, status: string, statusReady: boolean}>();
function withMinus(value: number): string {
  return value < 0 ? '−' + Math.abs(value) : String(value);
}
function signed(value: number): string {
  if (value === 0) {
    return '±0';
  }
  return value > 0 ? '+' + value : withMinus(value);
}
</script>
