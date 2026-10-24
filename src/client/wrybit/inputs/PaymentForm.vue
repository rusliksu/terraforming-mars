<template>
<TabPanelFooterSlot>
<section class="payments_form" v-trim-whitespace>
  <div class="payments_prices">
    <!-- Balance block (payments.less): what you pay | total | what is left afterwards.
         One grid, so icons, numbers and "=" share an axis per column; every group title sits in row 1.
         With only one currency there is nothing to split: just the cost and what is left. -->
    <div class="payments_balance" :class="{'payments_balance--single': !hasCurrencyChoice}">
      <template v-if="hasCurrencyChoice">
        <span class="payments_group_title payments_group_title--cost" v-i18n>Costs</span>
        <span class="payments_group_title payments_group_title--total" v-i18n>Sum</span>
      </template>
      <span v-else class="payments_group_title payments_group_title--total" v-i18n>Costs</span>
      <span class="payments_group_title payments_group_title--rest" v-i18n>Left over</span>

      <template v-for="(unit, index) of visibleUnits" :key="unit">
        <template v-if="hasCurrencyChoice">
          <div class="payments_unit" :style="{gridRow: index + 2}">
            <PaymentUnitComponent
              v-model:count.number="valueFor(unit).value"
              :unit="unit"
              :description="binding.descriptions[unit]"
              :target="binding.target(unit)"
              :targetReached="binding.target(unit) === binding.payment[unit]"
              :minusDisabled="binding.payment[unit] <= 0"
              :plusDisabled="binding.payment[unit] >= binding.plusLimit(unit)"
              @plus="binding.plus(unit)"
              @minus="binding.minus(unit)"
              @max="binding.max(unit)"/>
            <div v-if="binding.ledger[unit]?.reserved" class="card-warning" v-i18n="$t(unit)">
            Some ${0} are reserved and unavailable here.</div>
          </div>
          <!-- Value of this row in M€; dimmed at 0 instead of empty, so the column stays calm -->
          <span class="payments_unit_subtotal" :class="{'payments_unit_subtotal--zero': binding.payment[unit] === 0}" :style="{gridRow: index + 2}">
            <span class="payments_equals">=</span>
            <span>{{ binding.ledger[unit].rate * binding.payment[unit] }}</span>
            <i class="resource_icon payments_type_smallicon resource_icon--megacredits"></i>
          </span>
        </template>
        <!-- What is left of this currency after paying, in the row of its currency -->
        <span class="payments_rest" :class="{'payments_rest--empty': restOf(unit) === 0}" :style="{gridRow: index + 2}" :data-test="'rest-' + unit">
          <span>{{ restOf(unit) }}</span>
          <i class="resource_icon payments_type_smallicon" :class="iconClass(unit)"></i>
        </span>
      </template>

      <!-- Total: only whether the split fits (green), falls short (red) or overpays (yellow) – the amounts are in the rows -->
      <div v-if="hasCurrencyChoice" class="payments_total" :class="binding.totalClass" :style="{gridRow: '2 / span ' + visibleUnits.length}">
        <span class="payments_total_value" :title="$t(binding.totalTitle)">
          <template v-if="binding.total === binding.cost">✓ <span v-i18n>Fits</span></template>
          <template v-else>
            <span>{{ Math.abs(binding.total - binding.cost) }}</span>
            <i class="resource_icon payments_type_smallicon resource_icon--megacredits"></i>
            <span v-if="binding.total < binding.cost" v-i18n>missing</span>
            <span v-else v-i18n>too much</span>
          </template>
        </span>
      </div>
      <div v-else class="payments_total payments_single" :style="{gridRow: '2 / span ' + visibleUnits.length}">
        <span class="payments_total_value">
          <span>{{ binding.cost }}</span>
          <i class="resource_icon payments_type_smallicon resource_icon--megacredits"></i>
        </span>
      </div>

      <span v-if="hasCurrencyChoice" class="payments_divider payments_divider--total" :style="{gridRow: '1 / span ' + (visibleUnits.length + 1)}"></span>
      <span class="payments_divider payments_divider--rest" :style="{gridRow: '1 / span ' + (visibleUnits.length + 1)}"></span>
    </div>

    <div v-if="binding.warning !== undefined" class="tm-warning">
      <label class="label label-error">{{ $t(binding.warning) }}</label>
    </div>
  </div>

  <div v-if="binding.showsave" class="payments_save">
    <AppButton size="big" @click="binding.save()" :title="$t(binding.buttonLabel)" data-test="save"/>
  </div>
  <SidebarModal :open="binding.confirmation !== undefined" :framed="true" @close="binding.dismissOverpayment()">
    <OverpaymentDialog v-if="binding.confirmation !== undefined" v-bind="binding.confirmation" :descriptions="binding.descriptions"
      @accept="binding.acceptOverpayment()" @dismiss="binding.dismissOverpayment()"/>
  </SidebarModal>
</section>
</TabPanelFooterSlot>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {WritableComputedRef} from 'vue';
import type {SpendableResource} from '@/common/inputs/Spendable';
import type {PaymentFormBinding} from './presentation';
import {paymentIconClass as iconClass} from '@/client/components/paymentIcon';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';
import PaymentUnitComponent from '@/client/wrybit/visuals/PaymentUnit.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import SidebarModal from '@/client/wrybit/visuals/SidebarModal.vue';
import OverpaymentDialog from '@/client/wrybit/visuals/OverpaymentDialog.vue';

const props = defineProps<{binding: PaymentFormBinding}>();
const values = new Map<SpendableResource, WritableComputedRef<number>>();
// Keep Vue's native .number conversion, including incomplete text edits.
function valueFor(unit: SpendableResource): WritableComputedRef<number> {
  let value = values.get(unit);
  if (value === undefined) {
    value = computed({get: () => props.binding.payment[unit], set: (amount) => props.binding.setValue(unit, amount)});
    values.set(unit, value);
  }
  return value;
}
const availableUnits = computed(() => props.binding.order.filter((unit) => props.binding.ledger[unit].available > 0));
const hasCurrencyChoice = computed(() => availableUnits.value.length > 1 || availableUnits.value.some((unit) => unit !== 'megacredits'));
// Keep our actual offered resource even when it is the only currency.
const visibleUnits = computed(() => availableUnits.value);
function restOf(unit: SpendableResource): number {
  return props.binding.ledger[unit].available - props.binding.payment[unit];
}
</script>
