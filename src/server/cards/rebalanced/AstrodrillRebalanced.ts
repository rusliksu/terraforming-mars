import {Astrodrill} from '@/server/cards/promo/Astrodrill';
import {CardName} from '@/common/cards/CardName';
import {CardResource} from '@/common/CardResource';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {digit} from '@/server/cards/Options';

export class AstrodrillRebalanced extends Astrodrill {
  public override get name() {
    return CardName.ASTRODRILL_REBALANCED;
  }
  public override get startingMegaCredits() {
    return 40;
  }
  public override get behavior() {
    return {addResources: 4};
  }
  public override get metadata() {
    return {
      ...super.metadata,
      description: 'You start with 40 M€ and 4 asteroid resources.',
      renderData: CardRenderer.builder((b) => {
        b.megacredits(40).nbsp.resource(CardResource.ASTEROID, {amount: 4, digit});
        b.corpBox('action', (ce) => {
          ce.action(undefined, (eb) => {
            eb.empty().startAction.resource(CardResource.ASTEROID).asterix().slash().wild(1).or();
          });
          ce.br;
          ce.action('Add an asteroid resource to ANY card OR gain any standard resource, OR remove an asteroid resource from this card to gain 3 titanium.', (eb) => {
            eb.resource(CardResource.ASTEROID).startAction.titanium(3, {digit});
          });
        });
      }),
    };
  }
}
