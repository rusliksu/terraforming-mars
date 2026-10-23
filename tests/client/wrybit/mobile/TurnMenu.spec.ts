import {describe, expect, it} from 'vitest';
import {OrOptionsModel, PlayerInputModel} from '@/common/models/PlayerInputModel';
import {buildTurnMenu, findTurnMenuTile, isActionMenuInput, PLAY_CARD_KEY} from '@/client/wrybit/mobile/turnMenu';

function option(title: string, extra: Record<string, unknown> = {}): PlayerInputModel {
  return {type: 'option', title, buttonLabel: title, ...extra} as unknown as PlayerInputModel;
}

function projectCard(): PlayerInputModel {
  return {
    type: 'projectCard',
    title: 'Play project card',
    buttonLabel: 'Save',
    cards: [{name: 'Ants', isDisabled: false}, {name: 'Birds', isDisabled: true}],
    paymentOptions: {},
  } as unknown as PlayerInputModel;
}

function actionMenu(options: ReadonlyArray<PlayerInputModel>): OrOptionsModel {
  return {type: 'or', title: 'Take your first action', buttonLabel: 'Save', options: [...options]};
}

describe('mobile turn menu', () => {
  it('builds tiles from the native action menu and keeps the source indices', () => {
    const input = actionMenu([
      projectCard(),
      option('Standard projects'),
      option('Claim a milestone'),
      option('End Turn'),
    ]);
    const menu = buildTurnMenu(input);
    const all = [...menu.available, ...menu.actions, ...(menu.skip === undefined ? [] : [menu.skip]), ...(menu.pass === undefined ? [] : [menu.pass])];

    expect(all).toHaveLength(4);
    expect(menu.actions.find((tile) => tile.key === PLAY_CARD_KEY)?.count).toBe(1);
    expect(menu.actions.find((tile) => tile.key === 'Play project card')?.glyph).toBe('playCard');
    expect(menu.available.map((tile) => tile.key)).toContain('Claim a milestone');
    expect(menu.skip?.key).toBe('End Turn');
    expect(findTurnMenuTile(menu, 0)?.key).toBe('Play project card');
  });

  it('offers an inline confirmation only for actions without a selection', () => {
    const menu = buildTurnMenu(actionMenu([projectCard(), option('Claim a milestone')]));
    const project = menu.actions.find((tile) => tile.key === PLAY_CARD_KEY);
    const milestone = menu.available.find((tile) => tile.key === 'Claim a milestone');

    expect(project?.confirmation).toBeUndefined();
    expect(milestone?.confirmation?.action).toBe('submit');
    expect(milestone?.confirmation?.button).toBe('Claim a milestone');
  });

  it('recognizes only the real action menu, not another or-choice or a space input', () => {
    expect(isActionMenuInput(actionMenu([projectCard()]))).toBe(true);
    expect(isActionMenuInput(undefined)).toBe(false);
    expect(isActionMenuInput({type: 'space', title: 'Place tile', buttonLabel: 'Place'} as unknown as PlayerInputModel)).toBe(false);
    expect(isActionMenuInput({...actionMenu([projectCard()]), optional: true})).toBe(false);
  });
});
