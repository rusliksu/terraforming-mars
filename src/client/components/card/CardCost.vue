<template>
  <div>
    <div :class="getClasses()">{{ amount === null ? 0 : amount }}</div>
    <template v-if="displayTwoCosts()">
      <div class="card-cost-transition"></div>
      <div class="card-old-cost">{{ newCost }}</div>
    </template>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {getPreferences} from '@/client/utils/PreferencesManager';

export default defineComponent({
  name: 'CardCost',
  props: {
    amount: {
      type: Number as () => number | undefined,
      default: undefined,
    },
    newCost: {
      type: Number as () => number | undefined,
      default: undefined,
    },
    // High Orbit (fan): Infrastructure-tagged "Silver" cards' top-left number is a Titanium
    // cost, not M€ -- shows the titanium icon instead of the usual M€ coin.
    titanium: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    getClasses(): string {
      const classes = ['card-cost'];
      if (this.amount === undefined) {
        classes.push('visibility-hidden');
      }
      if (this.titanium) {
        classes.push('card-cost-titanium');
      }
      return classes.join(' ');
    },
    displayTwoCosts(): boolean {
      const hideDiscount = getPreferences().hide_discount_on_cards;
      return this.newCost !== undefined && this.newCost !== this.amount && !hideDiscount;
    },
  },
});

</script>

