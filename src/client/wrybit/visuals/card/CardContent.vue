<script lang="ts">
import {defineComponent} from 'vue';
import Canonical from '@/client/components/card/CardContent.vue';
import CardRequirementsComponent from './CardRequirementsComponent.vue';

export default defineComponent({name: 'CardContent', extends: Canonical, components: {CardRequirementsComponent}});
</script>
