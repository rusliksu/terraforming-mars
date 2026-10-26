import {getCard} from '@/client/cards/ClientCardManifest';
import {getSpaceName} from '@/common/boards/spaces';
import {CardName} from '@/common/cards/CardName';
import {Log} from '@/common/logs/Log';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {tileTypeToString} from '@/common/TileType';
import {undergroundResourceTokenDescription} from '@/common/underworld/UndergroundResourceToken';

/** Formats searchable log text without indexing metadata or truncated card lists. */
export function logSearchText(message: LogMessage, players: ReadonlyArray<PublicPlayerModel>, translate: (text: string) => string): string {
  return Log.parse({message: translate(message.message), data: message.data}).map((part) => {
    if (typeof part === 'string') {
      return part;
    }
    if (part === undefined) {
      return '';
    }
    const cardText = (name: CardName): string => {
      const card = getCard(name);
      if (card === undefined) {
        return '';
      }
      const title = translate(card.name.split(':')[0]);
      return part.attrs?.cost ? `${title} ${card.cost}` : title;
    };
    switch (part.type) {
    case LogMessageDataType.PLAYER:
      return players.find((player) => player.color === part.value)?.name ?? part.value;
    case LogMessageDataType.CARD:
      return cardText(part.value);
    case LogMessageDataType.CARDS:
      return part.attrs?.ellipsis ? '...' : part.value.map(cardText).join(', ');
    case LogMessageDataType.RAW_STRING:
      return part.value;
    case LogMessageDataType.TILE_TYPE:
      return translate(tileTypeToString[part.value]);
    case LogMessageDataType.UNDERGROUND_TOKEN:
      return translate(undergroundResourceTokenDescription[part.value]);
    case LogMessageDataType.SPACE:
      return getSpaceName(part.value);
    default:
      return translate(String(part.value));
    }
  }).join('').toLowerCase().replace(/\s+/g, ' ');
}
