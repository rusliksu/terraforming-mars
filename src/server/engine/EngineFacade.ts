import {InputResponse} from '../../common/inputs/InputResponse';
import {PlayerId} from '../../common/Types';
import {Game} from '../Game';
import {Player} from '../Player';
import {SerializedGame} from '../SerializedGame';
import {EnginePromptSnapshot, engineStateHash, promptSnapshot} from './EngineCanonical';
import {assertSupportedSnapshot, validateEngineConfig, EngineConfig} from './EngineConfig';
import {EngineInputError} from './EngineErrors';
import {EngineDependencies} from './EngineRuntime';

export interface EnginePromptState extends EnginePromptSnapshot {
  readonly actorId: PlayerId;
}

export class EngineHandle {
  public constructor(
    public readonly game: Game,
    public readonly dependencies: EngineDependencies,
  ) {}

  public serialize(): SerializedGame {
    return this.game.serialize();
  }

  public stateHash(): string {
    return engineStateHash(this.serialize());
  }

  public prompt(actorId: PlayerId): EnginePromptSnapshot | null {
    return promptSnapshot(this.game.getPlayerById(actorId));
  }

  public prompts(): Array<EnginePromptState> {
    const prompts: Array<EnginePromptState> = [];
    for (const player of this.game.players) {
      const prompt = promptSnapshot(player);
      if (prompt !== null) {
        prompts.push({actorId: player.id, ...prompt});
      }
    }
    return prompts;
  }

  /**
   * Applies one ordered input to the player that currently owns a prompt.
   *
   * This deliberately rejects unsolicited input: the host must use the actor
   * and prompt returned by the engine, not a client-supplied state blob.
   */
  public applyInput(actorId: PlayerId, input: InputResponse): void {
    const player = this.game.getPlayerById(actorId);
    if (player.getWaitingFor() === undefined) {
      throw new EngineInputError(`Player ${actorId} has no active prompt`);
    }
    player.process(input);
  }
}

/**
 * Host-neutral entry point for creating and loading a game.
 *
 * The facade never imports `Database`, `GameLoader`, or `TelegramBot`; all
 * side effects go through `EngineDependencies`.
 */
export class EngineFacade {
  public constructor(private readonly dependencies: EngineDependencies) {}

  public create(config: EngineConfig): EngineHandle {
    const validated = validateEngineConfig(config);
    const players = validated.players.map((playerConfig) => new Player(
      playerConfig.name,
      playerConfig.color,
      playerConfig.beginner === true,
      playerConfig.handicap ?? 0,
      this.dependencies.ids.nextPlayerId(),
      playerConfig.preludeHandicap,
    ));
    const game = Game.newInstance(
      this.dependencies.ids.nextGameId(),
      players,
      players[0],
      this.dependencies.ids.nextSpectatorId(),
      validated.gameOptions,
      validated.seed,
      undefined,
      this.dependencies,
    );
    return new EngineHandle(game, this.dependencies);
  }

  /**
   * Loads a base + Prelude snapshot.
   *
   * Known limitation: `Game.serialize` does not persist deferred actions, and
   * `Game.deserialize` only reconstructs phase-level prompts. This method does
   * not promise exact mid-deferred continuation.
   */
  public load(snapshot: SerializedGame): EngineHandle {
    assertSupportedSnapshot(snapshot);
    const game = Game.deserialize(snapshot, {environment: this.dependencies});
    return new EngineHandle(game, this.dependencies);
  }
}
