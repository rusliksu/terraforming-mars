import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import PlayersTable from '@/client/wrybit/visuals/overview/PlayersTable.vue';
import PlayerIdentity from '@/client/wrybit/visuals/overview/PlayerIdentity.vue';
import EscapeVelocityClock from '@/client/wrybit/visuals/overview/EscapeVelocityClock.vue';
import PlayersTableGoods from '@/client/wrybit/visuals/overview/PlayersTableGoods.vue';
import {fakePublicPlayerModel, fakeViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {Tag} from '@/common/cards/Tag';
import {CardName} from '@/common/cards/CardName';

describe('Wrybit player table with our public data', () => {
  it('renders seven Conglomerates goods, Galactic, server discounts and hidden VP, then updates rows', async () => {
    const player = fakePublicPlayerModel({name: 'Synthetic public player', color: 'turquoise', isBotControlled: true,
      conglomeratesData: {coordination: 5}, tags: {[Tag.GALACTIC]: 2}, victoryPointsBreakdown: {total: 42},
      protectedResources: {steel: 'half'}, steel: 12, steelProduction: 4,
      conditionalDiscounts: [{source: CardName.CUTTING_EDGE_TECHNOLOGY_REBALANCED, amount: 2, condition: 'requirements'}],
      tableau: [{name: CardName.HELION, discount: [{tag: Tag.POWER, amount: 3}]}]});
    const playerView = fakeViewModel({thisPlayer: undefined, players: [player], game: {tags: [Tag.GALACTIC],
      gameOptions: {showOtherPlayersVP: false, expansions: {conglomerates: true}}}});
    const row = {player, playerIndex: 0, actionLabel: 'active' as const, firstForGen: true};
    const wrapper = mount(PlayersTable, {...globalConfig, props: {playerView, rows: [row], readOnly: true},
      global: {...globalConfig.global, mocks: {getVisibilityState: () => false, setVisibilityState: () => {}}}});
    try {
      expect(wrapper.findAll('.players-table-goods')).has.length(7);
      expect(wrapper.get('.players-table-goods--coordination [data-test="stock"]').text()).eq('5');
      expect(wrapper.get('.players-table-goods--steel [data-test="protection"]').classes()).contains('shield_icon_half');
      expect(wrapper.get('[data-test="tag-galactic"]').text()).contains('2');
      // An unplayed tag stays visible with an empty counter, matching the classic player bar.
      expect(wrapper.get('[data-test="tag-animal"]').text()).contains('·');
      // The row carries the tag icon itself; an unplayed tag keeps it in place, dimmed
      expect(wrapper.get('[data-test="tag-galactic"] .tag-count').classes()).contains('tag-galactic');
      expect(wrapper.get('[data-test="tag-animal"]').classes()).contains('players-table-cell--tag-empty');
      expect(wrapper.get('[data-test="tag-galactic"]').classes()).not.contains('players-table-cell--tag-empty');
      // Main tags and the event group are separated by a divider
      expect(wrapper.findAll('.players-table-row--player .players-table-tag-separator')).has.length(1);
      // No header row and no section toggles: the table shows everything, the menu stays above it
      expect(wrapper.find('.players-table-head').exists()).is.false;
      expect(wrapper.find('[data-test="toggle-tags"]').exists()).is.false;
      expect(wrapper.find('[data-test="game-menu-button"]').exists()).eq(true);
      expect(wrapper.find('.players-table-cell--score .tag-vp').exists()).eq(true);
      expect(wrapper.find('.players-table-cell--score .tag-tr').exists()).eq(true);
      expect(wrapper.find('.players-table-cell--score .tag-cards').exists()).eq(true);
      expect(wrapper.find('.players-table-cell--score .tag-action-card').exists()).eq(true);
      // Classic order: cards in hand, actions, VP, TR, played cards, then the tags
      const cells = wrapper.findAll('.players-table-row--player .players-table-cell');
      const cellIndex = (selector: string) => cells.findIndex((cell) => cell.find(selector).exists());
      expect(cellIndex('[data-test="hand"]')).greaterThan(-1);
      expect(cellIndex('[data-test="hand"]')).lessThan(cellIndex('[data-test="actions"]'));
      expect(cellIndex('[data-test="actions"]')).lessThan(cellIndex('[data-test="vp"]'));
      expect(cellIndex('[data-test="vp"]')).lessThan(cellIndex('[data-test="tr"]'));
      expect(cellIndex('[data-test="tr"]')).lessThan(cellIndex('[data-test="played-cards"]'));
      expect(cellIndex('[data-test="played-cards"]')).lessThan(cells.findIndex((cell) => cell.classes().includes('players-table-cell--tag')));
      expect(wrapper.get('[data-test="tag-power"] .players-table-discount').text()).eq('-3');
      expect(wrapper.get('[data-test="discount-all"]').text()).eq('*');
      expect(wrapper.get('[data-test="vp"]').text()).eq('?');
      expect(wrapper.get('.players-table-name-marker').text()).eq('BOT');
      // The classic translucent class supplies the persona surface and the matching text tone for
      // reserved identities; the table switches only the text colour for the light personas.
      const rowClasses = wrapper.get('.players-table-row--player').classes();
      expect(rowClasses).contains('players-table-row--turquoise');
      expect(rowClasses).contains('player_translucent_bg_color_turquoise');
      const refreshed = {...player, conglomeratesData: {...player.conglomeratesData, coordination: 8},
        conditionalDiscounts: [], tags: {...player.tags, [Tag.GALACTIC]: 3}};
      await wrapper.setProps({rows: [{...row, player: refreshed}], playerView: {...playerView, players: [refreshed]}});
      expect(wrapper.get('.players-table-goods--coordination [data-test="stock"]').text()).eq('8');
      expect(wrapper.get('[data-test="tag-galactic"]').text()).contains('3');
      expect(wrapper.find('[data-test="discount-all"]').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps a recorded Escape Velocity clock still and renders only the supplied public penalty', () => {
    const player = fakePublicPlayerModel({timer: {sumElapsed: 10000, running: true, startedAt: 1}, victoryPointsBreakdown: {escapeVelocity: 0}});
    const playerView = fakeViewModel({thisPlayer: undefined, players: [player], game: {gameOptions: {escapeVelocity: {
      thresholdMinutes: 1, bonusSectionsPerAction: 0, penaltyPeriodMinutes: 1, penaltyVPPerPeriod: 7}}}});
    const wrapper = mount(PlayerIdentity, {...globalConfig, props: {player, playerView, actionLabel: 'active', readOnly: true}});
    try {
      const clock = wrapper.getComponent(EscapeVelocityClock);
      expect(clock.props('live')).is.false;
      expect(clock.props('penalty')).eq(0);
      expect(wrapper.get('.escape-velocity-clock__text').text()).eq('00:10 / 01:00');
      expect(wrapper.find('.escape-velocity-clock__penalty').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps partial stock protection distinct from production protection', async () => {
    const good = {type: 'steel' as const, count: 12, production: 4, value: 2, resourceProtection: 'half' as const, productionProtection: 'on' as const};
    const wrapper = mount(PlayersTableGoods, {...globalConfig, props: {good, color: 'red'}});
    try {
      expect(wrapper.get('[data-test="protection"]').classes()).contains('shield_icon_half');
      expect(wrapper.find('[data-test="production-protection"]').exists()).is.true;
      await wrapper.setProps({good: {...good, resourceProtection: 'off'}});
      expect(wrapper.find('[data-test="protection"]').exists()).is.false;
      expect(wrapper.find('[data-test="production-protection"]').exists()).is.true;
    } finally {
      wrapper.unmount();
    }
  });
});
