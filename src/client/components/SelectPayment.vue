<template>
  <div class="payments_cont">
    <section>
      <h3 class="payments_title">{{ $t(playerinput.title) }}</h3>
      <PaymentForm
        ref="paymentForm"
        :cost="cost"
        :order="order"
        :ledger="ledger"
        :showsave="showsave"
        :buttonLabel="playerinput.buttonLabel"
        @change="(p) => payment = p"
        @save="doSave" />
    </section>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {Payment} from '@/common/inputs/Payment';
import {SpendableResource} from '@/common/inputs/Spendable';
import {PaymentWidgetMixin} from '@/client/mixins/PaymentWidgetMixin';
import {SelectPaymentModel} from '@/common/models/PlayerInputModel';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {SelectPaymentResponse} from '@/common/inputs/InputResponse';
import PaymentForm from '@/client/components/PaymentForm.vue';
import {Ledger} from '@/client/components/PaymentLedger';
import {Units} from '@/common/Units';
import {useSaveSession, withSaveAttempt} from '@/client/wrybit/inputs/saveAttempt';
import type {MaybePromise, SaveAttempt, SaveOutcome} from '@/client/wrybit/inputs/saveAttempt';

export default defineComponent({
  name: 'SelectPayment',
  setup() {
    return {saveSession: useSaveSession()};
  },
  mixins: [PaymentWidgetMixin],
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectPaymentModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: SelectPaymentResponse) => void,
      required: true,
    },
    showsave: {
      type: Boolean,
    },
    showtitle: {
      type: Boolean,
    },
  },
  computed: {
    order(): ReadonlyArray<keyof Payment> {
      return ([
        'steel',
        'titanium',
        'heat',
        'energy',
        'seeds',
        'auroraiData',
        'kuiperAsteroids',
        'spireScience',
        'megacredits',
      ] as const).filter(this.canUse);
    },
    ledger(): Ledger {
      return this.buildLedger(this.order, this.playerinput.reserveUnits ?? Units.EMPTY);
    },
  },
  components: {
    PaymentForm,
  },
  created() {
    this.cost = this.playerinput.amount;
  },
  methods: {
    canUse(unit: SpendableResource): boolean {
      if (unit === 'megacredits') {
        return true;
      }
      if (unit === 'titanium') {
        return this.playerinput.paymentOptions.titanium === true || this.playerinput.paymentOptions.lunaTradeFederationTitanium === true;
      }
      return this.playerinput.paymentOptions[unit] === true;
    },
    saveData(attempt?: SaveAttempt, respond?: (response: SelectPaymentResponse) => void): MaybePromise<SaveOutcome> {
      return withSaveAttempt(this.saveSession, attempt, (current) => {
        const paymentForm = this.$refs.paymentForm as InstanceType<typeof PaymentForm> | undefined;
        if (paymentForm !== undefined) {
          return paymentForm.handleSave(current, (payment) => this.doSave(payment, respond));
        }
        this.doSave(this.payment, respond);
        return 'saved';
      });
    },
    doSave(payment?: Payment, respond?: (response: SelectPaymentResponse) => void) {
      const reply = respond ?? this.onsave;
      reply({type: 'payment', payment: payment ?? this.payment});
    },
  },
});
</script>
