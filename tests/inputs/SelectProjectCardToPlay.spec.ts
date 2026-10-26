import {expect} from 'chai';
import {SelectProjectCardToPlay} from '../../src/server/inputs/SelectProjectCardToPlay';
import {AquiferPumping} from '../../src/server/cards/base/AquiferPumping';
import {IoMiningIndustries} from '../../src/server/cards/base/IoMiningIndustries';
import {TestPlayer} from '../TestPlayer';
import {IProjectCard} from '../../src/server/cards/IProjectCard';
import {CardName} from '../../src/common/cards/CardName';
import {Payment} from '../../src/common/inputs/Payment';
import {testGame} from '../TestGame';

describe('SelectProjectCardToPlay', () => {
  let player: TestPlayer;
  let aquiferPumping: IProjectCard;
  let ioMiningIndustries: IProjectCard;
  let called: boolean;
  const cb = () => {
    called = true;
    return undefined;
  };

  beforeEach(() => {
    [/* game */, player] = testGame(1);
    aquiferPumping = new AquiferPumping();
    ioMiningIndustries = new IoMiningIndustries();
    called = false;
  });

  it('Simple', () => {
    const selectProjectCardToPlay = new SelectProjectCardToPlay(
      player,
      [aquiferPumping, ioMiningIndustries],
    ).andThen(cb);

    expect(() => selectProjectCardToPlay.process({
      type: 'projectCard',
      card: CardName.AQUIFER_PUMPING,
      payment: Payment.of({}),
    })).to.throw(/Did not spend enough to pay for card/);

    expect(() => selectProjectCardToPlay.process({
      type: 'projectCard',
      card: CardName.AQUIFER_PUMPING,
      payment: Payment.of({megacredits: 18}),
    })).to.throw(/You do not have that many resources to spend/);

    player.megaCredits = 20;
    expect(called).is.false;
    expect(player.playedCards.length).eq(0);
    selectProjectCardToPlay.process({
      type: 'projectCard',
      card: CardName.AQUIFER_PUMPING,
      payment: Payment.of({megacredits: 18}),
    });
    expect(called).is.true;
    expect(player.megaCredits).eq(2);
    expect(player.playedCards).has.length(1);
    expect(player.playedCards.get(CardName.AQUIFER_PUMPING)).is.not.undefined;
  });

  it('plays a card with a pre-port payment payload', () => {
    player.megaCredits = 20;
    const payment = JSON.parse(JSON.stringify(Payment.of({megacredits: 18})));
    delete payment.energy;
    delete payment.nereidMicrobes;
    delete payment.anyFloaters;
    new SelectProjectCardToPlay(player, [aquiferPumping]).andThen(cb).process({
      type: 'projectCard', card: aquiferPumping.name, payment,
    });
    expect(player.megaCredits).eq(2);
    expect(player.playedCards.get(aquiferPumping.name)).eq(aquiferPumping);
  });

  it('records the actual mixed card payment on the public play message', () => {
    player.megaCredits = 20;
    player.steel = 2;
    new SelectProjectCardToPlay(player, [aquiferPumping]).andThen(cb).process({
      type: 'projectCard', card: CardName.AQUIFER_PUMPING,
      payment: Payment.of({megacredits: 14, steel: 2}),
    });

    expect(player.megaCredits).eq(6);
    expect(player.steel).eq(0);
    const message = player.game.gameLog.find((message) => message.message === '${0} played ${1} [ ${2} ]');
    expect(message?.data[2].value).eq('-2:r:steel: -14:r:mc:');
  });

  it('records heat paid for the card', () => {
    player.megaCredits = 20;
    player.heat = 4;
    player.canUseHeatAsMegaCredits = true;
    new SelectProjectCardToPlay(player, [aquiferPumping]).andThen(cb).process({
      type: 'projectCard', card: CardName.AQUIFER_PUMPING,
      payment: Payment.of({megacredits: 14, heat: 4}),
    });

    const message = player.game.gameLog.find((message) => message.message === '${0} played ${1} [ ${2} ]');
    expect(message?.data[2].value).eq('-14:r:mc: -4:r:heat:');
  });
});
