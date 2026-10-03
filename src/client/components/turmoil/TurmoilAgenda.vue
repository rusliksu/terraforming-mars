<template>
  <div>
    <div class="agenda-icon" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
    <template v-if="morePartiesExpansion && id === 'mb01'">
      <div class="resource money party-resource">1</div> /
      <div class="resource-tag tag-building party-resource-tag"></div>
      <div class="resource-tag tag-mars party-resource-tag"></div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'mp02'">
      <span class="money resource">22</span>
      <span class="red-arrow"></span>
      <div class="tile city-tile tile-size--S"></div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'mp03'">
      <div class="policy-top-margin">
      <div class="resource-tag tag-building party-resource-tag"></div>
      <div class="resource-tag tag-mars party-resource-tag"></div> : <div class="resource money">2</div>
      </div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'mp04'">
      <span class="money resource">4</span>
      <span class="red-arrow"></span>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-building"></div></div>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-mars"></div></div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'sp01'">
      <div class="policy-top-margin">
      +2 <div class="resource-tag tag-science party-resource-tag"></div>
      </div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'sp03'">
      <span>
        <div class="tile oxygen-tile req-tile-small" style="margin: 10px -5px;"></div>
        <div class="tile ocean-tile req-tile-small"></div>
        <div class="tile temperature-tile req-tile-small"></div>
        : <div class="resource card card-with-border"></div> /
        <div class="resource card card-with-border red-outline"></div>
      </span>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'sp04'">
      <span class="money resource">4</span>
      <span class="red-arrow"></span>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-science"></div></div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'ub02'">
      <div class="resource money party-resource">1</div> /
      <div class="resource-tag tag-space party-resource-tag"></div>
      <div class="production-box party-production-box"><div class="titanium production"></div></div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'up02'">
      <div class="policy-top-margin">
      <span class="money resource">10</span>
      <span class="red-arrow"></span>
      <div class="tile fleet tile-size--S"></div>
      </div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'up03'">
      <div class="policy-top-margin">
      +2 <div class="resource-tag tag-space party-resource-tag"></div>
      </div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'up04'">
      <span class="money resource">4</span>
      <span class="red-arrow"></span>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-venus"></div></div>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-space"></div></div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'kb02'">
      <div class="resource money party-resource">2</div> /
      <div class="tile temperature-tile req-tile-small"></div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'kp01'">
      <div class="tile temperature-tile req-tile-small" style="margin-right:5px;"></div> : <span class="money resource">3</span>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'kp02'">
      <div class="policy-top-margin">
      <div class="production-box party-production-box">
        <div class="production-prefix minus"></div><div class="heat production"></div><div class="heat production"></div>
      </div>
      <span class="red-arrow"></span>
      <div class="rating tile party-rating party-tile"></div>
      </div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'kp03'">
      <span class="money resource">9</span>
      <span class="red-arrow"></span>
      <div class="production-box party-production-box">
        <div class="heat production"></div><div class="heat production"></div>
      </div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'rb02'">
      <div class="party-inferior-rating tile party-rating party-tile">&lt;</div>
      <div class="tile empty-tile tile-size--S"></div> :
      <div class="rating tile party-rating party-tile"></div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'rp02'">
      <div class="policy-top-margin"><span v-i18n>Standard Project</span> : <div class="resource card card-with-border red-outline"></div></div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'rp03'">
      <div class="policy-top-margin"><div class="tile empty-tile tile-size--S"></div> : <span class="money resource">-3</span></div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'gp03'">
      <div class="policy-top-margin">
      <div class="resource-tag tag-plant party-resource-tag"></div>
      <div class="resource-tag tag-microbe party-resource-tag"></div>
      <div class="resource-tag tag-animal party-resource-tag"></div> : <span class="plant resource"></span>
      </div>
    </template>
    <template v-else-if="morePartiesExpansion && id === 'gp04'">
      <span class="money resource">4</span>
      <span class="red-arrow"></span>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-plant"></div></div>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-animal"></div></div>
    </template>
    <template v-else-if="id === 'mb01'">
      <div class="resource money party-resource">1</div> /
      <div class="resource-tag tag-building party-resource-tag"></div>
    </template>
    <template v-else-if="id === 'mb02'">
      <div class="resource money party-resource">1</div> /
      <div class="tile empty-tile tile-size--S"></div>ON MARS
    </template>
    <template v-else-if="id === 'sb01'">
      <div class="resource money party-resource">1</div> /
      <div class="resource-tag tag-science party-resource-tag"></div>
    </template>
    <template v-else-if="id === 'sb02'">
      <div class="resource money party-resource">1</div> / 3
      <div class="resource card card-small"></div>
    </template>
    <template v-else-if="id === 'ub01'">
      <div class="resource money party-resource">1</div> /
      <div class="resource-tag tag-venus party-resource-tag"></div>
      <div class="resource-tag tag-earth party-resource-tag"></div>
      <div class="resource-tag tag-jovian party-resource-tag"></div>
    </template>
    <template v-else-if="id === 'ub02'">
      <div class="resource money party-resource">1</div> /
      <div class="resource-tag tag-space party-resource-tag"></div>
    </template>
    <template v-else-if="id === 'kb01'">
      <div class="resource money party-resource">1</div> /
      <div class="production-box party-production-box">
        <div class="heat production"></div>
      </div>
    </template>
    <template v-else-if="id === 'kb02'">
      <div class="resource heat party-resource"></div> /
      <div class="production-box party-production-box">
        <div class="heat production"></div>
      </div>
    </template>
    <template v-else-if="id === 'rb01'">
      <div class="party-inferior-rating tile party-rating party-tile">&lt;</div> :
      <div class="rating tile party-rating party-tile"></div>
    </template>
    <template v-else-if="id === 'rb02'">
      <div class="party-inferior-rating tile party-rating party-tile">&gt;</div> :
      <div class="rating tile party-rating party-tile red-outline "></div>
    </template>
    <template v-else-if="id === 'gb01'">
      <div class="resource money party-resource">1</div> /
      <div class="resource-tag tag-plant party-resource-tag"></div>
      <div class="resource-tag tag-microbe party-resource-tag"></div>
      <div class="resource-tag tag-animal party-resource-tag"></div>
    </template>
    <template v-else-if="id === 'gb02'">
      <div class="resource money party-resource">2</div> /
      <div class="tile greenery-tile-turmoil greenery-tile-small"></div>
    </template>
    <template v-else-if="id === 'mp01'">
      <div class="policy-top-margin"><div v-if="showPartyBadge" :class="partyBadgeClass" v-i18n></div><div class="tile empty-tile tile-size--S"></div> : <span class="steel resource"></span></div>
    </template>
    <template v-else-if="id === 'mp02'">
      <div class="policy-top-margin"><div class="resource-tag tag-building"></div> : <div class="money resource">2</div></div>
    </template>
    <template v-else-if="id === 'mp03'">
      <div class="policy-top-margin"><div class="resource steel"></div> : +<div class="resource money">1</div></div>
    </template>
    <template v-else-if="id === 'mp04'">
      <span class="money resource">4</span>
      <span class="red-arrow-3x"></span>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-building"></div></div>
    </template>
    <template v-else-if="id === 'sp01'">
      <span v-if="showPartyBadge" :class="partyBadgeClass" v-i18n></span>
      <span class="money resource">10</span>
      <span class="red-arrow"></span>
      <span class="card card-with-border resource party-resource"></span>
      <span class="card card-with-border resource party-resource"></span>
      <span class="card card-with-border resource party-resource"></span>
    </template>
    <template v-else-if="id === 'sp02'">
      <span>
        <div class="tile oxygen-tile req-tile-small" style="margin: 10px -5px;"></div>
        <div class="tile ocean-tile req-tile-small"></div>
        <div class="tile temperature-tile req-tile-small"></div>
        : ± 2
      </span>
    </template>
    <template v-else-if="id === 'sp03'">
      <span>
        <div class="tile oxygen-tile req-tile-small" style="margin: 10px -5px;"></div>
        <div class="tile ocean-tile req-tile-small"></div>
        <div class="tile temperature-tile req-tile-small"></div>
        : <div class="resource card card-with-border"></div>
      </span>
    </template>
    <template v-else-if="id === 'sp04'">
      <div class="scientists-requisite"><div class="resource-tag tag-science party-resource-tag"></div></div>
    </template>
    <template v-else-if="id === 'up01'">
      <div class="policy-top-margin"><div v-if="showPartyBadge" :class="partyBadgeClass" v-i18n></div><div class="resource titanium"></div> : + <div class="resource money">1</div></div>
    </template>
    <template v-else-if="id === 'up02'">
      <div class="policy-top-margin">
      <span class="money resource">4</span>
      <span class="red-arrow-3x"></span>2<span class="titanium resource"></span> / 2<span class="floater resource"></span>
      </div>
    </template>
    <template v-else-if="id === 'up03'">
      <span class="money resource">4</span>
      <span class="red-arrow-3x"></span>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-space"></div></div>
    </template>
    <template v-else-if="id === 'up04'">
      <div class="policy-top-margin"><div class="resource-tag tag-space"></div> : <div class="money resource">-2</div></div>
    </template>
    <template v-else-if="id === 'kp01'">
      <span v-if="showPartyBadge" :class="partyBadgeClass" v-i18n></span>
      <span class="money resource">10</span>
      <span class="red-arrow-infinity"></span>
      <div class="production-box production-box-size2">
        <div class="energy production"></div>
        <div class="heat production"></div>
      </div>
    </template>
    <template v-else-if="id === 'kp02'">
      <div class="tile temperature-tile req-tile-small" style="margin-right:5px;"></div> : <span class="money resource">3</span>
    </template>
    <template v-else-if="id === 'kp03'">
      6 <span class="heat resource"></span>
      <span class="red-arrow-infinity"></span>
      <div class="tile temperature-tile"></div>
    </template>
    <template v-else-if="id === 'kp04'">
      <div class="policy-top-margin"><div class="tile empty-tile tile-size--S"></div> :
      <span class="heat resource"></span><span class="heat resource"></span></div>
    </template>
    <template v-else-if="id === 'rp01'">
      <div class="policy-top-margin">
      <div v-if="showPartyBadge" :class="partyBadgeClass" v-i18n></div>
      <div class="rating tile"></div> :
      <div class="resource money">-3</div>
      </div>
    </template>
    <template v-else-if="id === 'rp02'">
      <div class="policy-top-margin"><div class="tile empty-tile tile-size--S"></div> : <span class="money resource">-3</span></div>
    </template>
    <template v-else-if="id === 'rp03'">
      <span class="money resource">4</span>
      <span class="red-arrow-3x"></span>
      <div class="tile oxygen-tile req-tile-small red-outline" style="margin: 10px -5px;"></div> /
      <div class="tile ocean-tile req-tile-small red-outline"></div> /
      <div class="tile temperature-tile req-tile-small red-outline"></div>
    </template>
    <template v-else-if="id === 'rp04'">
      <div class="tile oxygen-tile req-tile-small" style="margin: 10px -5px;"></div>
      <div class="tile ocean-tile req-tile-small"></div>
      <div class="tile temperature-tile req-tile-small"></div>
      : <div class="production-box production-box-size2" style="margin-left:5px;">
        <div class="production-prefix minus"></div><div class="money production">1</div>
      </div>
    </template>
    <template v-else-if="id === 'gp01'">
      <div v-if="showPartyBadge" :class="partyBadgeClass" v-i18n></div>
      <div class="tile greenery-tile-turmoil"></div> : <div class="resource money">4</div>
    </template>
    <template v-else-if="id === 'gp02'">
      <div class="policy-top-margin"><div class="tile empty-tile tile-size--S"></div> : <span class="plant resource"></span></div>
    </template>
    <template v-else-if="id === 'gp03'">
      <div class="policy-top-margin">
      <div class="resource-tag tag-plant party-resource-tag"></div>
      <div class="resource-tag tag-microbe party-resource-tag"></div>
      <div class="resource-tag tag-animal party-resource-tag"></div> : <div class="resource money">2</div>
      </div>
    </template>
    <template v-else-if="id === 'gp04'">
      <div class="policy-top-margin">
      <span class="money resource">5</span>
      <span class="red-arrow-3x"></span>3<span class="plant resource"></span> / 2<span class="microbe resource"></span>
      </div>
    </template>
    <template v-else-if="id === 'popb01'">
      <div class="resource money party-resource">1</div> /
      <div class="resource-tag tag-event party-resource-tag"></div>
    </template>
    <template v-else-if="id === 'popb02'">
      <div class="party-inferior-rating tile party-rating party-tile">&gt;</div>
      <div class="resource-tag tag-event party-resource-tag"></div> :
      <div class="rating tile party-rating party-tile"></div>
    </template>
    <template v-else-if="id === 'popp01'">
      <div class="policy-top-margin">VP : x2 <span class="money resource"></span></div>
    </template>
    <template v-else-if="id === 'popp02'">
      <span class="money resource">5</span>
      <span class="red-arrow"></span>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-event"></div></div>
    </template>
    <template v-else-if="id === 'popp03'">
      <div class="policy-top-margin">
      <div class="resource-tag tag-event party-resource-tag"></div> : <div class="resource card card-with-border"></div>
      </div>
    </template>
    <template v-else-if="id === 'popp04'">
      <span class="money resource">4</span>
      <span class="red-arrow"></span>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-event"></div></div>
    </template>
    <template v-else-if="id === 'spob01'">
      <div class="resource money party-resource">1</div> /
      <div class="tile card-tile-lunar-habitat"></div>
    </template>
    <template v-else-if="id === 'spob02'">
      <div class="resource money party-resource">1</div> /
      <div class="tile city-tile tile-size--S"></div>
      <div class="resource-tag tag-colony-count party-resource-tag"></div>
    </template>
    <template v-else-if="id === 'spop01'">
      <div class="policy-top-margin"><div class="tile city-tile tile-size--S"></div> : <div class="resource card card-with-border"></div></div>
    </template>
    <template v-else-if="id === 'spop02'">
      <div class="policy-top-margin"><div class="tile card-tile-lunar-habitat"></div> : <span class="money resource">4</span></div>
    </template>
    <template v-else-if="id === 'spop03'">
      <span class="money resource">15</span>
      (<span class="titanium resource"></span>)
      <span class="red-arrow"></span>
      <div class="resource-tag tag-colony-count party-resource-tag"></div>
    </template>
    <template v-else-if="id === 'empb01'">
      <div class="resource money party-resource">1</div> /
      <div class="resource-tag tag-power party-resource-tag"></div>
      <div class="resource-tag tag-none party-resource-tag"></div>
    </template>
    <template v-else-if="id === 'empb02'">
      <div class="resource money party-resource">1</div> /
      <div class="production-box party-production-box"><div class="energy production"></div></div>
    </template>
    <template v-else-if="id === 'empp01'">
      <div class="policy-top-margin">
      <span class="energy resource">1</span> = <span class="money resource">2</span>
      </div>
    </template>
    <template v-else-if="id === 'empp02'">
      <div class="policy-top-margin">
      <div class="production-box party-production-box"><div class="energy production"></div></div>
      : 2<span class="energy resource"></span>
      </div>
    </template>
    <template v-else-if="id === 'empp03'">
      <div class="policy-top-margin">
      +2 <div class="resource-tag tag-power party-resource-tag"></div>
      </div>
    </template>
    <template v-else-if="id === 'empp04'">
      <span class="money resource">4</span>
      <span class="red-arrow"></span>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-power"></div></div>
    </template>
    <template v-else-if="id === 'burb01'">
      <div class="policy-top-margin"><span class="money resource">2</span> / delegate</div>
    </template>
    <template v-else-if="id === 'burb02'">
      <div class="policy-top-margin"><span class="money resource">2</span> / <div class="influence" style="width: 24px; height: 24px; background-size: 24px 24px;"></div></div>
    </template>
    <template v-else-if="id === 'burp01'">
      <span class="money resource">5</span>
      <span class="red-arrow"></span>
      <div class="resource card card-with-border" style="background: linear-gradient(-60deg, #208cdf 10%, #4da3e6, #208cdf 90%);"></div>
    </template>
    <template v-else-if="id === 'burp02'">
      <div class="policy-top-margin">
      <span class="money resource">3</span> - <div class="influence" style="width: 24px; height: 24px; background-size: 24px 24px;"></div>
      </div>
    </template>
    <template v-else-if="id === 'burp03'">
      <div class="policy-top-margin">delegate : <span class="money resource">3</span></div>
    </template>
    <template v-else-if="id === 'burp04'">
      <div class="policy-top-margin"><div class="resource card card-with-border"></div> : <div class="resource card card-with-border red-outline"></div></div>
    </template>
    <template v-else-if="id === 'cenb01'">
      <div class="resource money party-resource">1</div> /
      <div class="resource-tag tag-diverse party-resource-tag"></div>
    </template>
    <template v-else-if="id === 'cenb02'">
      <div class="resource money party-resource">2</div> /
      <div class="tile empty-tile tile-size--S"></div>
    </template>
    <template v-else-if="id === 'cenp01'">
      <div class="policy-top-margin">1 of each <span class="red-arrow"></span> <span class="money resource">15</span></div>
    </template>
    <template v-else-if="id === 'cenp02'">
      <span class="money resource">7</span>
      <span class="red-arrow"></span>
      <div class="production-box party-production-box"><div class="production-prefix plus"></div></div>
    </template>
    <template v-else-if="id === 'cenp03'">
      <div class="policy-top-margin">
      <div class="resource-tag tag-diverse party-resource-tag"></div> : <div class="resource money">4</div>
      </div>
    </template>
    <template v-else-if="id === 'cenp04'">
      <span class="money resource">4</span>
      <span class="red-arrow"></span>
      <div class="resource card card-with-border policy-card-with-tag"><div class="card-icon tag-diverse"></div></div>
    </template>
    <template v-else-if="id === 'trab01'">
      <div class="resource money party-resource">1</div> /
      <div class="resource-tag tag-wild party-resource-tag"></div>
    </template>
    <template v-else-if="id === 'trab02'">
      <div class="policy-top-margin"><span class="money resource">2</span> / milestone or award</div>
    </template>
    <template v-else-if="id === 'trap01'">
      <div class="policy-top-margin">
      +1 <div class="resource-tag tag-wild party-resource-tag"></div>
      </div>
    </template>
    <template v-else-if="id === 'trap02'">
      <div class="policy-top-margin"><span v-i18n>Standard Project</span> : <span class="money resource">2</span></div>
    </template>
    <template v-else-if="id === 'trap03'">
      <span class="money resource">15</span>
      <span class="red-arrow"></span>
      <div class="resource card card-with-border" style="background: linear-gradient(-60deg, rgb(235, 118, 171) 10%, #f2a6c8, rgb(235, 118, 171) 90%);"></div>
    </template>
    <template v-else-if="id === 'trap04'">
      <div class="policy-top-margin">
      <span class="money resource">10</span>
      <span class="red-arrow"></span>
      <span v-i18n style="font-size: 11px;">Milestone/Award</span>
      </div>
    </template>
    <template v-else-if="isNotImplementedId">
      <div v-i18n>Not implemented</div>
    </template>
    <template v-else>
      <div>Unknown agenda ID {{id}}</div>
    </template>
    </div>
    <Teleport to="body">
      <div
        v-if="showTooltip"
        class="agenda-tooltip-portal"
        v-i18n
        :style="{top: tooltipTop + 'px', left: tooltipLeft + 'px'}">
        {{ resolvedDescription }}
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">

