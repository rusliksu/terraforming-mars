/** Tags that belong in `CardRenderItem.secondaryTag` that aren't part of `Tags`. */
export enum AltSecondaryTag {
  // 'req' => used for Cutting Edge Technology's discount on cards with requirements
  REQ = 'req',
  // 'oxygen' => used for Greenery tile that increases oxygen on placement
  OXYGEN = 'oxygen',
  // 'turmoil' => used in Political Uprising community prelude
  TURMOIL = 'turmoil',
  FLOATER = 'floater',
  DATA = 'data',
  // 'animal-resource' (not 'animal') to avoid colliding with Tag.ANIMAL's own 'tag-animal' icon -
  // this one is the animal *resource* icon, for "cards that can hold an animal" renders.
  ANIMAL_RESOURCE = 'animal-resource',
  BLUE = 'blue',
  NO_TAGS = 'no_tags',

  MOON_MINING_RATE = 'moon-mine',
  MOON_HABITAT_RATE = 'moon-colony',
  MOON_LOGISTIC_RATE = 'moon-road',

  NO_PLANETARY_TAG = 'no_planetary_tag',
  WILD_RESOURCE = 'wild-resource',

  // used in Faraday CEO
  DIVERSE = 'diverse',

  // Used in Ares community corp
  ARES = 'ares',
}
