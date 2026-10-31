<template>
  <div id="games-overview" class="games-overview-container admin-home">
    <AdminNav active="settings" />
    <section class="games-overview-card">
      <h2 v-i18n>Server administration</h2>
      <p class="games-overview-note" v-i18n>Read-only server endpoints and tools. Existing access rules are unchanged.</p>
      <ul class="admin-home-links">
        <li v-for="path in paths" :key="path">
          <a :href="path + '?serverId=' + serverId">{{ path }}</a>
        </li>
      </ul>
    </section>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {paths} from '@/common/app/paths';
import {APP_NAME} from '@/common/constants';
import AdminNav from '@/client/wrybit/pages/admin/AdminNav.vue';

export default defineComponent({
  name: 'WrybitAdminHome',
  components: {AdminNav},
  data() {
    return {
      APP_NAME,
      paths: [
        paths.API_STATS,
        paths.GAMES_OVERVIEW,
        paths.API_GAMES,
        paths.API_METRICS,
        paths.LOAD,
        paths.API_IPS,
        paths.API_HEAP_SNAPSHOT,
      ],
    };
  },
  computed: {
    serverId(): string {
      return new URLSearchParams(window.location.search).get('serverId') || '';
    },
  },
});
</script>
