import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {SelectResource} from '../../inputs/SelectResource';
import {Units} from '../../../common/Units';
import {CardRenderer} from '../render/CardRenderer';

export class CorporateAcquisition extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.CORPORATE_ACQUISITION,
      tags: [],
      cost: 7,

      metadata: {
        cardNumber: 'Im120',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.wild(1));
        }),
        description: 'Increase a production of your choice by 1 step.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    return new SelectResource('Select which production to increase 1 step.')
      .andThen((unitKey) => {
        const units = {...Units.EMPTY};
        units[unitKey] = 1;
        player.production.adjust(units, {log: true});
        return undefined;
      });
  }
}
