import { db } from '@/lib/db';
import type { Match } from '@/types';

/**
 * Tactical Project 用の Match データ取得ヘルパー。
 * UIコンポーネントからの DB 直接参照を防止する。
 */
export async function getMatchForTacticalProject(
  matchId: string | number,
): Promise<Match | null> {
  try {
    const numId = Number(matchId);
    const match =
      (!Number.isNaN(numId) ? await db.matches.get(numId as never) : null) ||
      (await db.matches.get(matchId as string)) ||
      (await db.matches.get(String(matchId)));
    return match ?? null;
  } catch (error) {
    console.error('Failed to get match for tactical project:', error);
    return null;
  }
}
