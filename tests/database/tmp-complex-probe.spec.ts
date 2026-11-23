import {Game} from '@/server/Game';
import {Phase} from '@/common/Phase';
import {CardName} from '@/common/cards/CardName';
import {InputResponse} from '@/common/inputs/InputResponse';
import {testGame} from '../TestGame';
import {prepareActionReplayEntry, recordAcceptedActionReplayEntry, promptFingerprintForPlayer} from '@/server/game/ActionReplay';
import {ProjectEden} from '@/server/cards/prelude2/ProjectEden';
import {ArcticAlgae} from '@/server/cards/base/ArcticAlgae';
import {BiomassCombustors} from '@/server/cards/base/BiomassCombustors';
import {Comet} from '@/server/cards/base/Comet';

describe('probe complex prompt', () => {
  it('reports deferred actions and fingerprints across serialize', () => {
    const [rawGame, player] = testGame(2, {skipInitialCardSelection: true, undoStepOption: true});
    const game = rawGame as Game;
    game.generation = 2;
    game.phase = Phase.ACTION;
    game.activePlayer = player;
    player.preludeCardsInHand.push(new ProjectEden());
    player.cardsInHand.push(new ArcticAlgae(), new BiomassCombustors(), new Comet());
    player.takeAction(false);
    const accept = (input: InputResponse) => {
      const entry = prepareActionReplayEntry(game, player.id, input);
      player.process(input);
      recordAcceptedActionReplayEntry(game, entry!);
    };
    accept({type: 'card', cards: [CardName.PROJECT_EDEN]});
    const choosePart = player.getWaitingFor()?.toModel(player);
    const cityIndex = choosePart?.type === 'or' ? choosePart.options.findIndex((option) => option.title === 'Place a city') : -1;
    accept({type: 'or', index: cityIndex, response: {type: 'option'}});
    const cityPrompt = player.getWaitingFor()?.toModel(player);
    if (cityPrompt?.type === 'space') { accept({type: 'space', spaceId: cityPrompt.spaces[0]}); }
    const livePrompt = player.getWaitingFor();
    const liveFp = promptFingerprintForPlayer(game, player.id);
    const serialized = game.serialize();
    const restored = Game.deserialize(serialized);
    const restoredPlayer = restored.getPlayerById(player.id);
    const restoredFp = promptFingerprintForPlayer(restored, player.id);
    console.log('PROBE liveDeferred=' + game.deferredActions.length + ' serializedDeferred=' + serialized.deferredActions.length);
    console.log('PROBE livePrompt=' + livePrompt?.type + ' restoredPrompt=' + restoredPlayer.getWaitingFor()?.type);
    console.log('PROBE liveFp=' + liveFp + ' restoredFp=' + restoredFp + ' equal=' + (liveFp === restoredFp));
  });
});
