import type {
  BenchPlayer,
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { toBenchPlayer } from './invariants';

function toPitchPlayerAt(
  player: BenchPlayer,
  x: DomainPlayer['x'],
  y: DomainPlayer['y'],
): PitchPlayer {
  return {
    ...player,
    area: 'pitch',
    x,
    y,
    connectLines: [],
    badges: [],
  };
}

/** self が other の位置・エリアへ移った後の選手を返す。 */
function placeAt(self: DomainPlayer, other: DomainPlayer): DomainPlayer {
  if (self.area === 'pitch' && other.area === 'pitch') {
    return { ...self, x: other.x, y: other.y };
  }
  if (self.area === 'bench' && other.area === 'pitch') {
    return toPitchPlayerAt(self, other.x, other.y);
  }
  return toBenchPlayer(self, other.x, other.y);
}

/**
 * 2 選手の位置とエリア（ピッチ/ベンチ）を交換する純粋関数。
 * どちらかが不在・同一 ID・ロック中の場合はスライドを無変更で返す。
 */
export function swapPlayers(
  slide: DomainSlide,
  playerAId: string,
  playerBId: string,
): DomainSlide {
  if (playerAId === playerBId) return slide;
  const a = slide.players.find((p) => p.id === playerAId);
  const b = slide.players.find((p) => p.id === playerBId);
  if (!a || !b || a.locked || b.locked) return slide;

  return {
    ...slide,
    players: slide.players.map((p) => {
      if (p.id === playerAId) return placeAt(a, b);
      if (p.id === playerBId) return placeAt(b, a);
      return p;
    }),
  };
}
