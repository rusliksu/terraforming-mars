<script lang="ts">
import {defineComponent} from 'vue';
import Canonical from '@/client/components/board/BoardSpaceTile.vue';
import AdjacencyBonus from '../AdjacencyBonus.vue';

export default defineComponent({name: 'BoardSpaceTile', extends: Canonical, components: {AdjacencyBonus}});
</script>
