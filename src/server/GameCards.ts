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
import {SILLYFICATION_CARD_MANIFEST} from './cards/sillyfication/SillyficationCardManifest';
import {BETTER_MARS_CARD_MANIFEST} from './cards/betterMars/BetterMarsCardManifest';
import {CONGLOMERATES_CARD_MANIFEST} from './cards/conglomerates/ConglomeratesCardManifest';
import {DELTA_PROJECT_CARD_MANIFEST} from './cards/delta/DeltaProjectCardManifest';
import {CORPORATE_BETTERMENTS_CARD_MANIFEST} from './cards/corporatebetterments/CorporateBettermentsCardManifest';
import {IDES_OF_MARS_CARD_MANIFEST} from './cards/idesofmars/IdesOfMarsCardManifest';
import {ROB_ANTILLES_CARD_MANIFEST} from './cards/robantilles/RobAntillesCardManifest';
import {VENUS_PHASE_2_CARD_MANIFEST} from './cards/venusPhase2/VenusPhase2CardManifest';
import {INDUSTRIES_CARD_MANIFEST} from './cards/industries/IndustriesCardManifest';
import {HIGH_ORBIT_CARD_MANIFEST} from './cards/highOrbit/HighOrbitCardManifest';
import {SOLARIS_CARD_MANIFEST} from './cards/solaris/SolarisCardManifest';
import {DataDrivenCard} from './cards/DataDrivenCard';
import {getAllCustomCardDefinitions} from './cards/CustomCardRegistry';
import {GameModule} from '../common/cards/GameModule';
import {ALL_MODULE_MANIFESTS} from './cards/AllManifests';

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
      [gameOptions.sillyficationExpansion, SILLYFICATION_CARD_MANIFEST],
      [gameOptions.betterMarsExpansion, BETTER_MARS_CARD_MANIFEST],
      [gameOptions.conglomeratesExpansion, CONGLOMERATES_CARD_MANIFEST],
      [gameOptions.corporateBettermentsExpansion, CORPORATE_BETTERMENTS_CARD_MANIFEST],
      [gameOptions.idesOfMarsExpansion, IDES_OF_MARS_CARD_MANIFEST],
      [gameOptions.robAntillesExpansion, ROB_ANTILLES_CARD_MANIFEST],
      // DeltaProject's own card (the prelude) is force-dealt directly in Game.ts, not drawn
      // from this pool - but other cards depending on the expansion (e.g. Epsilon Dample,
      // via its `compatibility: 'deltaProject'`) still need this manifest present here.
      [gameOptions.deltaProjectExpansion, DELTA_PROJECT_CARD_MANIFEST],
      [gameOptions.venusPhase2Expansion, VENUS_PHASE_2_CARD_MANIFEST],
      [gameOptions.industriesExpansion, INDUSTRIES_CARD_MANIFEST],
      [gameOptions.highOrbitExpansion, HIGH_ORBIT_CARD_MANIFEST],
      [gameOptions.solarisExpansion, SOLARIS_CARD_MANIFEST],
    ];

    this.moduleManifests = manifests
      .filter(([option, _manifest]) => option === true)
      .map(([_option, manifest]) => manifest);
  }

  private instantiate<T extends ICard>(manifest: CardManifest<T>): Array<T> {
    const result: Array<T> = [];
    for (const factory of CardManifest.values(manifest)) {
      if (factory.instantiate === false || !isCompatibleWith(factory, this.gameOptions)) {
        continue;
      }
      result.push(new factory.Factory());
    }
    return result;
  }

  public getProjectCards() {
    const cards = this.getCards<IProjectCard>('projectCards');
    this.addCustomCards(cards, this.gameOptions.includedCards);
    this.addCustomCardLibrary(cards);
    const highOrbitCardNames = new Set<CardName>(CardManifest.keys(HIGH_ORBIT_CARD_MANIFEST.projectCards));
    const replacesMineralDeposit = this.gameOptions.includedCards.includes(CardName.MINERAL_DEPOSIT_REBALANCED);
    return cards.filter(isIProjectCard).filter((card) =>
      !highOrbitCardNames.has(card.name) && (!replacesMineralDeposit || card.name !== CardName.MINERAL_DEPOSIT));
  }
  public getStandardProjects() {
    return this.getCards<IStandardProjectCard>('standardProjects');
  }
  public getCorporationCards(): Array<ICorporationCard> {
    if (this.gameOptions.customCorporationsList.length > 0) {
      const selected: Array<ICorporationCard> = [];
      this.addCustomCards(selected, this.gameOptions.customCorporationsList, {respectModuleSelection: true});
      return selected.filter((card) => card.name !== CardName.BEGINNER_CORPORATION);
    }
    const cards = this.getCards<ICorporationCard>('corporationCards')
      .filter((card) => card.name !== CardName.BEGINNER_CORPORATION);
    return cards;
  }
  public getPreludeCards() {
    let preludes: Array<IPreludeCard>;
    if (this.gameOptions.customPreludes.length > 0) {
      preludes = [];
      this.addCustomCards(preludes, this.gameOptions.customPreludes, {respectModuleSelection: true});
    } else {
      preludes = this.getCards<IPreludeCard>('preludeCards');
      // https://github.com/terraforming-mars/terraforming-mars/issues/2833
      // Make Valley Trust playable even when Preludes is out of the game
      // by preparing a deck of preludes.
      if (preludes.length === 0) {
        preludes = this.instantiate(PRELUDE_CARD_MANIFEST.preludeCards);
      }
    }
    if (this.gameOptions.twoCorpsVariant) {
      // As each player who doesn't have Merger is dealt Merger in SelectInitialCards.ts,
      // remove it from the deck to avoid possible conflicts (e.g. Valley Trust / New Partner)
      preludes = preludes.filter((c) => c.name !== CardName.MERGER);
    }
    return preludes;
  }

  public getCeoCards() {
    if (this.gameOptions.customCeos.length > 0) {
      const selected: Array<ICeoCard> = [];
      this.addCustomCards(selected, this.gameOptions.customCeos, {respectModuleSelection: true});
      return selected;
    }
    return this.getCards<ICeoCard>('ceoCards');
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
    for (const moduleManifest of ALL_MODULE_MANIFESTS) {
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
    case 'sillyfication':
      return this.gameOptions.sillyficationExpansion;
    case 'betterMars':
      return this.gameOptions.betterMarsExpansion;
    case 'customCards':
      return this.gameOptions.customCardsExpansion;
    case 'conglomerates':
      return this.gameOptions.conglomeratesExpansion;
    case 'corporateBetterments':
      return this.gameOptions.corporateBettermentsExpansion;
    case 'idesOfMars':
      return this.gameOptions.idesOfMarsExpansion;
    case 'robAntilles':
      return this.gameOptions.robAntillesExpansion;
    case 'moreParties':
      return this.gameOptions.morePartiesExpansion;
    case 'venusPhase2':
      return this.gameOptions.venusPhase2Expansion;
    case 'industries':
      return this.gameOptions.industriesExpansion;
    case 'highOrbit':
      return this.gameOptions.highOrbitExpansion;
    case 'solaris':
      return this.gameOptions.solarisExpansion;
    }
  }

  /**
   * Adds every approved Card Maker submission whose expansion-compatibility is fully satisfied
   * by this game's enabled expansions -- gated by the "Custom Cards" toggle. Unlike
   * `addCustomCards`, these aren't looked up by name from a `customList`: they're the entire
   * approved registry, so it's an all-or-nothing toggle rather than a per-card opt-in.
   */
  private addCustomCardLibrary(cards: Array<IProjectCard>): void {
    if (!this.gameOptions.customCardsExpansion) {
      return;
    }
    const customCards: Array<IProjectCard> = [];
    for (const def of getAllCustomCardDefinitions()) {
      const name = def.cardName as unknown as CardName;
      if (cards.findIndex((c) => c.name === name) > -1) {
        continue;
      }
      if (!def.compatibility.every((expansion) => this.gameOptions.expansions[expansion])) {
        continue;
      }
      customCards.push(new DataDrivenCard(def));
    }
    cards.push(...this.filterBannedCards(customCards));
  }

  /* Instantiates compatible cards from each enabled module, then applies game exclusions. */
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
    const presentNames = new Set(cards.map((card) => card.name));
    return cards.filter((card) => {
      for (const manifest of this.moduleManifests) {
        if (manifest.cardsToRemove.has(card.name)) {
          return false;
        }
        const replacement = manifest.conditionalCardsToRemove.get(card.name);
        if (replacement !== undefined && presentNames.has(replacement)) {
          return false;
        }
      }
      return true;
    });
  }
}
