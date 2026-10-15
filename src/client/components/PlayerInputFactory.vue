<template>
  <component :is="resolvedComponent"
    ref="childInput"
    :playerView="playerView"
    :playerinput="playerinput"
    :onsave="onsave"
    :showsave="showsave"
    :showtitle="showtitle" />
</template>

<script lang="ts">

import {Component, defineComponent, inject, provide, shallowRef, watch} from 'vue';
import {INPUT_DEPTH} from '@/client/wrybit/inputs/presentation';
import {afterSave, copyInputResponse, SAVE_SESSION, useSaveSession, withSaveAttempt} from '@/client/wrybit/inputs/saveAttempt';
import type {CollectedResponse, InputController, MaybePromise, SaveAttempt, SaveOutcome} from '@/client/wrybit/inputs/saveAttempt';
import {getPreferences} from '@/client/utils/PreferencesManager';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {PlayerInputModel} from '@/common/models/PlayerInputModel';
import {InputResponse} from '@/common/inputs/InputResponse';
import AndOptions from '@/client/components/AndOptions.vue';
import OrOptions from '@/client/components/OrOptions.vue';
import SelectAmount from '@/client/components/SelectAmount.vue';
import SelectCard from '@/client/components/SelectCard.vue';
import SelectPayment from '@/client/components/SelectPayment.vue';
import SelectProjectCardToPlay from '@/client/components/SelectProjectCardToPlay.vue';
import SelectInitialCards from '@/client/components/SelectInitialCards.vue';
import SelectOption from '@/client/components/SelectOption.vue';
import SelectPlayer from '@/client/components/SelectPlayer.vue';
import SelectSpace from '@/client/components/SelectSpace.vue';
import SelectDelegate from '@/client/components/SelectDelegate.vue';
import SelectParty from '@/client/components/SelectParty.vue';
import SelectColony from '@/client/components/SelectColony.vue';
import SelectProductionToLose from '@/client/components/SelectProductionToLose.vue';
import ShiftAresGlobalParameters from '@/client/components/ShiftAresGlobalParameters.vue';
import SelectGlobalEvent from '@/client/components/SelectGlobalEvent.vue';
import SelectResource from '@/client/components/SelectResource.vue';
import SelectResources from '@/client/components/SelectResources.vue';
import SelectClaimedUndergroundToken from '@/client/components/SelectClaimedUndergroundToken.vue';
import DeltaProjectInput from '@/client/components/delta/DeltaProjectInput.vue';

// Shared contract every input component must satisfy. `playerinput` and
// `onsave` are narrowed to the discriminated variant whose `type` matches K.
type InputComponentProps<K extends PlayerInputModel['type']> = {
  playerView: PlayerViewModel;
  playerinput: Extract<PlayerInputModel, {type: K}>;
  onsave: (out: Extract<InputResponse, {type: K}>) => void;
  showsave: boolean;
  showtitle?: boolean;
};

type InputComponentRegistry = {
  [K in PlayerInputModel['type']]: Component<InputComponentProps<K>>;
};

// `satisfies` makes the type checker verify that every registered component
// accepts the common props (including `playerView`). If a component drops or
// renames a shared prop, this fails at compile time.
const inputComponents = {
  'and': AndOptions,
  'or': OrOptions,
  'amount': SelectAmount,
  'card': SelectCard,
  'colony': SelectColony,
  'delegate': SelectDelegate,
  'globalEvent': SelectGlobalEvent,
  'initialCards': SelectInitialCards,
  'option': SelectOption,
  'party': SelectParty,
  'payment': SelectPayment,
  'player': SelectPlayer,
  'projectCard': SelectProjectCardToPlay,
  'space': SelectSpace,
  'productionToLose': SelectProductionToLose,
  'aresGlobalParameters': ShiftAresGlobalParameters,
  'resource': SelectResource,
  'resources': SelectResources,
  'claimedUndergroundToken': SelectClaimedUndergroundToken,
  'deltaProject': DeltaProjectInput,
} satisfies InputComponentRegistry;

