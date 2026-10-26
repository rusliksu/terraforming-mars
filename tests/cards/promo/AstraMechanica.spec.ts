import {expect} from 'chai';
import {AstraMechanica} from '../../../src/server/cards/promo/AstraMechanica';
import {testGame} from '../../TestGame';
import {cast} from '@/common/utils/utils';
import {cardsFromJSON} from '../../../src/server/createCard';
import {CardName} from '../../../src/common/cards/CardName';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {MicroMills} from '../../../src/server/cards/base/MicroMills';
import {AICentral} from '../../../src/server/cards/base/AICentral';
import {BribedCommittee} from '../../../src/server/cards/base/BribedCommittee';
import {MoholeArea} from '../../../src/server/cards/base/MoholeArea';
import {LavaFlows} from '../../../src/server/cards/base/LavaFlows';

describe('AstraMechanica', () => {
  const canPlayRuns = [
    {playedCards: [], expected: false},
    {playedCards: [CardName.MICRO_MILLS], expected: false},
    {playedCards: [CardName.AI_CENTRAL], expected: false},
    {playedCards: [CardName.BRIBED_COMMITTEE], expected: true},
    {playedCards: [CardName.RETURN_TO_ABANDONED_TECHNOLOGY], expected: true},
    {playedCards: [CardName.PATENT_MANIPULATION], expected: false},
    {playedCards: [CardName.HOSTILE_TAKEOVER], expected: false},
    {playedCards: [CardName.LAVA_FLOWS], expected: false},
    {playedCards: [CardName.MOHOLE_AREA], expected: false},
  ] as const;

  for (const run of canPlayRuns) {
    it('canPlay ' + JSON.stringify(run), () => {
      const card = new AstraMechanica();
      const [/* game */, player] = testGame(2);
      player.playedCards.push(...cardsFromJSON([...run.playedCards]));
      expect(card.canPlay(player)).eq(run.expected);
    });
  }

  it('play', () => {
    const card = new AstraMechanica();
    const [/* game */, player] = testGame(2);
    const microMills = new MicroMills();
    const aiCentral = new AICentral();
    const bribedCommittee = new BribedCommittee();
    const moholeArea = new MoholeArea();
    const lavaFlows = new LavaFlows();
    player.playedCards.push(microMills, aiCentral, bribedCommittee, moholeArea, lavaFlows);
    player.cardsInHand = [];
    const selectCard = cast(card.play(player), SelectCard);

    expect(selectCard.cards).to.have.members([bribedCommittee]);

    selectCard.cb([bribedCommittee]);

    expect(player.playedCards.asArray()).to.have.members([microMills, aiCentral, moholeArea, lavaFlows]);
    expect(player.cardsInHand).to.have.members([bribedCommittee]);
  });

  it('returns discard recovery and Ishtar while leaving Astra in play', () => {
    const astra = new AstraMechanica();
    const [game, player] = testGame(2);
    const [recovery, ishtar, patent, takeover] = cardsFromJSON([
      CardName.RETURN_TO_ABANDONED_TECHNOLOGY, CardName.ISHTAR_EXPEDITION,
      CardName.PATENT_MANIPULATION, CardName.HOSTILE_TAKEOVER,
    ]);
    player.playedCards.push(astra, recovery, ishtar, patent, takeover);
    const discardPile = game.projectDeck.discardPile.slice();

    const input = cast(astra.play(player), SelectCard);
    expect(input.cards).to.have.members([recovery, ishtar]);
    input.cb([recovery, ishtar]);

    expect(player.cardsInHand).to.have.members([recovery, ishtar]);
    expect(player.playedCards.asArray()).to.have.members([astra, patent, takeover]);
    expect(game.projectDeck.discardPile).deep.eq(discardPile);
  });
});
