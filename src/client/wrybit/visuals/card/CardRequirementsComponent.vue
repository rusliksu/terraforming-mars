<script lang="ts">
import {defineComponent} from 'vue';
import Canonical from '@/client/components/card/CardRequirementsComponent.vue';
import CardRequirementComponent from './CardRequirementComponent.vue';

export default defineComponent({name: 'CardRequirementsComponent', extends: Canonical, components: {CardRequirementComponent}});
</script>