type DraftFields = {
  [K in PlayerInputModel['type']]: ReadonlyArray<Extract<keyof InstanceType<(typeof inputComponents)[K]>['$data'], string>>;
};

// Only response-bearing draft fields: warnings, DOM handles and timers never invalidate a confirmation.
const draftFields = {
  and: [], or: ['selectedOption', 'selectedIdx'], amount: ['amount'], card: ['cards'], colony: ['selectedColony'],
  delegate: ['selectedPlayer'], globalEvent: ['selected'], initialCards: ['selectedCards', 'selectedCeos', 'selectedCorporations', 'selectedPreludes'],
  option: [], party: ['selectedParty'], payment: ['payment'], player: ['selectedPlayer'], projectCard: ['cardName', 'payment'],
  space: ['selectedSpaceId', 'spaceId'], productionToLose: ['units'],
  aresGlobalParameters: ['lowOceanDelta', 'highOceanDelta', 'temperatureDelta', 'oxygenDelta'],
  resource: ['unit'], resources: ['units'], claimedUndergroundToken: ['selected'], deltaProject: ['amount'],
} satisfies DraftFields;

export default defineComponent({
  name: 'PlayerInputFactory',
  setup(props) {
    provide(INPUT_DEPTH, inject(INPUT_DEPTH, 0) + 1);
    const session = useSaveSession();
    provide(SAVE_SESSION, session);
    const childInput = shallowRef<InputController>();
    watch(() => childInput.value === undefined ? undefined : JSON.stringify(draftFields[props.playerinput.type].map((field) => childInput.value?.$data[field])),
      (next, previous) => {
        if (previous !== undefined && next !== previous) {
          session.cancel();
        }
      }, {flush: 'sync'});
    watch(() => getPreferences().experimental_layout, () => session.cancel(), {flush: 'sync'});

    function collectResponse(attempt: SaveAttempt): MaybePromise<CollectedResponse> {
      if (!attempt.isCurrent()) {
        return {outcome: 'cancelled'};
      }
      const child = childInput.value;
      if (child === undefined) {
        return {outcome: 'invalid'};
      }
      let open = true;
      let count = 0;
      let response: InputResponse | undefined;
      const respond = (value: InputResponse) => {
        if (open && attempt.isCurrent()) {
          count++;
          response = copyInputResponse(value);
        }
      };
      const complete = (outcome: SaveOutcome | void): CollectedResponse => {
        open = false;
        if (!attempt.isCurrent()) {
          return {outcome: 'cancelled'};
        }
        if (outcome === 'invalid' || outcome === 'cancelled') {
          return {outcome};
        }
        return count === 1 && response !== undefined ? {outcome: 'saved', response} : {outcome: 'invalid'};
      };
      try {
        const result = child.saveData(attempt, respond);
        if (result instanceof Promise) {
          return result.then(complete, (error) => {
            open = false; throw error;
          });
        }
        return complete(result);
      } catch (error) {
        open = false;
        throw error;
      }
    }

    function saveData(attempt?: SaveAttempt): MaybePromise<SaveOutcome> {
      return withSaveAttempt(session, attempt, (current) => afterSave(collectResponse(current), (collected) => {
        if (collected.outcome === 'saved') {
          props.onsave(collected.response);
        }
        return collected.outcome;
      }));
    }
    return {childInput, collectResponse, saveData};
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => PlayerInputModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: InputResponse) => void,
      required: true,
    },
    showsave: {
      type: Boolean,
      required: true,
    },
    showtitle: {
      type: Boolean,
      default: true,
    },
  },
  methods: {
    canSave(): boolean {
      const canSave = this.typedRefs.childInput.canSave;
      return canSave ? canSave() : true;
    },
  },
  computed: {
    typedRefs(): {childInput: InputController} {
      return this.$refs as unknown as {childInput: InputController};
    },
    resolvedComponent(): Component {
      const input = this.playerinput;
      return inputComponents[input.type];
    },
  },
});
</script>
