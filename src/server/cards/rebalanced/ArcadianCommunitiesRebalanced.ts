import {ArcadianCommunities} from '@/server/cards/promo/ArcadianCommunities';
import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {digit, uppercase} from '@/server/cards/Options';
import {Size} from '@/common/cards/render/Size';

export class ArcadianCommunitiesRebalanced extends ArcadianCommunities {
  public override get name() {
    return CardName.ARCADIAN_COMMUNITIES_REBALANCED;
  }
  public override get startingMegaCredits() {
    return 42;
  }
  public override get tags() {
    return [Tag.BUILDING];
  }
  public override get behavior() {
    return {stock: {steel: 10}, production: {steel: 1}};
  }
  public override get metadata() {
    return {
      ...super.metadata,
      description: 'You start with 42 M€, 10 steel and 1 steel production. AS YOUR FIRST ACTION, PLACE A COMMUNITY [PLAYER MARKER] ON A NON-RESERVED AREA.',
      renderData: CardRenderer.builder((b) => {
        b.megacredits(42).steel(10, {digit}).production((pb) => pb.steel(1)).nbsp.community().asterix();
        b.corpBox('action', (ce) => {
          ce.text('ACTION: PLACE A COMMUNITY (PLAYER MARKER) ON A NON-RESERVED AREA ADJACENT TO ONE OF YOUR TILES OR MARKED AREAS.', {size: Size.TINY, uppercase});
          ce.br;
          ce.text('EFFECT: MARKED AREAS ARE RESERVED FOR YOU. WHEN YOU PLACE A TILE THERE, GAIN 3 M€.', {size: Size.TINY, uppercase});
        });
      }),
    };
  }
}
