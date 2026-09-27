import {Tag} from '../../../common/cards/Tag';
import {CorporationCard} from '../corporation/CorporationCard';
import {ICorporationCard} from '../corporation/ICorporationCard';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {PlayerInput} from '../../PlayerInput';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {CardResource} from '../../../common/CardResource';
import {Resource} from '../../../common/Resource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {Priority} from '../../deferredActions/Priority';
import {Size} from '../../../common/cards/render/Size';
import {digit} from '../Options';
import {CardRenderItem} from '../render/CardRenderItem';
import {CardRenderItemType} from '../../../common/cards/render/CardRenderItemType';
import {ICardRenderItem} from '../../../common/cards/render/Types';

type ResourceKey = 'steel' | 'titanium' | 'energy' | 'plants' | 'megacredits' | 'microbe' | 'animal' | 'data' | 'floater';

type Rule = {
  tags: ReadonlyArray<Tag>,
  key: ResourceKey,
  label: string,
};

const RULES: ReadonlyArray<Rule> = [
  {tags: [Tag.BUILDING], key: 'steel', label: 'steel'},
  {tags: [Tag.SPACE], key: 'titanium', label: 'titanium'},
  {tags: [Tag.POWER], key: 'energy', label: 'energy'},
  {tags: [Tag.PLANT], key: 'plants', label: 'plants'},
  {tags: [Tag.MICROBE], key: 'microbe', label: 'a microbe'},
  {tags: [Tag.ANIMAL], key: 'animal', label: 'an animal'},
  {tags: [Tag.SCIENCE], key: 'megacredits', label: 'M€'},
  {tags: [Tag.MARS], key: 'data', label: 'data'},
  {tags: [Tag.JOVIAN, Tag.VENUS], key: 'floater', label: 'a floater'},
];

const STANDARD_RESOURCE: Partial<Record<ResourceKey, Resource>> = {
  steel: Resource.STEEL,
  titanium: Resource.TITANIUM,
  energy: Resource.ENERGY,
  plants: Resource.PLANTS,
  megacredits: Resource.MEGACREDITS,
};

const CARD_RESOURCE: Partial<Record<ResourceKey, CardResource>> = {
  microbe: CardResource.MICROBE,
  animal: CardResource.ANIMAL,
  data: CardResource.DATA,
  floater: CardResource.FLOATER,
};

const STANDARD_ITEM_TYPE: Partial<Record<ResourceKey, CardRenderItemType>> = {
  steel: CardRenderItemType.STEEL,
  titanium: CardRenderItemType.TITANIUM,
  energy: CardRenderItemType.ENERGY,
  plants: CardRenderItemType.PLANTS,
  megacredits: CardRenderItemType.MEGACREDITS,
};

const MAX_PER_TYPE = 2;

/** Holds up to 2 units each of 9 different resource types at once - a different type per
 * tag (Building/steel, Space/titanium, Power/energy, Plant/plants, Microbe, Animal,
 * Science/M€, Mars/data, Jovian-or-Venus/floater). Whenever a played card carries one of
 * these tags, its owner either banks a unit of the matching type on this card, or (once
 * this card holds at least one) cashes one out - straight into stock for the five
 * standard-resource types (never production), or onto the card that just triggered this
 * for the four card-resource types (never a different, unrelated card already in the
 * tableau) - if that specific card can't hold it, the unit just stays on InSpire. */
export class InSpire extends CorporationCard implements ICorporationCard {
  public data: Partial<Record<ResourceKey, number>> = {};

