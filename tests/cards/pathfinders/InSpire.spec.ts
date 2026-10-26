import {expect} from 'chai';
import {InSpire} from '../../../src/server/cards/pathfinders/InSpire';
import {Tag} from '../../../src/common/cards/Tag';
import {RegolithEaters} from '../../../src/server/cards/base/RegolithEaters';
import {Ants} from '../../../src/server/cards/base/Ants';
import {Fish} from '../../../src/server/cards/base/Fish';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {testGame} from '../../TestGame';
import {runAllActions, fakeCard} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';
import {CardRenderItemType} from '../../../src/common/cards/render/CardRenderItemType';
import {CardResource} from '../../../src/common/CardResource';

describe('InSpire', () => {
  let card: InSpire;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new InSpire();
    [game, player] = testGame(1);
    player.playedCards.push(card);
  });

  it('starts with 43 M€ and 3 M€ production', () => {
    const corp = new InSpire();
    const [g, p] = testGame(1);
    p.playCorporationCard(corp);
    runAllActions(g);
    expect(p.megaCredits).eq(43);
    expect(p.production.megacredits).eq(3);
  });

  it('auto-adds a resource when this card holds none of that type yet', () => {
    card.onCardPlayed(player, fakeCard({tags: [Tag.BUILDING]}));
    runAllActions(game);
    expect(player.popWaitingFor()).is.undefined;

    // A second Building tag now offers a real choice, proving the first one was stored.
    card.onCardPlayed(player, fakeCard({tags: [Tag.BUILDING]}));
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    expect(options.options.map((o) => o.title)).deep.eq(['Add steel to InSpire', 'Take steel from InSpire']);
  });

  it('stops offering "add" at the cap of 2, and auto-redistributes once full', () => {
    card.onCardPlayed(player, fakeCard({tags: [Tag.BUILDING]}));
    runAllActions(game); // auto-add: 0 -> 1

    card.onCardPlayed(player, fakeCard({tags: [Tag.BUILDING]}));
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[0].cb(); // Add: 1 -> 2

    card.onCardPlayed(player, fakeCard({tags: [Tag.BUILDING]}));
    runAllActions(game);
    // At the cap, "add" is no longer legal - only "take" is, so it resolves without a choice.
    expect(player.popWaitingFor()).is.undefined;
    expect(player.steel).eq(1);
    expect(player.production.steel).eq(0);
  });

  it('redistributing a standard-resource type gives stock, never production', () => {
    card.onCardPlayed(player, fakeCard({tags: [Tag.POWER]}));
    runAllActions(game); // auto-add energy: 0 -> 1

    card.onCardPlayed(player, fakeCard({tags: [Tag.POWER]}));
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[1].cb(); // Take

    expect(player.energy).eq(1);
    expect(player.production.energy).eq(0);
  });

  it('redistributing a card-resource type adds it to the card that just triggered it, not some other played card', () => {
    // A microbe-resource card sitting in the tableau from earlier - NOT the trigger for
    // this play, so it must not be a legal target.
    const earlierMicrobeCard = new Ants();
    player.playedCards.push(earlierMicrobeCard);

    card.onCardPlayed(player, fakeCard({tags: [Tag.MICROBE]}));
    runAllActions(game); // auto-add microbe: 0 -> 1

    // The second microbe tag comes from playing RegolithEaters itself - the take, if
    // chosen, must land on THIS instance, not the earlier one. RegolithEaters also carries
    // a Science tag (a fresh, forced auto-add), so the two different rules triggered by one
    // card play offer an order pick first.
    const triggeringMicrobeCard = new RegolithEaters();
    player.playedCards.push(triggeringMicrobeCard);
    card.onCardPlayed(player, triggeringMicrobeCard);
    runAllActions(game);
    const order = cast(player.popWaitingFor(), OrOptions);
    order.options[order.options.findIndex((o) => o.title === 'a microbe')].cb();
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[1].cb(); // Take
    runAllActions(game);

    expect(triggeringMicrobeCard.resourceCount).eq(1);
    expect(earlierMicrobeCard.resourceCount).eq(0);
  });

  it('when the just-played card cannot hold the resource, it just keeps auto-adding up to the cap - never a broader "any eligible card" choice', () => {
    // An eligible Animal-resource card exists (Fish), but it's not the card that's about
    // to trigger the second Animal tag below - it must not be offered as a target.
    player.playedCards.push(new Fish());

    card.onCardPlayed(player, fakeCard({tags: [Tag.ANIMAL]}));
    runAllActions(game); // stored 0 -> 1, auto-added (the only legal option at 0 anyway)
    expect(player.popWaitingFor()).is.undefined;

    card.onCardPlayed(player, fakeCard({tags: [Tag.ANIMAL]}));
    runAllActions(game);
    // The triggering card itself (a bare fakeCard, no resourceType) can't hold it, so
    // "take" isn't offered even at stored=1 - it just adds again instead, up to the cap.
    expect(player.popWaitingFor()).is.undefined;

    card.onCardPlayed(player, fakeCard({tags: [Tag.ANIMAL]}));
    runAllActions(game);
    // Now at the cap (2), still not a legal target - nothing legal to do, so this no-ops
    // and the unit just stays on InSpire.
    expect(player.popWaitingFor()).is.undefined;
    expect(card.data.animal).eq(2);
  });

  it('when the just-played card itself is animal-resource-eligible, taking becomes an option', () => {
    card.onCardPlayed(player, fakeCard({tags: [Tag.ANIMAL]}));
    runAllActions(game); // stored 0 -> 1, auto-added (still the only option at stored=0)

    const fish = new Fish();
    player.playedCards.push(fish);
    card.onCardPlayed(player, fish);
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    expect(options.options).has.lengthOf(2);
    options.options[1].cb(); // Take
    runAllActions(game);
    expect(fish.resourceCount).eq(1);
  });

  it('Jovian and Venus both trigger the floater rule', () => {
    card.onCardPlayed(player, fakeCard({tags: [Tag.JOVIAN]}));
    runAllActions(game); // auto-add: 0 -> 1

    // Dirigibles (Tag.VENUS, resourceType FLOATER) is both the trigger and the only legal
    // target for the "take" branch.
    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);
    card.onCardPlayed(player, dirigibles);
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    expect(options.options.map((o) => o.title)).deep.eq(['Add a floater to InSpire', 'Take a floater from InSpire']);
  });

  it('a card with both Jovian and Venus tags triggers the floater rule twice', () => {
    // resourceType FLOATER so the second trigger's "take" branch has a legal target: itself.
    const twiceTaggedCard = fakeCard({tags: [Tag.JOVIAN, Tag.VENUS], resourceType: CardResource.FLOATER});
    card.onCardPlayed(player, twiceTaggedCard);
    runAllActions(game); // first trigger auto-adds: 0 -> 1

    // The second trigger (still queued from the same onCardPlayed call) now offers a choice.
    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[0].cb(); // Add: 1 -> 2
    expect(player.popWaitingFor()).is.undefined;
  });

  it('a card with two DIFFERENT tags triggers both rules, not just one', () => {
    card.onCardPlayed(player, fakeCard({tags: [Tag.BUILDING, Tag.SCIENCE]}));
    runAllActions(game);

    expect(card.data.steel).to.eq(1);
    expect(card.data.megacredits).to.eq(1);
  });

  it('renderStoredResources reflects the current data, empty when nothing is stored', () => {
    expect(card.renderStoredResources()).to.deep.eq([]);

    card.onCardPlayed(player, fakeCard({tags: [Tag.BUILDING, Tag.MICROBE]}));
    runAllActions(game);

    const items = card.renderStoredResources();
    expect(items).has.lengthOf(2);
    expect(items[0]).to.include({type: CardRenderItemType.STEEL, amount: 1});
    expect(items[1]).to.include({type: CardRenderItemType.RESOURCE, amount: 1, resource: CardResource.MICROBE});
  });

  it('lets you choose the order when a card triggers 2 different rules and at least one is a real choice', () => {
    // Steel is already at 1 (a real add-or-take choice); titanium is still fresh (a forced
    // auto-add) - the combination should still offer an order pick, not just resolve
    // titanium first because Space comes after Building in the rule list.
    card.onCardPlayed(player, fakeCard({tags: [Tag.BUILDING]}));
    runAllActions(game); // auto-add steel: 0 -> 1

    card.onCardPlayed(player, fakeCard({tags: [Tag.BUILDING, Tag.SPACE]}));
    runAllActions(game);
    const order = cast(player.popWaitingFor(), OrOptions);
    expect(order.title).eq('Select which InSpire effect to resolve first');
    expect(order.options.map((o) => o.title)).deep.eq(['steel', 'titanium']);

    // Pick titanium first, even though steel is the one with an actual choice.
    order.options[1].cb();
    runAllActions(game);
    expect(card.data.titanium).eq(1);

    // Steel's own add-or-take choice is still pending, and comes next.
    const steelChoice = cast(player.popWaitingFor(), OrOptions);
    expect(steelChoice.options.map((o) => o.title)).deep.eq(['Add steel to InSpire', 'Take steel from InSpire']);
  });

  it('labels a trigger that can no longer do anything instead of silently skipping it', () => {
    // Microbe is capped at 2, and the triggering card below can't take one off InSpire's
    // hands (it has no resourceType) - a dead end. Paired with a fresh (auto-add) Space tag,
    // it should still show up in the order menu, labeled as having no effect.
    // A bare fakeCard is never a legal microbe target, so both of these just keep
    // auto-adding up to the cap, same as the "cannot hold the resource" case above.
    card.onCardPlayed(player, fakeCard({tags: [Tag.MICROBE]}));
    runAllActions(game); // auto-add: 0 -> 1
    card.onCardPlayed(player, fakeCard({tags: [Tag.MICROBE]}));
    runAllActions(game); // auto-add: 1 -> 2

    card.onCardPlayed(player, fakeCard({tags: [Tag.MICROBE, Tag.SPACE]}));
    runAllActions(game);
    const order = cast(player.popWaitingFor(), OrOptions);
    expect(order.options.map((o) => o.title)).deep.eq([
      'titanium',
      'a microbe (InSpire already holds 2 - no effect)',
    ]);

    // Picking the dead-end option does nothing and doesn't crash; titanium is still pending.
    order.options[1].cb();
    runAllActions(game);
    expect(card.data.microbe).eq(2);
    expect(player.popWaitingFor()).is.undefined;
    expect(card.data.titanium).eq(1);
  });

  it('the Science tag redistributes into M€ stock, not production', () => {
    card.onCardPlayed(player, fakeCard({tags: [Tag.SCIENCE]}));
    runAllActions(game); // auto-add: 0 -> 1

    card.onCardPlayed(player, fakeCard({tags: [Tag.SCIENCE]}));
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    const before = player.megaCredits;
    const productionBefore = player.production.megacredits;
    options.options[1].cb(); // Take

    expect(player.megaCredits).eq(before + 1);
    expect(player.production.megacredits).eq(productionBefore);
  });
});
