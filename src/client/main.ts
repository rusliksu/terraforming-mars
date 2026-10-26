import {createApp, defineAsyncComponent} from 'vue';

import {trimEmptyTextNodes} from '@/client/directives/TrimWhitespace';
import App from '@/client/components/App.vue';
import {getPreferences} from '@/client/utils/PreferencesManager';

import i18nPlugin from '@/client/plugins/i18n.plugin';
import {startOauth} from '@/client/oauth';
import {
  gameShell,
  gameShellWaitingForBridge,
  installGameShellBootstrapProvider,
  isGameShellEnabled,
} from '@/client/shell';
const PlayerInputFactory = defineAsyncComponent(() => import(/* webpackChunkName: "player-input" */ '@/client/components/PlayerInputFactory.vue'));

declare global {
  interface Window {
    _translations: { [key: string]: string } | undefined;
  }
}

async function bootstrap() {
  if (isGameShellEnabled()) {
    gameShell.start();
    // The provider is synchronous for WaitingFor.onsave; seed its cache from
    // the server-issued bootstrap before the first input is submitted.
    const bootstrapCache = installGameShellBootstrapProvider(gameShellWaitingForBridge);
    void bootstrapCache.primeFromLocation();
  }

  const lang = getPreferences().lang;

  if (lang !== 'en') {
    try {
      window._translations = await fetch(`assets/locales/${lang}.json`).then((res) => res.json());
    } catch (err) {
      console.warn(`Cannot load ${lang} translations. See network for details.`);
    }
  }

  const app = createApp(App);

  app.use(i18nPlugin);

  app.component('PlayerInputFactory', PlayerInputFactory);

  app.directive('trim-whitespace', {
    mounted: trimEmptyTextNodes,
    updated: trimEmptyTextNodes,
  });

  if (window.isSecureContext && 'serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('sw.js').then(function(registration) {
        console.log('registered the service worker', registration);
      });
    });
  }

  app.mount('#app');

  window.onload = startOauth;
}

bootstrap();