import {BonusId, PolicyId} from '@/common/turmoil/Types';
import {getAgendaOrThrow} from '@/client/turmoil/ClientAgendaManifest';
import {defineComponent} from 'vue';

export default defineComponent({
  name: 'TurmoilAgenda',
  props: {
    id: {
      type: String as () => BonusId | PolicyId,
      required: true,
    },
    showPartyBadge: {
      type: Boolean,
      default: false,
    },
    // Several bonus/policy ids mean something different under the More Parties expansion's
    // "Political Agendas" rework -- pass true whenever the enclosing game (or reference view)
    // has that expansion active, so the right icon and hover text are shown.
    morePartiesExpansion: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      showTooltip: false,
      tooltipTop: 0,
      tooltipLeft: 0,
    };
  },
  computed: {
    partyBadgeClass(): string {
      const partyBadgeSlugs: Record<string, string> = {
        m: 'mars_first',
        s: 'scientists',
        u: 'unity',
        k: 'kelvinists',
        r: 'reds',
        g: 'greens',
      };
      return 'party-badge party-badge--' + partyBadgeSlugs[this.id[0]];
    },
    // These ids reference EPIC-campaign or otherwise-unmodeled game concepts (see
    // MORE_PARTIES_AGENDA_DESCRIPTIONS / the More Parties party files) and have no real
    // behavior in this codebase -- they share this generic display instead of a bespoke icon.
    isNotImplementedId(): boolean {
      const notImplementedIds = ['spop04'];
      return notImplementedIds.includes(this.id);
    },
    resolvedDescription(): string {
      return getAgendaOrThrow(this.id, this.morePartiesExpansion).description;
    },
  },
  methods: {
    // Styled in turmoil.less: the turmoil board's container clips or shrinks anything drawn
    // inside it, so this tooltip is teleported out to <body> (see the template above) and
    // positioned here using the icon's real on-screen coordinates, instead of being placed
    // with plain CSS relative to the icon.
    onMouseEnter(event: MouseEvent) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.tooltipTop = rect.bottom + 6;
      this.tooltipLeft = rect.left + rect.width / 2;
      this.showTooltip = true;
    },
    onMouseLeave() {
      this.showTooltip = false;
    },
  },
});

</script>
