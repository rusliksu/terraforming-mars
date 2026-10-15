<template>
<component v-if="paymentPresentation !== undefined" :is="paymentPresentation" :binding="presentationBinding" />
<section v-else v-trim-whitespace>
  <table class="payments_table">
    <tbody>
      <tr>
        <td></td>
        <td v-trim-whitespace><i class="resource_icon payments_type_smallicon resource_icon--megacredits"></i></td>
      </tr>
      <template v-for="unit of order" :key="unit">
        <template v-if="ledger[unit]?.available > 0">
          <tr>
            <td>
              <PaymentUnitComponent
                v-model.number="payment[unit]"
                :unit="unit"
                :description="descriptions[unit]"
                :rate="ledger[unit].rate"
                @plus="addValue(unit)"
                @minus="reduceValue(unit)"
                @max="maxValue(unit)"/>
              <div v-if="ledger[unit]?.reserved" class="card-warning" v-i18n="$t(unit)">
              Some ${0} are reserved and unavailable here.</div>
            </td>
            <td class='payments_unit_subtotal' v-if="ledger[unit].rate !== undefined && payment[unit] !== 0" v-trim-whitespace>
              {{ ledger[unit].rate * payment[unit] }}
            </td>
          </tr>
        </template>
      </template>
    <tr :class="totalSpentClass()">
      <td class="payments_total_heading"></td>
      <td class="payments_total_value" :title="$t(totalSpentTitle())" :aria-label="$t(totalSpentTitle())" v-trim-whitespace>
        {{ totalSpent() }}
      </td>
    </tr>
    </tbody>
  </table>

  <div v-if="warning !== undefined" class="tm-warning">
    <label class="label label-error">{{ $t(warning) }}</label>
  </div>

  <div v-if="showsave" class="payments_save">
    <AppButton size="big" @click="handleSave()" :title="$t(buttonLabel)" data-test="save"/>
  </div>
</section>
</template>

