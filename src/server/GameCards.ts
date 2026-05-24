import {COLONIES_CARD_MANIFEST} from './cards/colonies/ColoniesCardManifest';
import {PRELUDE_CARD_MANIFEST} from './cards/prelude/PreludeCardManifest';
import {PROMO_CARD_MANIFEST} from './cards/promo/PromoCardManifest';
import {BASE_CARD_MANIFEST, CORP_ERA_CARD_MANIFEST} from './cards/StandardCardManifests';
import {TURMOIL_CARD_MANIFEST} from './cards/turmoil/TurmoilCardManifest';
import {VENUS_CARD_MANIFEST} from './cards/venusNext/VenusCardManifest';
import {COMMUNITY_CARD_MANIFEST} from './cards/community/CommunityCardManifest';
import {ARES_CARD_MANIFEST} from './cards/ares/AresCardManifest';
import {MOON_CARD_MANIFEST} from './cards/moon/MoonCardManifest';
import {PATHFINDERS_CARD_MANIFEST} from './cards/pathfinders/PathfindersCardManifest';
import {CEO_CARD_MANIFEST} from './cards/ceos/CeoCardManifest';
import {CardManifest, ModuleManifest} from './cards/ModuleManifest';
import {CardName} from '../common/cards/CardName';
import {ICard} from './cards/ICard';
import {CardFactorySpec, isCompatibleWith} from './cards/CardFactorySpec';
import {GameOptions} from './game/GameOptions';
import {ICorporationCard} from './cards/corporation/ICorporationCard';
import {isIProjectCard, IProjectCard} from './cards/IProjectCard';
import {IStandardProjectCard} from './cards/IStandardProjectCard';
import {resolveCardName} from '../common/cards/CardRenames';
import {IPreludeCard} from './cards/prelude/IPreludeCard';
import {ICeoCard} from './cards/ceos/ICeoCard';
import {PRELUDE2_CARD_MANIFEST} from './cards/prelude2/Prelude2CardManifest';
import {STAR_WARS_CARD_MANIFEST} from './cards/starwars/StarwarsCardManifest';
import {UNDERWORLD_CARD_MANIFEST} from './cards/underworld/UnderworldCardManifest';
import {GameModule} from '../common/cards/GameModule';
import {DELTA_PROJECT_CARD_MANIFEST} from './cards/delta/DeltaProjectCardManifest';

const CUSTOM_CARD_MODULE_EXCEPTIONS = new Set<CardName>([
  CardName.LAKEFRONT_RESORTS,
  CardName.UTOPIA_INVEST,
]);

const CUSTOM_CARD_MANIFEST_NAMES: Array<keyof ModuleManifest> = [
  'corporationCards',
  'projectCards',
  'preludeCards',
  'ceoCards',
];

const ALL_GAME_CARD_MANIFESTS: Array<ModuleManifest> = [
  BASE_CARD_MANIFEST,
  CORP_ERA_CARD_MANIFEST,
  PROMO_CARD_MANIFEST,
  VENUS_CARD_MANIFEST,
  COLONIES_CARD_MANIFEST,
  PRELUDE_CARD_MANIFEST,
  PRELUDE2_CARD_MANIFEST,
  TURMOIL_CARD_MANIFEST,
  COMMUNITY_CARD_MANIFEST,
  ARES_CARD_MANIFEST,
  MOON_CARD_MANIFEST,
  PATHFINDERS_CARD_MANIFEST,
  CEO_CARD_MANIFEST,
  STAR_WARS_CARD_MANIFEST,
  UNDERWORLD_CARD_MANIFEST,
  DELTA_PROJECT_CARD_MANIFEST,
];

/**
 * Returns the cards available to a game based on its `GameOptions`.
 *
 * It only includes manifests appropriate to the modules for the game,
 * and considers the banned cards, and extra-module compatibility
 * (e.g. cards in one module that can't be played without another one.)
 *
 * Therefore, this is only used when constructing a brand new instance.
 *
 * ... and one other place. When trying to determine the available standard
 * projects for a game. This is just done on the fly all the time, rather
 * that store them. (We should fix that.)
 */
