<template>
  <div id="login-home" class="games-overview-container admin-home">
    <header class="games-overview-card admin-nav">
      <h1><HomeLink>{{ APP_NAME }}</HomeLink> — <span v-i18n>Login</span></h1>
    </header>
    <section class="games-overview-card login-card">
      <template v-if="user !== undefined">
        <p><span v-i18n="[user]">You are ${0}</span></p>
        <a class="btn btn-tone-quiet" :href="logoutURL" v-i18n>Log out</a>
      </template>
      <template v-else>
        <p v-if="loginUrl === ''" v-i18n>Discord login is not configured on this server.</p>
        <a v-else class="btn btn-primary" :href="loginUrl"><span v-i18n>Login with Discord</span></a>
      </template>
    </section>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import raw_settings from '@/genfiles/settings.json';
import {paths} from '@/common/app/paths';
import {APP_NAME} from '@/common/constants';
import HomeLink from '@/client/components/common/HomeLink.vue';

type Data = {
  user: string | undefined;
  discordClientId: string;
};

export default defineComponent({
  name: 'WrybitLoginHome',
  components: {HomeLink},
  data(): Data {
    return {user: undefined, discordClientId: raw_settings.discordClientId};
  },
  mounted() {
    fetch(paths.API_PROFILE)
      .then((resp) => {
        if (!resp.ok) {
          console.error('Unexpected server response: ' + resp.statusText);
          return null;
        }
        return resp.json();
      })
      .then((data) => {
        if (data) {
          try {
            this.user = data._user.userid;
          } catch (e) {
            console.log('Error processing fetch response: ' + e);
          }
        }
      })
      .catch((err) => console.error(err));
  },
  computed: {
    APP_NAME(): string {
      return APP_NAME;
    },
    loginUrl(): string {
      const thisUrl = window.location.href;
      const idx = window.location.href.lastIndexOf('/' + paths.LOGIN);
      const url = thisUrl.substring(0, idx) + '/' + paths.AUTH_DISCORD_CALLBACK;
      const encoded = encodeURI(url);
      const clientId = this.discordClientId;
      if (!clientId) {
        return '';
      }
      return 'https://discord.com/oauth2/authorize?client_id=' + clientId + '&response_type=code&scope=identify&redirect_uri=' + encoded;
    },
    logoutURL(): string {
      return paths.API_LOGOUT;
    },
  },
});
</script>

<style scoped>
@media (max-width: 700px) {
  /* The optional-layout switch floats above the top-right corner of the page.
     Keep the login title out of that area and let it wrap instead of sliding
     underneath the button. */
  #login-home .admin-nav h1 {
    box-sizing: border-box;
    max-width: calc(100% - 120px);
    white-space: normal;
    overflow-wrap: anywhere;
  }
}
</style>
