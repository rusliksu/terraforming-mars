<template>
  <span v-for="payment in payments" :key="payment.resource" class="action-log-payment"
    :aria-label="label(payment)" :title="label(payment)" data-test="payment-badge">
    <span class="action-log-effect-amount">−{{ payment.amount }}</span>
    <i class="resource_icon" :class="'resource_icon--' + payment.resource" aria-hidden="true"></i>
  </span>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {Resource} from '@/common/Resource';
import {LogPayment} from '@/common/logs/LogMessage';

/**
 * The resources an action spent, rendered the same way in the action log (live game) and in the
 * replay action summary. Both places share this component so the two views cannot drift apart.
 */
export default defineComponent({
  name: 'LogPaymentBadges',
  props: {
    payment: {
      type: Object as () => LogPayment | undefined,
      required: false,
      default: undefined,
    },
  },
  computed: {
    payments(): Array<{resource: Resource, amount: number}> {
      const payment = this.payment;
      if (payment === undefined) {
        return [];
      }
      return ([Resource.MEGACREDITS, Resource.STEEL, Resource.TITANIUM, Resource.ENERGY] as const)
        .map((resource) => ({resource, amount: payment[resource] ?? 0}))
        .filter(({amount}) => Number.isSafeInteger(amount) && amount > 0);
    },
  },
  methods: {
    label(payment: {resource: Resource, amount: number}): string {
      return 'Paid ' + payment.amount + ' ' + payment.resource;
    },
  },
});
</script>

<style scoped>
.action-log-payment { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; color: #e9c8b4; }
.action-log-effect-amount { font-weight: bold; }
.action-log-payment .resource_icon { display: inline-block; width: 21px; height: 21px; background-size: contain; }
</style>
