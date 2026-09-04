'use client';

import { Lock, Unlock } from 'lucide-react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';

export function BallHud() {
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const toggleObjectLock = useTacticalUnifiedStore((s) => s.toggleObjectLock);

  const ball = activeSlide?.ball;
  if (!ball) return null;

  return (
    <button
      type="button"
      onClick={() => toggleObjectLock('ball', 'ball')}
      className={`p-1 rounded-md transition-colors cursor-pointer ${
        ball.locked
          ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      }`}
      title={ball.locked ? 'ボールのロック解除' : 'ボールをロック (固定)'}
    >
      {ball.locked ? <Lock size={13} /> : <Unlock size={13} />}
    </button>
  );
}
