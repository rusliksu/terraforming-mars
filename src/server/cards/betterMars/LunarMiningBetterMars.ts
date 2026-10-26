import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {LunarMining} from '../colonies/LunarMining';
import {CardRenderer} from '../render/CardRenderer';

/** Lunar Mining, but it counts Moon tags instead of Earth tags. */
export class LunarMiningBetterMars extends LunarMining {
  public override get name() {
    return CardName.LUNAR_MINING_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.MOON];
  }

  public override get behavior() {
    return {
      production: {titanium: {tag: Tag.MOON, per: 2}},
    };
  }

  public override get metadata() {
    return {
      ...super.metadata,
      cardNumber: 'X78',
      renderData: CardRenderer.builder((b) => {
        b.production((pb) => {
          pb.titanium(1).slash().tag(Tag.MOON, 2);
        });
      }),
      description: 'Increase your titanium production 1 step for every 2 Moon tags you have in play, including this.',
    };
  }
}