  constructor() {
    super({
      name: CardName.IN_SPIRE,
      tags: [],
      startingMegaCredits: 43,

      behavior: {
        production: {megacredits: 3},
      },

      metadata: {
        cardNumber: 'PfC98', // Renumber
        description: 'You start with 43 M€ and 3 M€ production. When you play a given tag, put a corresponding resource on this card, or (if it already has one) take a corresponding resource from this card and gain it - or, for microbes/animals/data/floaters, add it to the card you just played, if it can hold that resource. You can keep at most 2 resources of a given type on this card.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(43, {digit}).nbsp.production((pb) => pb.megacredits(3)).br;
          b.corpBox('effect', (ce) => {
            ce.vSpace(Size.LARGE);
            ce.br;
            ce.tag(Tag.BUILDING, {size: Size.SMALL}).colon().steel(1, {size: Size.SMALL}).slash(Size.SMALL)
              .tag(Tag.SPACE, {size: Size.SMALL}).colon().titanium(1, {size: Size.SMALL});
            ce.br;
            ce.tag(Tag.POWER, {size: Size.SMALL}).colon().energy(1, {size: Size.SMALL}).slash(Size.SMALL)
              .tag(Tag.PLANT, {size: Size.SMALL}).colon().plants(1, {size: Size.SMALL});
            ce.br;
            ce.tag(Tag.MICROBE, {size: Size.SMALL}).colon().resource(CardResource.MICROBE, {size: Size.SMALL}).slash(Size.SMALL)
              .tag(Tag.ANIMAL, {size: Size.SMALL}).colon().resource(CardResource.ANIMAL, {size: Size.SMALL});
            ce.br;
            ce.tag(Tag.SCIENCE, {size: Size.SMALL}).colon().megacredits(1, {size: Size.SMALL}).slash(Size.SMALL)
              .tag(Tag.MARS, {size: Size.SMALL}).colon().resource(CardResource.DATA, {size: Size.SMALL});
            ce.br;
            ce.tag(Tag.JOVIAN, {size: Size.SMALL}).nbsp.or().nbsp.tag(Tag.VENUS, {size: Size.SMALL}).colon().resource(CardResource.FLOATER, {size: Size.SMALL});
          });
        }),
      },
    });
  }

  private getCounts(): Partial<Record<ResourceKey, number>> {
    return this.data;
  }

  private getStored(key: ResourceKey): number {
    return this.getCounts()[key] ?? 0;
  }

  private setStored(key: ResourceKey, value: number): void {
    this.data = {...this.getCounts(), [key]: value};
  }

  /** The resources currently stored on this card, as render items - shown directly on the
   * card face in the client (see ModelUtils.ts / CardExtraContent.vue), since otherwise
   * there's no way for a player to see what this card is currently holding. */
  public renderStoredResources(): ReadonlyArray<ICardRenderItem> {
    const items: Array<ICardRenderItem> = [];
    for (const rule of RULES) {
      const stored = this.getStored(rule.key);
      if (stored === 0) {
        continue;
      }
      const itemType = STANDARD_ITEM_TYPE[rule.key];
      if (itemType !== undefined) {
        const item = new CardRenderItem(itemType, stored, {size: Size.SMALL});
        if (rule.key === 'megacredits') {
          // Match the .megacredits() builder: show the count inside the coin, not as
          // repeated icons.
          item.amountInside = true;
          item.showDigit = undefined;
        }
        items.push(item);
        continue;
      }
      const cardResource = CARD_RESOURCE[rule.key];
      if (cardResource !== undefined) {
        items.push(new CardRenderItem(CardRenderItemType.RESOURCE, stored, {size: Size.SMALL, resource: cardResource}));
      }
    }
    return items;
  }

  /** For a card-resource type, only the card that just triggered this rule is a legal
   * target - never some other, unrelated card already in the tableau. If that specific
   * card isn't an eligible resource card, the unit just stays on InSpire instead of
   * prompting a broader "pick any eligible card" choice. */
  private canRedistribute(key: ResourceKey, card: ICard): boolean {
    const cardResource = CARD_RESOURCE[key];
    if (cardResource !== undefined) {
      return card.resourceType === cardResource;
    }
    return true;
  }

  private addStored(player: IPlayer, rule: Rule): void {
    this.setStored(rule.key, this.getStored(rule.key) + 1);
    player.game.log('${0} added ${1} to InSpire', (b) => b.player(player).string(rule.label));
  }

  private redistribute(player: IPlayer, rule: Rule, card: ICard): void {
    this.setStored(rule.key, this.getStored(rule.key) - 1);
    player.game.log('${0} took ${1} from InSpire', (b) => b.player(player).string(rule.label));

    const standardResource = STANDARD_RESOURCE[rule.key];
    if (standardResource !== undefined) {
      player.stock.add(standardResource, 1, {log: true});
      return;
    }
    const cardResource = CARD_RESOURCE[rule.key];
    if (cardResource !== undefined) {
      player.addResourceTo(card, {log: true});
    }
  }

  /** Whether resolving `rule` against `card` right now is a forced single outcome ('auto' -
   * only add or only take is legal), a real add-or-take choice ('choice'), or a dead end
   * ('noop' - already holds the cap and this specific card can't take one off its hands). */
  private classify(rule: Rule, card: ICard): 'auto' | 'choice' | 'noop' {
    const stored = this.getStored(rule.key);
    const canAdd = stored < MAX_PER_TYPE;
    const canTake = stored > 0 && this.canRedistribute(rule.key, card);
    if (canAdd && canTake) {
      return 'choice';
    }
    if (!canAdd && !canTake) {
      return 'noop';
    }
    return 'auto';
  }

  private resolveTrigger(player: IPlayer, rule: Rule, card: ICard): PlayerInput | undefined {
    const outcome = this.classify(rule, card);
    if (outcome === 'noop') {
      return undefined;
    }
    if (outcome === 'auto') {
      if (this.getStored(rule.key) < MAX_PER_TYPE) {
        this.addStored(player, rule);
      } else {
        this.redistribute(player, rule, card);
      }
      return undefined;
    }
    return new OrOptions(
      new SelectOption(`Add ${rule.label} to InSpire`, 'Add').andThen(() => {
        this.addStored(player, rule);
        return undefined;
      }),
      new SelectOption(`Take ${rule.label} from InSpire`, 'Take').andThen(() => {
        this.redistribute(player, rule, card);
        return undefined;
      }),
    ).setTitle('Select an option for InSpire');
  }

  /** Resolves each pending trigger from the played card one at a time (deferred, so the
   * player sees InSpire's updated state before the next one). When 2+ *different* rules are
   * pending and at least one of them isn't a forced single outcome - a real add-or-take
   * choice, or a dead-end that's worth explaining rather than silently skipping - the player
   * picks which one goes next. Plain forced triggers (and repeated tags of the same rule,
   * where there's nothing to choose between two Steel triggers) just resolve in order
   * without asking. */
  private resolveQueue(player: IPlayer, pending: ReadonlyArray<Rule>, card: ICard): void {
    if (pending.length === 0) {
      return;
    }
    const distinctRules: Array<Rule> = [];
    const seenKeys = new Set<ResourceKey>();
    for (const rule of pending) {
      if (!seenKeys.has(rule.key)) {
        seenKeys.add(rule.key);
        distinctRules.push(rule);
      }
    }
    const needsMenu = distinctRules.length >= 2 && distinctRules.some((rule) => this.classify(rule, card) !== 'auto');
    if (!needsMenu) {
      for (const rule of pending) {
        player.defer(() => this.resolveTrigger(player, rule, card), Priority.DEFAULT);
      }
      return;
    }

    player.defer(() => {
      const options = distinctRules.map((rule) => {
        const label = this.classify(rule, card) === 'noop' ?
          `${rule.label} (InSpire already holds ${MAX_PER_TYPE} - no effect)` :
          rule.label;
        return new SelectOption(label).andThen(() => {
          const index = pending.findIndex((r) => r.key === rule.key);
          const remaining = pending.slice(0, index).concat(pending.slice(index + 1));
          player.defer(() => this.resolveTrigger(player, rule, card), Priority.DEFAULT);
          this.resolveQueue(player, remaining, card);
          return undefined;
        });
      });
      return new OrOptions(...options).setTitle('Select which InSpire effect to resolve first');
    }, Priority.DEFAULT);
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    const pending: Array<Rule> = [];
    for (const rule of RULES) {
      const count = player.tags.cardTagCount(card, [...rule.tags]);
      for (let i = 0; i < count; i++) {
        pending.push(rule);
      }
    }
    this.resolveQueue(player, pending, card);
  }
}
