import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import WrybitShell from '@/client/wrybit/shell/WrybitShell.vue';
import Catalog from '@/client/wrybit/visuals/cardlist/CardList.vue';
import PlayerHome from '@/client/wrybit/visuals/PlayerHome.vue';
import SpectatorHome from '@/client/wrybit/spectator/SpectatorHome.vue';
import StartScreen from '@/client/wrybit/pages/StartScreen.vue';
import LoadGameForm from '@/client/wrybit/pages/LoadGameForm.vue';
import GamesOverview from '@/client/wrybit/pages/GamesOverview.vue';
import AdminHome from '@/client/wrybit/pages/admin/AdminHome.vue';
import LoginHome from '@/client/wrybit/pages/auth/LoginHome.vue';
import Help from '@/client/wrybit/pages/help/Help.vue';
import GameEnd from '@/client/wrybit/pages/GameEnd.vue';
import StatsPage from '@/client/wrybit/pages/stats/StatsPage.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit shell', () => {
  it('renders responsive isolated backgrounds with attribution and a classic return', async () => {
    const wrapper = mount(WrybitShell, {...globalConfig, props: {screen: 'start-screen'}});
    try {
      expect(wrapper.emitted('views')?.[0][0]).deep.include({
        cards: Catalog, playerHome: PlayerHome, spectatorHome: SpectatorHome,
        startScreen: StartScreen, loadGame: LoadGameForm, gamesOverview: GamesOverview,
        adminHome: AdminHome, loginHome: LoginHome, help: Help, gameEnd: GameEnd, stats: StatsPage,
      });
      const sources = wrapper.findAll('picture source');
      expect(sources.map((source) => source.attributes('type'))).deep.eq([
        'image/avif', 'image/webp', 'image/jpeg', 'image/avif', 'image/webp', 'image/jpeg',
      ]);
      expect(sources[0].attributes('media')).eq('(orientation: portrait)');
      expect(sources[0].attributes('srcset')).contains('assets/wrybit/shell/milky-way-portrait-540.avif 540w');
      expect(wrapper.get('picture img').attributes('src')).eq('assets/wrybit/shell/milky-way-landscape-1920.jpg');
      expect(wrapper.get('picture img').attributes('alt')).eq('');
      const credit = wrapper.get('a.app-background-credit');
      expect(credit.attributes('href')).eq('https://www.eso.org/public/images/eso0932a/');
      expect(credit.text()).contains('S. Brunier');
      expect(credit.text()).contains('CC BY 4.0');
      await wrapper.get('button').trigger('click');
      expect(wrapper.emitted('classic')).deep.eq([[]]);

      await wrapper.setProps({screen: 'player-home'});
      expect(wrapper.find('picture').exists()).is.true;
      expect(wrapper.find('.app-background--always').exists()).is.false;
      await wrapper.setProps({screen: 'cards'});
      expect(wrapper.find('picture').exists()).is.true;
      expect(wrapper.find('.app-background-credit').exists()).is.false;
      expect(wrapper.find('[data-wrybit-shell]').exists()).is.false;
      await wrapper.setProps({screen: 'help'});
      expect(wrapper.find('picture').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });
});
