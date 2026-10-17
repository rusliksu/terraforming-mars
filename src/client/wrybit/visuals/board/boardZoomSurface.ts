import {shallowReactive} from 'vue';
import type {Ref} from 'vue';
import type {GameId} from '@/common/Types';
import type {SelectSpaceModel} from '@/common/models/PlayerInputModel';

export type ZoomBoard = 'mars' | 'moon' | 'venus';
export type BoardZoomSurface = {
  boards: ReadonlyArray<ZoomBoard>;
  revision: Ref<number>;
  open(board: ZoomBoard, input?: SelectSpaceModel, owner?: symbol): void;
  close(owner?: symbol): Promise<void>;
};

const surfaces = shallowReactive(new Map<GameId, BoardZoomSurface>());

/** UI geometry only. The native input retains every available-space and response decision. */
export function boardZoomSurface(gameId: GameId): BoardZoomSurface | undefined {
  return surfaces.get(gameId);
}

export function registerBoardZoomSurface(gameId: GameId, surface: BoardZoomSurface): () => void {
  surfaces.set(gameId, surface);
  return () => {
    if (surfaces.get(gameId) === surface) {
      surfaces.delete(gameId);
    }
  };
}
