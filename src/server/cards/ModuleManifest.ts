import {CardName} from '../../common/cards/CardName';
import {GameModule} from '../../common/cards/GameModule';
import {GlobalEventName} from '../../common/turmoil/globalEvents/GlobalEventName';
import {ICorporationCard} from './corporation/ICorporationCard';
import {CardFactorySpec} from './CardFactorySpec';
import {IProjectCard} from './IProjectCard';
import {ICard} from './ICard';
import {IStandardProjectCard} from './IStandardProjectCard';
import {IStandardActionCard} from './IStandardActionCard';
import {IPreludeCard} from './prelude/IPreludeCard';
import {ICeoCard} from './ceos/ICeoCard';
import {IGlobalEvent} from '../turmoil/globalEvents/IGlobalEvent';

export type CardManifest<T extends ICard> = Partial<Record<CardName, CardFactorySpec<T>>>;
export type GlobalEventManifest = Partial<Record<GlobalEventName, CardFactorySpec<IGlobalEvent>>>;

export namespace CardManifest {
  export function keys<T extends ICard>(manifest: CardManifest<T>): Array<CardName> {
    return Object.keys(manifest) as Array<CardName>;
  }
  export function values<T extends ICard>(manifest: CardManifest<T>): Array<CardFactorySpec<T>> {
    return Object.values(manifest) as Array<CardFactorySpec<T>>;
  }
  export function entries<T extends ICard>(manifest: CardManifest<T>): Array<[CardName, CardFactorySpec<T>]> {
    return keys(manifest).map((key) => {
      const value = manifest[key];
      if (value === undefined) {
        throw new Error(`Manifest has key ${key} but no entry.`);
      }
      return [key, value];
    });
  }
}

export namespace GlobalEventManifest {
  export function keys(manifest: GlobalEventManifest): Array<GlobalEventName> {
    return Object.keys(manifest) as Array<GlobalEventName>;
  }
  export function values(manifest: GlobalEventManifest): Array<CardFactorySpec<IGlobalEvent>> {
    return Object.values(manifest) as Array<CardFactorySpec<IGlobalEvent>>;
  }
  export function entries(manifest: GlobalEventManifest): Array<[GlobalEventName, CardFactorySpec<IGlobalEvent>]> {
    return keys(manifest).map((key) => {
      const value = manifest[key];
      if (value === undefined) {
        throw new Error(`Manifest has key ${key} but no entry.`);
      }
      return [key, value];
    });
  }
}

export class ModuleManifest {
  module: GameModule;
  projectCards : CardManifest<IProjectCard>;
  cardsToRemove: ReadonlySet<CardName>;
  /**
   * Like `cardsToRemove`, but for a base card whose replacement is itself only
   * available in certain configurations (e.g. a BetterMars tag-swap that also needs the
   * Moon expansion, on top of BetterMars itself). The base card (map key) is only
   * actually removed once its replacement (map value) makes it through the replacement's
   * own compatibility check for this game - so a replacement that didn't pass
   * compatibility leaves the original base card in the pool instead of leaving neither.
   */
  conditionalCardsToRemove: ReadonlyMap<CardName, CardName>;
  corporationCards : CardManifest<ICorporationCard>;
  preludeCards : CardManifest<IPreludeCard>;
  ceoCards: CardManifest<ICeoCard>;
  standardProjects : CardManifest<IStandardProjectCard>;
  standardActions : CardManifest<IStandardActionCard>;
  globalEvents: GlobalEventManifest;
  constructor(arg: {
    module: GameModule,
    projectCards?: CardManifest<IProjectCard>,
    cardsToRemove?: Array<CardName>,
    conditionalCardsToRemove?: ReadonlyMap<CardName, CardName>,
    corporationCards?: CardManifest<ICorporationCard>,
    ceoCards?: CardManifest<ICeoCard>,
    preludeCards?: CardManifest<IPreludeCard>,
    standardProjects?: CardManifest<IStandardProjectCard>,
    standardActions?: CardManifest<IStandardActionCard>,
    globalEvents?: GlobalEventManifest,
  }) {
    this.module = arg.module;
    this.projectCards = arg.projectCards || {};
    this.cardsToRemove = new Set(arg.cardsToRemove || []);
    this.conditionalCardsToRemove = arg.conditionalCardsToRemove ?? new Map();
    this.corporationCards = arg.corporationCards || {};
    this.preludeCards = arg.preludeCards || {};
    this.ceoCards = arg.ceoCards || {};
    this.standardProjects = arg.standardProjects || {};
    this.standardActions = arg.standardActions || {};
    this.globalEvents = arg.globalEvents || {};
  }
}