export class GameCards {
  private readonly gameOptions: GameOptions;
  private readonly moduleManifests: Array<ModuleManifest>;

  public constructor(gameOptions: GameOptions) {
    this.gameOptions = gameOptions;

    const manifests: Array<[boolean, ModuleManifest]> = [
      [true, BASE_CARD_MANIFEST],
      [gameOptions.corporateEra, CORP_ERA_CARD_MANIFEST],
      [gameOptions.preludeExtension, PRELUDE_CARD_MANIFEST],
      [gameOptions.prelude2Expansion, PRELUDE2_CARD_MANIFEST],
      [gameOptions.venusNextExtension, VENUS_CARD_MANIFEST],
      [gameOptions.coloniesExtension, COLONIES_CARD_MANIFEST],
      [gameOptions.turmoilExtension, TURMOIL_CARD_MANIFEST],
      [gameOptions.aresExtension, ARES_CARD_MANIFEST],
      [gameOptions.promoCardsOption, PROMO_CARD_MANIFEST],
      [gameOptions.communityCardsOption, COMMUNITY_CARD_MANIFEST],
      [gameOptions.moonExpansion, MOON_CARD_MANIFEST],
      [gameOptions.pathfindersExpansion, PATHFINDERS_CARD_MANIFEST],
      [gameOptions.ceoExtension, CEO_CARD_MANIFEST],
      [gameOptions.starWarsExpansion, STAR_WARS_CARD_MANIFEST],
      [gameOptions.underworldExpansion, UNDERWORLD_CARD_MANIFEST],
    ];

    this.moduleManifests = manifests
      .filter(([option, _manifest]) => option === true)
      .map(([_option, manifest]) => manifest);
  }

  private instantiate<T extends ICard>(manifest: CardManifest<T>): Array<T> {
    return CardManifest.values(manifest)
      .filter((factory) => factory.instantiate !== false)
      .filter((factory) => isCompatibleWith(factory, this.gameOptions))
      .map((factory) => new factory.Factory());
  }

  public getProjectCards() {
    const cards = this.getCards<IProjectCard>('projectCards');
    this.addCustomCards(cards, this.gameOptions.includedCards);
    return cards.filter(isIProjectCard);
  }
  public getStandardProjects() {
    return this.getCards<IStandardProjectCard>('standardProjects');
  }
  public getCorporationCards(): Array<ICorporationCard> {
    const cards = this.getCards<ICorporationCard>('corporationCards')
      .filter((card) => card.name !== CardName.BEGINNER_CORPORATION);
    this.addCustomCards(cards, this.gameOptions.customCorporationsList, {respectModuleSelection: true});
    return cards;
  }
  public getPreludeCards() {
    let preludes = this.getCards<IPreludeCard>('preludeCards');
    // https://github.com/terraforming-mars/terraforming-mars/issues/2833
    // Make Valley Trust playable even when Preludes is out of the game
    // by preparing a deck of preludes.
    if (preludes.length === 0) {
      preludes = this.instantiate(PRELUDE_CARD_MANIFEST.preludeCards);
    }
    this.addCustomCards(preludes, this.gameOptions.customPreludes, {respectModuleSelection: true});

    if (this.gameOptions.twoCorpsVariant) {
      // As each player who doesn't have Merger is dealt Merger in SelectInitialCards.ts,
      // remove it from the deck to avoid possible conflicts (e.g. Valley Trust / New Partner)
      preludes = preludes.filter((c) => c.name !== CardName.MERGER);
    }
    return preludes;
  }

  public getCeoCards() {
    const ceos = this.getCards<ICeoCard>('ceoCards');
    this.addCustomCards(ceos, this.gameOptions.customCeos, {respectModuleSelection: true});
    return ceos;
  }

