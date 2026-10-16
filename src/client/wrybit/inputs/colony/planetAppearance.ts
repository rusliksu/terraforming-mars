import {ColonyName} from '@/common/colonies/ColonyName';

// Round planet picture per colony (assets/colonies-planets-round, built by scripts/make-colony-planets.py)
const PLANET_FILE: Record<ColonyName, string> = {
  [ColonyName.CALLISTO]: 'callisto',
  [ColonyName.CERES]: 'ceres',
  [ColonyName.ENCELADUS]: 'enceladus',
  [ColonyName.EUROPA]: 'europa',
  [ColonyName.GANYMEDE]: 'ganymede',
  [ColonyName.IO]: 'io',
  [ColonyName.LUNA]: 'luna',
  [ColonyName.MIRANDA]: 'miranda',
  [ColonyName.PLUTO]: 'pluto',
  [ColonyName.TITAN]: 'titan',
  [ColonyName.TRITON]: 'triton',
  [ColonyName.IAPETUS]: 'iapetus',
  [ColonyName.MERCURY]: 'mercury',
  [ColonyName.HYGIEA]: 'hygiea',
  [ColonyName.TITANIA]: 'titania',
  [ColonyName.VENUS]: 'venus',
  [ColonyName.LEAVITT]: 'leavitt',
  [ColonyName.PALLAS]: 'pallas',
  [ColonyName.DEIMOS]: 'deimos',
  [ColonyName.TERRA]: 'terra',
  [ColonyName.KUIPER]: 'kuiper',
  [ColonyName.LEAVITT_II]: 'leavitt',
  [ColonyName.IAPETUS_II]: 'iapetus',
};

// Base colour per tile, like the art on the real colony tiles
const PLANET_TONE: Partial<Record<ColonyName, string>> = {
  [ColonyName.LUNA]: '#4f8fe0',
  [ColonyName.IO]: '#e08a2c',
  [ColonyName.PLUTO]: '#c79a82',
  [ColonyName.MIRANDA]: '#8f99a6',
  [ColonyName.TITAN]: '#d0a548',
  [ColonyName.GANYMEDE]: '#a98a6a',
  [ColonyName.EUROPA]: '#9fb7c9',
  [ColonyName.CALLISTO]: '#7d7468',
  [ColonyName.ENCELADUS]: '#cfe3ef',
  [ColonyName.TRITON]: '#c6b3a8',
  [ColonyName.CERES]: '#9a948c',
  // Space station on a black photo: dark tile, so the photo's black background blends in
  [ColonyName.LEAVITT]: '#020306',
  [ColonyName.LEAVITT_II]: '#020306',
};
const DEFAULT_TONE = '#2fb0a8';

export type PlanetImage = {src: string, style: Record<string, string>};

export function planetImage(name: ColonyName): PlanetImage {
  // The pictures are already cropped square around the disc, so they simply fill the round frame
  return {
    src: 'assets/wrybit/colony-planets/' + PLANET_FILE[name] + '.webp',
    style: {width: '100%', height: '100%', left: '0', top: '0'},
  };
}

export function planetTone(name: ColonyName): string {
  return PLANET_TONE[name] ?? DEFAULT_TONE;
}

