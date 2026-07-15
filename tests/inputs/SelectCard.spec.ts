import {expect} from 'chai';
import {SelectCard} from '../../src/server/inputs/SelectCard';
import {AquiferPumping} from '../../src/server/cards/base/AquiferPumping';
import {RoboticWorkforce} from '../../src/server/cards/base/RoboticWorkforce';
import {IoMiningIndustries} from '../../src/server/cards/base/IoMiningIndustries';
import {ICard} from '../../src/server/cards/ICard';
import {CardName} from '../../src/common/cards/CardName';
import {testGame} from '../TestGame';

describe('SelectCard', () => {
  let aquiferPumping: ICard;
  let roboticWorkforce: ICard;
  let ioMiningIndustries: ICard;
  let selected: ReadonlyArray<ICard>;
  const cb = (cards: ReadonlyArray<ICard>) => {
    selected = cards;
    return undefined;
  };

  beforeEach(() => {
    aquiferPumping = new AquiferPumping();
    roboticWorkforce = new RoboticWorkforce();
    ioMiningIndustries = new IoMiningIndustries();
    selected = [];
  });

  it('Simple', () => {
    const selectCards = new SelectCard(
      'Select card',
      'Save',
      [aquiferPumping, ioMiningIndustries])
      .andThen(cb);

    selectCards.process({type: 'card', cards: [CardName.AQUIFER_PUMPING]});
    expect(selected).deep.eq([aquiferPumping]);

    selectCards.process({type: 'card', cards: [CardName.IO_MINING_INDUSTRIES]});
    expect(selected).deep.eq([ioMiningIndustries]);
  });

  it('Cannot select unavailable card', () => {
    const selectCards = new SelectCard(
      'Select card',
      'Save',
      [aquiferPumping, roboticWorkforce])
      .andThen(cb);

    expect(() => selectCards.process({type: 'card', cards: [CardName.DIRECTED_IMPACTORS]}))
      .to.throw(Error, /Card Directed Impactors not found/);
  });

  it('Throws error when selected card was not enabled', () => {
    const selectCards = new SelectCard(
      'Select card',
      'Save',
      [aquiferPumping, roboticWorkforce, ioMiningIndustries],
      {enabled: [true, false, true]})
      .andThen(cb);

    selectCards.process({type: 'card', cards: [CardName.AQUIFER_PUMPING]});
    expect(selected).deep.eq([aquiferPumping]);

    selectCards.process({type: 'card', cards: [CardName.IO_MINING_INDUSTRIES]});
    expect(selected).deep.eq([ioMiningIndustries]);

    expect(() => selectCards.process({type: 'card', cards: [CardName.ROBOTIC_WORKFORCE]}))
      .to.throw(Error, /Robotic Workforce is not available/);
  });

  it('privately logs selected and skipped cards', () => {
    const [game, player] = testGame(1);
    const selectCards = new SelectCard(
      'Select card',
      'Save',
      [aquiferPumping, ioMiningIndustries])
      .andThen(cb);

    selectCards.process({type: 'card', cards: [CardName.AQUIFER_PUMPING]}, player);

    const selectionLog = game.gameLog.find((entry) => entry.message === 'You selected ${0} skipping ${1}');
    expect(selectionLog?.playerId).eq(player.id);
    expect(selectionLog?.data.map((datum) => datum.value)).deep.eq([
      [CardName.AQUIFER_PUMPING],
      [CardName.IO_MINING_INDUSTRIES],
    ]);
  });

  it('can defer selection logging to a more specific caller', () => {
    const [game, player] = testGame(1);
    const selectCards = new SelectCard(
      'Select card',
      'Save',
      [aquiferPumping, ioMiningIndustries],
      {logSelection: false})
      .andThen(cb);

    selectCards.process({type: 'card', cards: [CardName.AQUIFER_PUMPING]}, player);

    expect(game.gameLog.some((entry) => entry.playerId === player.id && entry.message.startsWith('You selected'))).is.false;
  });
});