<script lang="ts">
import {defineComponent, markRaw, watch} from 'vue';
import {Payment} from '@/common/inputs/Payment';
import {SpendableResource} from '@/common/inputs/Spendable';
import {getPreferences} from '@/client/utils/PreferencesManager';
import AppButton from '@/client/components/common/AppButton.vue';
import PaymentUnitComponent from '@/client/components/PaymentUnit.vue';
import {Ledger} from '@/client/components/PaymentLedger';
import {computeDefaultPayment} from '@/client/components/PaymentDefaults';
import {sum} from '@/common/utils/utils';
import {Message} from '@/common/logs/Message';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {PaymentFormBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import {useSaveSession, withSaveAttempt} from '@/client/wrybit/inputs/saveAttempt';
import type {MaybePromise, SaveAttempt, SaveOutcome} from '@/client/wrybit/inputs/saveAttempt';

const DESCRIPTIONS: Record<SpendableResource, string> = {
  steel: 'Steel',
  titanium: 'Titanium',
  heat: 'Heat',
  energy: 'Energy',
  seeds: 'Seeds',
  auroraiData: 'Data',
  kuiperAsteroids: 'Asteroids',
  spireScience: 'Science',
  megacredits: 'M€',
  floaters: 'Floaters',
  graphene: 'Graphene',
  lunaArchivesScience: 'Science',
  microbes: 'Microbes',
  plants: 'Plants',
  nereidMicrobes: 'Microbes',
  anyFloaters: 'Floaters',
};

function mapRecord<T extends string, U, V>(record: Record<T, U>, f: (value: U) => V): Record<T, V> {
  const entries: Array<[T, U]> = Object.entries(record) as Array<[T, U]>;
  const mapped: Array<[T, V]> = entries.map(([k, v]) => [k, f(v)]);
  return Object.fromEntries(mapped) as Record<T, V>;
}

const IN_SENTENCE_DESCRIPTIONS: Record<SpendableResource, string> = {
  ...mapRecord(DESCRIPTIONS, (v) => v.toLowerCase()),
  megacredits: 'M€',
};

type DataModel = {
  payment: Payment;
  warning: string | Message | undefined;
  pendingOverpayment: PendingOverpayment | undefined;
};

type PendingOverpayment = {
  attempt: SaveAttempt;
  signature: string;
  display: NonNullable<PaymentFormBinding['confirmation']>;
  respond: ((payment: Payment) => void) | undefined;
  resolve(outcome: SaveOutcome): void;
  cleanup(): void;
};

export default defineComponent({
  name: 'PaymentForm',
  setup() {
    const saveSession = useSaveSession();
    const paymentPresentation = useInputPresentation('paymentForm');
    watch(paymentPresentation, () => saveSession.cancel(), {flush: 'sync'});
    watch(() => getPreferences().show_alerts, () => saveSession.cancel(), {flush: 'sync'});
    return {paymentPresentation, saveSession};
  },
  components: {
    AppButton,
    PaymentUnitComponent,
  },
  props: {
    cost: {
      type: Number,
      required: true,
    },
    // Rename to something related to how it is both display order and documents the
    // resources in use.
    order: {
      type: Array as () => ReadonlyArray<SpendableResource>,
      required: true,
    },
    ledger: {
      type: Object as () => Ledger,
      required: true,
    },
    showsave: {
      type: Boolean,
      default: false,
    },
    buttonLabel: {
      type: String,
      required: true,
    },
    itemName: {type: String, default: undefined},
  },
  emits: ['save', 'change'],
  data(): DataModel {
    return {
      payment: computeDefaultPayment(this.cost, this.order, this.ledger, /* reserveMegacredits=*/ false),
      warning: undefined,
      pendingOverpayment: undefined,
    };
  },
  computed: {
    presentationBinding(): PaymentFormBinding {
      const pending = this.pendingOverpayment;
      return {
        confirmation: pending?.display,
        acceptOverpayment: () => {
          if (pending !== undefined) {
            this.acceptOverpayment(pending);
          }
        },
        dismissOverpayment: () => {
          if (pending !== undefined) {
            this.dismissOverpayment(pending);
          }
        },
        cost: this.cost, order: this.order, ledger: this.ledger, payment: this.payment,
        descriptions: this.descriptions, warning: this.warning, showsave: this.showsave, buttonLabel: this.buttonLabel,
        total: this.totalSpent(), totalClass: this.totalSpentClass(), totalTitle: this.totalSpentTitle(),
        target: (unit) => this.maxTarget(unit),
        plusLimit: (unit) => unit === 'megacredits' ? this.getMegaCreditsMax() : this.ledger[unit].available,
        setValue: (unit, value) => {
          this.payment[unit] = value;
        },
        plus: (unit) => this.addValue(unit), minus: (unit) => this.reduceValue(unit), max: (unit) => this.maxValue(unit),
        save: () => this.handleSave(),
      };
    },
    descriptions(): Record<SpendableResource, string> {
      return DESCRIPTIONS;
    },
    paymentContext(): string {
      return JSON.stringify([this.cost, this.itemName, this.payment, this.order.map((unit) =>
        [unit, this.ledger[unit].rate, this.ledger[unit].available, this.ledger[unit].reserved])]);
    },
  },
  watch: {
    paymentContext: {
      flush: 'sync',
      handler() {
        if (this.pendingOverpayment !== undefined) {
          this.saveSession.cancel();
        }
      },
    },
    payment: {
      deep: true,
      immediate: true,
      handler(val: Payment) {
        this.$emit('change', val);
      },
    },
  },
  methods: {
    /**
     * Returns the most MC necessary, capped by the cost of the payment.
     */
    getMegaCreditsMax(): number {
      return Math.min(this.ledger['megacredits'].available, this.cost);
    },
    addValue(unit: SpendableResource): void {
      // MC is special-cased because it's the currency being spent.
      if (unit === 'megacredits') {
        if (this.payment[unit] < this.getMegaCreditsMax()) {
          this.payment[unit] += 1;
        }
      } else {
        if (this.payment[unit] < this.ledger[unit].available) {
          this.payment[unit] += 1;
          this.setRemainingMCValue();
        }
      }
    },
    reduceValue(unit: SpendableResource): void {
      if (this.payment[unit] > 0) {
        this.payment[unit] -= 1;
        if (unit !== 'megacredits') {
          this.setRemainingMCValue();
        }
      }
    },
    setRemainingMCValue(): void {
      // Amount of money non-megacredit resources account for.
      const nonMCspend = this.totalSpent() - this.payment.megacredits;

      // Amount MC has to make up for
      const remainingMC = Math.max(0, this.cost - nonMCspend);

      // If MC has to make up for more than it has, this caps it.
      const megacredits = Math.min(this.ledger.megacredits.available, remainingMC);
      this.payment.megacredits = megacredits;
    },
    maxTarget(unit: SpendableResource): number {
      return Math.min(this.ledger[unit].available, Math.floor(this.cost / this.ledger[unit].rate));
    },
    maxValue(unit: SpendableResource): void {
      const target = this.maxTarget(unit);

      if (this.payment[unit] < target) {
        this.payment[unit] = target;

        if (unit !== 'megacredits') {
          this.setRemainingMCValue();
        } else {
          const saved = this.payment.megacredits;
          this.payment = computeDefaultPayment(this.cost, this.order, this.ledger, /* reserveMegacredits=*/ true);
          this.payment.megacredits = saved;
        }
      }
    },
    totalSpent(): number {
      return sum(this.order.map((unit) => this.payment[unit] * this.ledger[unit].rate));
    },
    handleSave(attempt?: SaveAttempt, respond?: (payment: Payment) => void): MaybePromise<SaveOutcome> {
      return withSaveAttempt(this.saveSession, attempt, (current) => this.validateAndSave(current, respond));
    },
    validateAndSave(current: SaveAttempt, respond?: (payment: Payment) => void, approvedSignature?: string): MaybePromise<SaveOutcome> {
      if (!current.isCurrent()) {
        return 'cancelled';
      }
      this.warning = undefined;
      const publish = (): SaveOutcome => {
        const payment = {...this.payment};
        if (respond !== undefined) {
          respond(payment);
        } else {
          this.$emit('save', payment);
        }
        return 'saved';
      };
      if (this.cost === 0) {
        return publish();
      }
      for (const unit of this.order) {
        if (this.payment[unit] > this.ledger[unit].available) {
          this.warning = {
            message: 'You do not have enough ${0}',
            data: [{type: LogMessageDataType.STRING, value: IN_SENTENCE_DESCRIPTIONS[unit]}],
          };
          return 'invalid';
        }
      }
      const delta = this.totalSpent() - this.cost;
      if (delta < 0) {
        this.warning = 'Haven\'t spent enough';
        return 'invalid';
      }
      if (delta > 0) {
        for (const unit of this.order) {
          if (this.payment[unit] > 0 && delta >= this.ledger[unit].rate) {
            this.warning = {
              message: 'You cannot overspend ${0}',
              data: [{type: LogMessageDataType.STRING, value: IN_SENTENCE_DESCRIPTIONS[unit]}],
            };
            return 'invalid';
          }
        }
        if (getPreferences().show_alerts && approvedSignature !== this.paymentContext) {
          if (this.paymentPresentation !== undefined) {
            return this.requestOverpayment(current, respond);
          }
          if (!confirm('Warning: You are overpaying by ' + delta + ' M€')) {
            this.warning = 'Please adjust payment amount';
            return 'cancelled';
          }
        }
      }
      return publish();
    },
    requestOverpayment(attempt: SaveAttempt, respond?: (payment: Payment) => void): Promise<SaveOutcome> {
      const signature = this.paymentContext;
      const ledger: Ledger = {...this.ledger};
      for (const unit of this.order) {
        ledger[unit] = {...this.ledger[unit]};
      }
      return new Promise((resolve) => {
        const abort = () => this.finishConfirmation('cancelled', pending);
        const pending: PendingOverpayment = markRaw({attempt, signature, respond, resolve,
          display: {cost: this.cost, payment: {...this.payment}, order: [...this.order], ledger, itemName: this.itemName},
          cleanup: () => attempt.signal.removeEventListener('abort', abort)});
        this.pendingOverpayment = pending;
        attempt.signal.addEventListener('abort', abort, {once: true});
      });
    },
    finishConfirmation(outcome: SaveOutcome, expected?: PendingOverpayment): void {
      const pending = this.pendingOverpayment;
      if (pending === undefined || (expected !== undefined && expected !== pending)) {
        return;
      }
      this.pendingOverpayment = undefined;
      pending.cleanup();
      if (outcome !== 'saved' && pending.attempt.isCurrent()) {
        this.saveSession.cancel();
      }
      pending.resolve(outcome);
    },
    acceptOverpayment(expected?: PendingOverpayment): void {
      const pending = this.pendingOverpayment;
      if (pending === undefined || (expected !== undefined && expected !== pending)) {
        return;
      }
      if (!pending.attempt.isCurrent() || pending.signature !== this.paymentContext) {
        this.finishConfirmation('cancelled', pending);
        return;
      }
      // Validate again against the current ledger, skipping only this exact confirmed snapshot.
      const result = this.validateAndSave(pending.attempt, pending.respond, pending.signature);
      if (result instanceof Promise) {
        result.then((outcome) => this.finishConfirmation(outcome, pending));
      } else {
        this.finishConfirmation(result, pending);
      }
    },
    dismissOverpayment(expected?: PendingOverpayment): void {
      if (this.pendingOverpayment === undefined || (expected !== undefined && expected !== this.pendingOverpayment)) {
        return;
      }
      this.warning = 'Please adjust payment amount';
      this.finishConfirmation('cancelled', expected);
    },
    totalSpentClass(): string {
      const total = this.totalSpent();
      if (total < this.cost) {
        return 'payments_total_under';
      } else if (total > this.cost) {
        return 'payments_total_over';
      } else {
        return 'payments_total_exact';
      }
    },
    totalSpentTitle(): string {
      const total = this.totalSpent();
      if (total < this.cost) {
        return 'Underpaying';
      } else if (total > this.cost) {
        return 'Overpaying';
      }
      return '';
    },
  },
});
</script>
