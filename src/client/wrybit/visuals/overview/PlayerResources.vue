<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalPlayerResources from '@/client/components/overview/PlayerResources.vue';
import PlayerResource from '@/client/wrybit/visuals/overview/PlayerResource.vue';

export default defineComponent({
  name: 'PlayerResources',
  extends: CanonicalPlayerResources,
  components: {PlayerResource},
});
</script>

<style lang="less" src="../../../../styles/wrybit/visuals.less"></style>
