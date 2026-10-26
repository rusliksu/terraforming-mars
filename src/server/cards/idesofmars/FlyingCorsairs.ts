import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardResource} from '../../../common/CardResource';
import {RemoveResourcesFromCard} from '../../deferredActions/RemoveResourcesFromCard';
import {AddResourcesToCard} from '../../deferredActions/AddResourcesToCard';
import {CardRenderer} from '../render/CardRenderer';
import {all, uppercase} from '../Options';

export class FlyingCorsairs extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.FLYING_CORSAIRS,
      tags: [],
      cost: 1,

      metadata: {
        cardNumber: 'IM131',
        renderData: CardRenderer.builder((b) => {
          b.text('steal', {uppercase}).resource(CardResource.FLOATER, {all}).br;
          b.minus().resource(CardResource.FLOATER, {amount: 2, all});
        }),
        description: 'Steal 1 floater from an opponent (added to one of your own floater cards, ' +
          'if you have one). Remove 2 floaters from an opponent.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return RemoveResourcesFromCard.getAvailableTargetCards(player, CardResource.FLOATER, 'opponents').length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new RemoveResourcesFromCard(player, CardResource.FLOATER, 1, {
      source: 'opponents',
      mandatory: true,
      log: true,
      title: 'Select a floater card to steal 1 floater from',
    })).andThen((response) => {
      if (response.proceed) {
        player.game.defer(new AddResourcesToCard(player, CardResource.FLOATER, {log: true}));
      }
      return undefined;
    });

    player.game.defer(new RemoveResourcesFromCard(player, CardResource.FLOATER, 2, {
      source: 'opponents',
      mandatory: true,
      log: true,
      title: 'Select a floater card to remove 2 floaters from',
    }));

    return undefined;
  }
}
