<template>
  <div class="card-requirement">
      <div class="card-item-container" :class="nextTo">
        <span v-if="requirement.max" class="card-requirement-max-label">max</span>
        <template v-if="type === RequirementType.GENERATION">Gen&nbsp;</template>
        <span v-if="!isRepeated">{{amount}}</span>{{suffix}}
        <template v-if="type === RequirementType.REMOVED_PLANTS">
          <div class="card-special card-minus"></div>
          <div class="card-resource card-resource-plant red-outline"></div>
        </template>
        <template v-if="type === RequirementType.GREENERY_LAST_ACTION">
          <div class="card-tile greenery-tile tile-size--req"></div>
          <div class="card-special card-asterix">*</div>
        </template>
        <template v-if="type === RequirementType.PRODUCTION">
          <div class="card-production-box card-production-box--req">
            <div class="card-production-box-row">
              <div class="card-production-box-row-item">
                <div class="card-item-container">
                  <div v-for="num in repeats" :class="productionClass" :key="num"></div>
                </div>
              </div>
            </div>
          </div>
        </template>
        <CardParty v-else-if="type === RequirementType.PARTY" :party="party" size="req" />
        <template v-else>
            <template v-for="(num, index) in repeats" :key="num">
              <div v-if="index > 0 && requirement.adjacent" class="card-special card-slash">/</div>
              <div :class="componentClasses"></div>
            </template>
        </template>
      </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalRequirement from '@/client/components/card/CardRequirementComponent.vue';

export default defineComponent({name: 'CardRequirementComponent', extends: CanonicalRequirement});
</script>
