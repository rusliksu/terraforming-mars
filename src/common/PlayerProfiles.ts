import {Color} from './Color';

export type PlayerProfile = {
  id: string;
  name: string;
  preferredColor: Color;
  aliases: ReadonlyArray<string>;
};

export const PLAYER_PROFILES: ReadonlyArray<PlayerProfile> = [
  {
    id: 'leha',
    name: 'Леха',
    preferredColor: 'orange',
    aliases: ['лёха', 'леха', 'лёха инженер', 'леха инженер', 'асмо', 'asmo'],
  },
  {
    id: 'alexey',
    name: 'Алексей',
    preferredColor: 'yellow',
    aliases: ['алексей', 'алексей часовщик', 'часовщик', 'алексей константинов', 'константинов алексей'],
  },
  {
    id: 'vvbminsk',
    name: 'vvbMinsk',
    preferredColor: 'green',
    aliases: ['vvb', 'vvbminsk', 'minsk', 'минск', 'евгений', 'женя'],
  },
  {
    id: 'nuke',
    name: 'Nuke',
    preferredColor: 'purple',
    aliases: ['nuke', 'midilo', 'midilobusim', 'никита'],
  },
];

export function getPlayerProfileById(id: string): PlayerProfile | undefined {
  return PLAYER_PROFILES.find((profile) => profile.id === id);
}

export function getPlayerProfileByName(name: string): PlayerProfile | undefined {
  const normalized = (name || '').trim().toLowerCase();
  if (normalized === '') {
    return undefined;
  }
  return PLAYER_PROFILES.find((profile) =>
    profile.name.trim().toLowerCase() === normalized ||
    profile.aliases.includes(normalized));
}
