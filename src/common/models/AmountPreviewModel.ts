import {CardName} from '../cards/CardName';
import {CardResource} from '../CardResource';
import {Resource} from '../Resource';

/** Display metadata supplied by the native producer; never a client effect evaluator. */
export type AmountSide =
  {kind: 'stock' | 'production' | 'cost', resource: Resource, perStep: number} |
  {kind: 'card', card: CardName, resource: CardResource, perStep: number};

export type AmountPreview = {sourceCard: CardName, from: AmountSide, to: AmountSide};
export type AmountSideModel = AmountSide & {before?: number};
export type AmountPreviewModel = {sourceCard: CardName, from: AmountSideModel, to: AmountSideModel};
