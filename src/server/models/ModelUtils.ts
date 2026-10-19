import {CardModel} from '../../common/models/CardModel';
import {ColonyModel} from '../../common/models/ColonyModel';
import {Color} from '../../common/Color';
import {IGame} from '../IGame';
import {ICard} from '../cards/ICard';
import {isIProjectCard} from '../cards/IProjectCard';
import {isICloneTagCard} from '../cards/pathfinders/ICloneTagCard';
import {IPlayer} from '../IPlayer';
import {PlayCardMetadata} from '../inputs/SelectCardToPlay';
import {IColony} from '../colonies/IColony';
import {CardName} from '../../common/cards/CardName';
import {Tag} from '../../common/cards/Tag';
import {asArray} from '../../common/utils/utils';
import {isIStandardProjectCard} from '../cards/IStandardProjectCard';
import {isDataDrivenCard} from '../cards/CustomCardRegistry';
import {NEUTRAL_COLONY_OWNER} from '../../common/Types';

export function cardsToModel(
  player: IPlayer,
  cards: ReadonlyArray<ICard>,
  options: {
    showResources?: boolean,
    showCalculatedCost?: boolean,
    extras?: Map<CardName, PlayCardMetadata>,
    enabled?: ReadonlyArray<boolean>, // If provided, then the cards with false in `enabled` are not selectable and grayed out
  } = {},
): ReadonlyArray<CardModel> {
  return cards.map((card, index) => {
    let discount = card.cardDiscount === undefined ? undefined : asArray(card.cardDiscount);

    // Too bad this is hard-coded
    if (card.name === CardName.CRESCENT_RESEARCH_ASSOCIATION) {
      discount = [{tag: Tag.MOON, amount: player.tags.count(Tag.MOON)}];
    }
    if (card.name === CardName.MARS_DIRECT) {
      discount = [{tag: Tag.MARS, amount: player.tags.count(Tag.MARS)}];
    }
    if (card.name === CardName.VENUPHILE) {
      discount = [{tag: Tag.VENUS, amount: Math.min(Math.floor(player.tags.count(Tag.VENUS) / 2), 5)}];
    }
    const inSpireResources = card.renderStoredResources?.();

    let calculatedCost = card.cost;
    if (options.showCalculatedCost) {
      if (isIStandardProjectCard(card)) {
        calculatedCost = options.extras?.get(card.name)?.overriddenCost ?? card.getAdjustedCost(player);
      } else if (isIProjectCard(card) && card.cost !== undefined) {
        calculatedCost = player.getCardCost(card);
      }
    }

    const model: CardModel = {
      resources: options.showResources ? card.resourceCount : undefined,
      name: card.name,
      calculatedCost,
      bonusResource: isIProjectCard(card) ? card.bonusResource : undefined,
      discount: discount,
      cloneTag: isICloneTagCard(card) ? card.cloneTag : undefined,
      inSpireResources,
    };
    if ('opgActionIsActive' in card && typeof card.opgActionIsActive === 'boolean') {
      model.opgActionIsActive = card.opgActionIsActive;
    }
    if (isIStandardProjectCard(card)) {
      model.standardProjectCanPayWith = card.canPayWith(player);
    }
    if (card.isDisabled) {
      model.isDisabled = true;
    } else if (options.enabled?.[index] === false) {
      model.isDisabled = true;
    }
    const playCardMetadata = options?.extras?.get(card.name);

    if ((isIProjectCard(card) || isIStandardProjectCard(card)) && card.additionalProjectCosts) {
      model.additionalProjectCosts = card.additionalProjectCosts;
    }

    const reserveUnits = playCardMetadata?.reserveUnits;
    if (reserveUnits !== undefined) {
      model.reserveUnits = reserveUnits;
    }
    const isSelfReplicatingRobotsCard = isIProjectCard(card) && player.getSelfReplicatingRobotsTargetCards().includes(card);
    if (isSelfReplicatingRobotsCard) {
      model.resources = card.resourceCount;
      model.isSelfReplicatingRobotsCard = true;
    }
    if (card.warnings.size > 0) {
      model.warnings = Array.from(card.warnings);
    }
    // A Custom Card Maker card's name isn't in the client's compiled static manifest, so
    // Card.vue can't resolve its face (cost/tags/icons/requirements) the normal way -- carry
    // that data over the wire instead. See CustomCardModel's doc comment.
    if (isDataDrivenCard(card)) {
      model.customCard = {
        type: card.type,
        cost: card.cost,
        tags: card.tags,
        requirements: card.requirements,
        metadata: card.metadata,
        resourceType: card.resourceType,
        module: 'customCards',
        compatibility: card.definition.compatibility ?? [],
      };
    }
    // Same reasoning as Custom Card Maker cards above: DeimosDoubleDownCopy's face varies
    // per instance (whichever Space event it copies), so it's not in the static manifest
    // either - see DeimosDoubleDownCopy.ts's doc comment.
    if (card.name === CardName.DEIMOS_DOUBLE_DOWN_COPY) {
      model.customCard = {
        type: card.type,
        cost: card.cost,
        tags: card.tags,
        requirements: card.requirements,
        metadata: card.metadata,
        resourceType: card.resourceType,
        module: 'sillyfication',
        compatibility: ['sillyfication'],
      };
      // Cast rather than importing the concrete class, which would create a circular
      // import through createCard.ts/AllManifests.ts (ModelUtils.ts is imported from very
      // early in that chain) - safe here since the name check above already confirms the
      // real runtime type.
      const sourceCardName = (card as unknown as {sourceCardName: CardName}).sourceCardName;
      model.combinedDisplayName = `${sourceCardName} Copy`;
    }
    return model;
  });
}

/**
 * No need for both isActive and showTitleOnly.
 */
export function coloniesToModel(game: IGame, colonies: Array<IColony>, showTileOnly: boolean, isActive: boolean = true) : Array<ColonyModel> {
  return colonies.map(
    (colony): ColonyModel => ({
      colonies: colony.colonies.map(
        (playerId): Color => playerId === NEUTRAL_COLONY_OWNER ? 'neutral' : game.getPlayerById(playerId).color,
      ),
      isActive: isActive && colony.isActive && showTileOnly === false,
      name: colony.name,
      trackPosition: colony.trackPosition,
      visitor:
        colony.visitor === undefined ?
          undefined :
          game.getPlayerById(colony.visitor).color,
    }),
  );
}
