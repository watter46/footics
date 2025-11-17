import { db } from '@/lib/db';
import type { ActionMaster } from '@/lib/types';

const cachedActions = new Map<string, ActionMaster | null>();

const findActionByName = async (name: string): Promise<ActionMaster | null> => {
  if (cachedActions.has(name)) {
    return cachedActions.get(name) ?? null;
  }

  try {
    const action = await db.actions_master.where('name').equals(name).first();
    cachedActions.set(name, action ?? null);
    return action ?? null;
  } catch (error) {
    console.error('アクションの取得に失敗しました', name, error);
    cachedActions.set(name, null);
    return null;
  }
};

export const preloadSubstitutionActionIds = async (): Promise<void> => {
  await Promise.all([
    findActionByName('交代IN'),
    findActionByName('交代OUT'),
  ]);
};

export const recordSubstitutionEvent = async (
  matchId: number | undefined,
  teamId: number | undefined,
  playerId: number | null | undefined,
  tempSlotId: string | null | undefined,
  matchTime: string,
  positionName: string | undefined,
  type: 'in' | 'out'
): Promise<void> => {
  if (matchId == null || teamId == null || !Number.isFinite(teamId)) {
    console.error('交代イベントの記録に必要な情報が不足しています', {
      matchId,
      teamId,
      playerId,
      tempSlotId,
    });
    return;
  }

  if (playerId == null && tempSlotId == null) {
    console.error(
      '交代イベントの記録に必要な選手情報（playerId または tempSlotId）が不足しています',
      {
        matchId,
        playerId,
        tempSlotId,
      }
    );
    return;
  }

  const actionName = type === 'in' ? '交代IN' : '交代OUT';
  const action = await findActionByName(actionName);

  if (!action?.id) {
    console.error(`${actionName} アクションがDBに存在しません`);
    return;
  }

  try {
    await db.events.add({
      matchId,
      teamId,
      playerId: playerId ?? null,
      tempSlotId: tempSlotId ?? null,
      actionId: action.id,
      matchTime,
      positionName,
    });
  } catch (error) {
    console.error('交代イベントの記録に失敗しました', {
      matchId,
      playerId: playerId ?? null,
      tempSlotId: tempSlotId ?? null,
      actionId: action.id,
      error,
    });
  }
};
