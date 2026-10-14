<template>
  <Canonical :message="message" :viewModel="viewModel" :class="[lineColor ? 'log-line--' + lineColor : '', {'log-line--expandable': expandable}]"
    @click="$emit('click')" @spaceClicked="$emit('spaceClicked', $event)"/>
</template>
<script setup lang="ts">
import {computed} from 'vue';
import Canonical from '@/client/components/logpanel/LogMessageComponent.vue';
import {Color} from '@/common/Color';
import {SpaceId} from '@/common/Types';
import {ViewModel} from '@/common/models/PlayerModel';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {needsModalPreview} from './logMessageContent';

const props = defineProps<{message: LogMessage; viewModel: ViewModel}>();
defineEmits<{click: []; spaceClicked: [space: SpaceId]}>();
const expandable = computed(() => needsModalPreview(props.message));
const lineColor = computed(() => props.message.data?.find((datum) => datum.type === LogMessageDataType.PLAYER)?.value as Color | undefined);
</script>
