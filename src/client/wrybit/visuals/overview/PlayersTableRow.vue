<template>
  <div :class="rowClasses" @click="toggleCards">
    <!-- The whole row is clickable and opens the played cards (like the classic player bar) -->
    <!-- First player as "1" in the color bar so the name row has room for name and status -->
    <span v-if="firstForGen && playerView.players.length > 1" class="players-table-first-player" :title="$t('First player')" data-test="first-player">1</span>
    <PlayerIdentity :readOnly="readOnly" :player="player" :playerView="playerView" :actionLabel="actionLabel" :highlighted="isThisPlayer" />

    <!-- Section order from PlayersTable (desktop: goods, tags, scoring; mobile: goods, scoring, tags) -->
    <template v-for="section in sectionOrder" :key="section">
      <template v-if="section === 'goods' && visibility.goods">
        <div class="players-table-divider"></div>
        <PlayersTableGoods v-for="(good, index) in goods" :key="good.type" :good="good" :color="player.color" :isProductionLeader="productionLeaders.includes(good.type)" :boxWidth="goodsBoxWidths[index] ?? 0" />
      </template>

      <template v-if="section === 'tags' && visibility.tags">
        <div class="players-table-divider"></div>
        <template v-for="(group, groupIndex) in tagColumns" :key="groupIndex">
          <div v-if="groupIndex > 0"></div>
          <div class="players-table-cell" v-for="tag in group" :key="tag" :data-test="'tag-' + tag">
            <span :class="tagCounterClasses(tag)"><span v-if="protectedTags.includes(tag)" class="players-table-protection shield_icon" :data-test="'protection-' + tag"></span>{{ tagDetail(tag).count || '·' }}<PlayerTagSubstitution v-if="tagDetail(tag).substitution !== undefined" :tag="tagDetail(tag).substitution!" :data-test="'substitution-' + tag" /></span>
            <span v-if="tagDetail(tag).discount > 0" class="players-table-discount" :data-test="'discount-' + tag" :title="$t('Discount')">-{{ tagDetail(tag).discount }}</span>
            <PointsPerTag :points="tagDetail(tag)" />
          </div>
        </template>
      </template>

      <template v-if="section === 'score' && visibility.score">
        <div class="players-table-divider"></div>
        <div class="players-table-cell"><span class="players-table-counter" data-test="vp">{{ victoryPoints }}</span></div>
        <div class="players-table-cell"><span class="players-table-counter" data-test="tr">{{ player.terraformRating }}</span></div>
        <div class="players-table-cell">
          <span class="players-table-counter" data-test="hand">{{ player.cardsInHandNbr ?? 0 }}</span>
          <span v-if="handDiscount !== ''" :class="['players-table-discount', {'players-table-discount--wide': handDiscount.length > 1}]" data-test="discount-all" :title="handDiscountTitle">{{ handDiscount.replace('*', '') }}<b v-if="handDiscount.endsWith('*')" class="players-table-discount-mark">*</b></span>
        </div>
        <div class="players-table-cell">
          <span :class="['players-table-counter', {'players-table-counter--zero': player.availableBlueCardActionCount === 0}]" data-test="actions">{{ player.availableBlueCardActionCount }}</span>
        </div>
      </template>
    </template>

    <div class="players-table-divider"></div>
    <div class="players-table-cell">
      <!-- No own click handler: the click bubbles up to the row; the button stays for keyboard use -->
      <button type="button" class="players-table-played" :aria-label="$t('Played cards')" data-test="played-cards">{{ player.tableau.length }}</button>
    </div>

    <!-- When the wide table has to hide the tag columns, keep the played tags visible below the row.
         The old panel was dropped here because the remaining four numbers said nothing about tags. -->
    <div v-if="!visibility.tags && tagStrip.length > 0" class="players-table-tag-strip" data-test="tags-strip">
      <span v-for="tag in tagStrip" :key="tag" class="players-table-tag-strip-item" :title="$t(tag)">
        <Tag :tag="tag" size="small" type="secondary" />
        <span :class="['players-table-tag-strip-count', {'players-table-tag-strip-count--zero': tagDetail(tag).count === 0}]">{{ tagDetail(tag).count }}</span>
      </span>
    </div>

    <div v-if="!visibility.goods" class="players-table-goods-strip" data-test="goods-strip">
      <span v-for="good in goods" :key="good.type" class="players-table-goods-strip-item" :title="$t(good.type)">
        <span :class="['resource_icon', 'resource_icon--' + good.type]"></span>
        <b>{{ good.count }}</b>
        <small v-if="good.production !== 0 || good.value > 0">{{ good.production }}<template v-if="good.value > 0">×{{ good.value }}</template></small>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {ViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {ActionLabel} from '@/client/components/overview/ActionLabel';
import PlayerIdentity from '@/client/wrybit/visuals/overview/PlayerIdentity.vue';
import PlayersTableGoods from '@/client/wrybit/visuals/overview/PlayersTableGoods.vue';
import PointsPerTag from '@/client/components/overview/PointsPerTag.vue';
import PlayerTagSubstitution from '@/client/components/overview/PlayerTagSubstitution.vue';
import Tag from '@/client/components/Tag.vue';
import {Tag as CardTag} from '@/common/cards/Tag';
import {PlayerGood, playerGoods} from '@/client/wrybit/visuals/overview/playerGoods';
import {protectedTagsOf} from '@/client/wrybit/visuals/overview/protectedTags';
import {InterfaceTagsType, TagDetail, TagDetails, handDiscountLabel, isVictoryPointCountHidden} from '@/client/wrybit/visuals/overview/playerTagDetails';
import {DESKTOP_SECTION_ORDER, SectionVisibility, TableSection, TagColumnGroups} from '@/client/wrybit/visuals/overview/playersTableLayout';
import {togglePlayerCards} from '@/client/wrybit/visuals/common/playerCardsToggle';
import {vueRoot} from '@/client/components/vueRoot';

export default defineComponent({
  name: 'PlayersTableRow',
  directives: {
  },
  components: {
    PlayerIdentity,
    PlayersTableGoods,
    PointsPerTag,
    PlayerTagSubstitution,
    Tag,
  },
  props: {
    readOnly: {type: Boolean, default: false},
    player: {
      type: Object as () => PublicPlayerModel,
      required: true,
    },
    playerView: {
      type: Object as () => ViewModel,
      required: true,
    },
    firstForGen: {
      type: Boolean,
      default: false,
    },
    actionLabel: {
      type: String as () => ActionLabel,
      required: true,
    },
    playerIndex: {
      type: Number,
      required: true,
    },
    visibility: {
      type: Object as () => SectionVisibility,
      required: true,
    },
    // Section order (playersTableLayout.ts: sectionOrder)
    sectionOrder: {
      type: Array as () => ReadonlyArray<TableSection>,
      default: () => DESKTOP_SECTION_ORDER,
    },
    tagColumns: {
      type: Array as () => TagColumnGroups,
      required: true,
    },
    // Compact strip used when the tag columns are auto-hidden; all game tags, no VP/TR specials.
    tagStrip: {
      type: Array as () => ReadonlyArray<CardTag>,
      default: () => [],
    },
    tagDetails: {
      type: Object as () => TagDetails,
      required: true,
    },
    // Goods where this player alone has the highest production
    productionLeaders: {
      type: Array as () => Array<PlayerGood['type']>,
      default: () => [],
    },
    // Box width per resource column (PlayersTable: goodsBoxWidths); 0 = standard width
    goodsBoxWidths: {
      type: Array as () => ReadonlyArray<number>,
      default: () => [],
    },
  },
  computed: {
    isThisPlayer(): boolean {
      return this.player.color === this.playerView.thisPlayer?.color;
    },
    rowClasses(): Array<string> {
      const classes = ['players-table-row', 'players-table-row--player', 'players-table-row--' + this.player.color, 'player_translucent_bg_color_' + this.player.color];
      if (this.isThisPlayer) {
        classes.push('players-table-row--me');
      }
      return classes;
    },
    goods(): Array<PlayerGood> {
      return playerGoods(this.player, this.playerView.game.gameOptions.expansions.conglomerates);
    },
    protectedTags(): ReadonlyArray<InterfaceTagsType> {
      return protectedTagsOf(this.player);
    },
    // Hand discount badge, with * when some cards get an extra discount (e.g. Cutting Edge Technology)
    handDiscount(): string {
      return handDiscountLabel(this.tagDetails);
    },
    handDiscountTitle(): string {
      const lines = [this.$t('Discount')];
      if (this.tagDetails.conditionalDiscounts.length > 0) {
        lines.push(this.$t('* Additional discounts:'));
        for (const discount of this.tagDetails.conditionalDiscounts) {
          lines.push(`-${discount.amount} ${this.$t(discount.appliesTo)} (${this.$t(discount.source)})`);
        }
      }
      return lines.join('\n');
    },
    victoryPoints(): number | string {
      return isVictoryPointCountHidden(this.player, this.playerView) ? '?' : this.player.victoryPointsBreakdown.total;
    },
  },
  methods: {
    tagDetail(tag: InterfaceTagsType): TagDetail {
      // Every visible column has an entry – the columns come from the same order
      return this.tagDetails.tagsInOrder.find((detail) => detail.name === tag) as TagDetail;
    },
    tagCounterClasses(tag: InterfaceTagsType): Array<string> {
      const classes = ['players-table-counter'];
      if (this.protectedTags.includes(tag)) {
        classes.push('players-table-protected');
      } else if (this.tagDetail(tag).count === 0) {
        classes.push('players-table-counter--zero');
      }
      return classes;
    },
    toggleCards() {
      togglePlayerCards(vueRoot(this), this.playerIndex, this.playerView.players.length);
    },
  },
});
</script>
