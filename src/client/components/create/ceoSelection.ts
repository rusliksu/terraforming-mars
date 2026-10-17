import {CardName} from '@/common/cards/CardName';
import {Expansion, GameModule, EXPANSIONS} from '@/common/cards/GameModule';
import {byModule, byType, getCards} from '@/client/cards/ClientCardManifest';
import {CardType} from '@/common/cards/CardType';
import {toName} from '@/common/utils/utils';

function ceoCardNames(module: GameModule): Array<CardName> {
  return getCards(byModule(module))
    .filter(byType(CardType.CEO))
    .map(toName);
}

export function defaultCeoSelection(expansions: Readonly<Record<Expansion, boolean>>): Array<CardName> {
  return ceoCardNames('base').concat(...EXPANSIONS.map((expansion) => expansions[expansion] ? ceoCardNames(expansion) : []));
}
