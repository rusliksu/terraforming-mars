import {
  CardListModel as CanonicalCardListModel,
  hashToModel as canonicalHashToModel,
  modelToHash as canonicalModelToHash,
} from '@/client/components/cardlist/CardListModel';

export type {ResourceOption, TagOption, TypeOption} from '@/client/components/cardlist/CardListModel';
export type CardListModel = CanonicalCardListModel & {costMin: number | undefined, costMax: number | undefined};

export function hashToModel(hash: string): CardListModel {
  const model: CardListModel = {...canonicalHashToModel(hash), costMin: undefined, costMax: undefined};
  const range = decodeURIComponent(hash).slice(1).split('~').slice(1).find((part) => /^c\d*-\d*$/.test(part));
  if (range !== undefined) {
    const [low, high] = range.slice(1).split('-');
    model.costMin = low === '' ? undefined : Number(low);
    model.costMax = high === '' ? undefined : Number(high);
  }
  return model;
}

export function modelToHash(model: CardListModel): string {
  const hash = canonicalModelToHash(model);
  return model.costMin === undefined && model.costMax === undefined ? hash :
    hash + encodeURIComponent(`~c${model.costMin ?? ''}-${model.costMax ?? ''}`);
}
