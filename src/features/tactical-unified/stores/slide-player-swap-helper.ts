import type { Slide } from '@/lib/types/tactical-unified';

export interface SwapPlayersResult {
  slide: Slide;
  benchedId: string | null;
}

/**
 * 2選手間のスワップ（ピッチ/ベンチの入れ替え含む）を計算する純粋関数
 */
export function computeSlideAfterPlayerSwap(
  slide: Slide,
  playerAId: string,
  playerBId: string,
): SwapPlayersResult | null {
  const playerA = slide.players.find((p) => p.id === playerAId);
  const playerB = slide.players.find((p) => p.id === playerBId);
  if (!playerA || !playerB) return null;

  const benchedId =
    playerA.area === 'pitch' && playerB.area === 'bench'
      ? playerAId
      : playerA.area === 'bench' && playerB.area === 'pitch'
        ? playerBId
        : null;

  const newPlayers = slide.players.map((p) => {
    if (p.id === playerAId) {
      if (playerA.area === 'pitch' && playerB.area === 'bench') {
        return {
          ...p,
          area: 'bench' as const,
          visionCone: undefined,
          badges: [],
          connectLines: [],
          focus: undefined,
        };
      }
      if (playerA.area === 'bench' && playerB.area === 'pitch') {
        return { ...p, area: 'pitch' as const, x: playerB.x, y: playerB.y };
      }
      if (playerA.area === 'pitch' && playerB.area === 'pitch') {
        return { ...p, x: playerB.x, y: playerB.y };
      }
      return p;
    }
    if (p.id === playerBId) {
      if (playerA.area === 'pitch' && playerB.area === 'bench') {
        return { ...p, area: 'pitch' as const, x: playerA.x, y: playerA.y };
      }
      if (playerA.area === 'bench' && playerB.area === 'pitch') {
        return {
          ...p,
          area: 'bench' as const,
          visionCone: undefined,
          badges: [],
          connectLines: [],
          focus: undefined,
        };
      }
      if (playerA.area === 'pitch' && playerB.area === 'pitch') {
        return { ...p, x: playerA.x, y: playerA.y };
      }
      return p;
    }

    if (benchedId && p.connectLines.some((cl) => cl.toPlayerId === benchedId)) {
      return {
        ...p,
        connectLines: p.connectLines.filter(
          (cl) => cl.toPlayerId !== benchedId,
        ),
      };
    }
    return p;
  });

  const newArrows = benchedId
    ? slide.arrows.filter(
        (a) => a.sourcePlayerId !== benchedId && a.targetPlayerId !== benchedId,
      )
    : slide.arrows;

  return {
    slide: {
      ...slide,
      players: newPlayers,
      arrows: newArrows,
    },
    benchedId,
  };
}