  /**
   * Instantiate every card in `customList` and add them to `cards` (except those that already exist in `cards`),
   */
  private addCustomCards<T extends ICard>(
    cards: Array<T>,
    customList: ReadonlyArray<CardName> = [],
    options: {respectModuleSelection?: boolean} = {},
  ): void {
    for (const cardName of customList) {
      const canonicalName = resolveCardName(cardName);
      if (cards.findIndex((c) => c.name === canonicalName) > -1) {
        continue;
      }

      const entry = this.findCustomCardFactory(canonicalName);
      if (entry === undefined) {
        throw new Error(`Card [${cardName}] not found`);
      }

      if (options.respectModuleSelection === true && !this.isCustomCardCompatible(canonicalName, entry)) {
        continue;
      }

      const card = new entry.factory.Factory();
      cards.push(<T> card);
    }
  }

  private isCustomCardCompatible(cardName: CardName, entry: {module: GameModule, factory: CardFactorySpec<ICard>}): boolean {
    const ignoresModule = CUSTOM_CARD_MODULE_EXCEPTIONS.has(cardName);
    if (ignoresModule === false && this.isModuleEnabled(entry.module) === false) {
      return false;
    }

    return isCompatibleWith(entry.factory, this.gameOptions);
  }

  private findCustomCardFactory(cardName: CardName): {module: GameModule, factory: CardFactorySpec<ICard>} | undefined {
    for (const moduleManifest of ALL_GAME_CARD_MANIFESTS) {
      for (const manifestName of CUSTOM_CARD_MANIFEST_NAMES) {
        const cardManifest = moduleManifest[manifestName] as CardManifest<ICard>;
        const factory = cardManifest[cardName];
        if (factory !== undefined) {
          return {module: moduleManifest.module, factory};
        }
      }
    }
    return undefined;
  }

  private isModuleEnabled(module: GameModule): boolean {
    switch (module) {
    case 'base':
      return true;
    case 'corpera':
      return this.gameOptions.corporateEra;
    case 'promo':
      return this.gameOptions.promoCardsOption;
    case 'venus':
      return this.gameOptions.venusNextExtension;
    case 'colonies':
      return this.gameOptions.coloniesExtension;
    case 'prelude':
      return this.gameOptions.preludeExtension;
    case 'prelude2':
      return this.gameOptions.prelude2Expansion;
    case 'turmoil':
      return this.gameOptions.turmoilExtension;
    case 'community':
      return this.gameOptions.communityCardsOption;
    case 'ares':
      return this.gameOptions.aresExtension;
    case 'moon':
      return this.gameOptions.moonExpansion;
    case 'pathfinders':
      return this.gameOptions.pathfindersExpansion;
    case 'ceo':
      return this.gameOptions.ceoExtension;
    case 'starwars':
      return this.gameOptions.starWarsExpansion;
    case 'underworld':
      return this.gameOptions.underworldExpansion;
    case 'deltaProject':
      return this.gameOptions.deltaProjectExpansion;
    }
  }

  private getCards<T extends ICard>(cardManifestName: keyof ModuleManifest) : Array<T> {
    let cards: Array<T> = [];
    for (const moduleManifest of this.moduleManifests) {
      // a bit of a hack, but since this is a private API, this is reasonable.
      const cardManifest: CardManifest<T> = moduleManifest[cardManifestName] as CardManifest<T>;
      cards.push(...this.instantiate(cardManifest));
    }

    cards = this.filterBannedCards(cards);
    cards = this.filterReplacedCards(cards);
    return cards;
  }

  /* Remove cards excluded by choice in game options */
  private filterBannedCards<T extends ICard>(cards: Array<T>): Array<T> {
    return cards.filter((card) => {
      return this.gameOptions.bannedCards.includes(card.name) !== true;
    });
  }

  /* Remove cards that are replaced by new versions in other manifests */
  private filterReplacedCards<T extends ICard>(cards: Array<T>): Array<T> {
    return cards.filter((card) => {
      for (const manifest of this.moduleManifests) {
        if (manifest.cardsToRemove.has(card.name)) {
          return false;
        }
      }
      return true;
    });
  }
}
