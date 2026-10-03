<template>
  <div :class="[getMainClasses(), { 'is-corporation': isCorporation() }]">
    <div v-if="isPrelude()" class="prelude-label">prelude</div>
    <div v-if="isCorporation()" class="corporation-label">corporation</div>
    <div v-if="isCeo()" class="ceo-label">CEO</div>
    <CardCorporationLogo v-if="isCorporation()" :title="title"/>
    <div v-else ref="title" :class="getClasses()">{{ displayTitleWithoutSuffix }}</div>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {CardType} from '@/common/cards/CardType';
import CardCorporationLogo from '@/client/components/card/CardCorporationLogo.vue';
import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {fitTextWhenReady} from '@/client/utils/textFit';

type Refs = {
  // Only rendered for non-corporation cards (corporations show a logo instead).
  title: HTMLElement | undefined;
};

export default defineComponent({
  name: 'CardTitle',
  props: {
    title: {
      type: String as () => CardName,
      required: true,
    },
    type: {
      type: String as () => CardType,
      required: true,
    },
    // DeimosDoubleDownCopy (sillyfication): overrides the displayed title (e.g. "<real
    // card name> Copy") without touching `title` itself, which stays the real CardName --
    // CardCorporationLogo and other consumers below still need the exact name.
    displayTitle: {
      type: String,
      default: undefined,
    },
    // High Orbit (fan): Infrastructure-tagged "Silver" cards render with a distinct silver
    // header regardless of CardType -- they still need to be ACTIVE/AUTOMATED for normal
    // tableau/action/tag semantics, so this is a visual override, not a type change.
    tags: {
      type: Array as () => Array<Tag>,
      default: () => [],
    },
  },
  components: {
    CardCorporationLogo,
  },
  mounted() {
    this.fitTitle();
  },
  watch: {
    // Re-fit if the title prop changes on a reused instance. Card lists are keyed
    // by name today, so this is insurance against an unkeyed or index-keyed list.
    title() {
      this.fitTitle();
    },
    displayTitle() {
      this.fitTitle();
    },
  },
  methods: {
    // Size the title to fit by measuring the rendered text rather than guessing
    // from its length. Corporations show a logo instead of a title element, so
    // nothing to fit.
    fitTitle(): void {
      if (this.isCorporation()) {
        return;
      }
      fitTextWhenReady(this.typedRefs.title, 'card-title');
    },
    isCeo(): boolean {
      return this.type === CardType.CEO;
    },
    isCorporation(): boolean {
      return this.type === CardType.CORPORATION;
    },
    isPrelude(): boolean {
      return this.type === CardType.PRELUDE;
    },
    isInfrastructure(): boolean {
      // Planetary Outpost (High Orbit, fan) is still visually a Silver card -- paid the same
      // native-Titanium way as the rest -- even though it deliberately carries no Infrastructure
      // tag (no Space>Infrastructure requirement either). See PlanetaryOutpost.ts.
      return this.tags.includes(Tag.INFRASTRUCTURE) || this.title === CardName.PLANETARY_OUTPOST;
    },
    getClasses(): string {
      const classes: Array<String> = ['card-title'];

      if (this.isInfrastructure()) {
        classes.push('background-color-infrastructure');
      } else if (this.type === CardType.AUTOMATED) {
        classes.push('background-color-automated');
      } else if (this.type === CardType.ACTIVE) {
        classes.push('background-color-active');
      } else if (this.type === CardType.EVENT) {
        classes.push('background-color-events');
      } else if (this.type === CardType.PRELUDE) {
        classes.push('background-color-prelude');
      } else if (this.type === CardType.CEO) {
        classes.push('background-color-ceo');
      } else if (this.type === CardType.STANDARD_PROJECT || this.type === CardType.STANDARD_ACTION) {
        classes.push('background-color-standard-project');
      }

      // The title is sized by measuring the rendered text (see fitTitle).
      return classes.join(' ');
    },
    getMainClasses() {
      const classes: Array<String> = ['card-title'];
      if (this.type === CardType.STANDARD_PROJECT || this.type === CardType.STANDARD_ACTION) {
        classes.push('card-title-standard-project');
      }
      return classes.join(' ');
    },
  },
  computed: {
    displayTitleWithoutSuffix(): string {
      return (this.displayTitle ?? this.title).split(':')[0];
    },
    typedRefs(): Refs {
      return this.$refs as unknown as Refs;
    },
  },
});

</script>
