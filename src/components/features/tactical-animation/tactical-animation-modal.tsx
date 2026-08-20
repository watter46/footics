'use client';

import { Film, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';
import type { Match } from '@/types';
import { TacticalAnimationBoard } from './tactical-animation-board';

interface TacticalAnimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: Match;
  matchId?: string;
  skipAutoImport?: boolean;
}

export const TacticalAnimationModal: React.FC<TacticalAnimationModalProps> = ({
  isOpen,
  onClose,
  metadata,
  matchId: _matchId,
  skipAutoImport = false,
}) => {
  const importFromMatch = useTacticalAnimationStore((s) => s.importFromMatch);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && metadata && !skipAutoImport) {
      importFromMatch(metadata);
    }
  }, [isOpen, metadata, importFromMatch, skipAutoImport]);

  if (!isOpen || !mounted) return null;

  const homeName = metadata?.teams?.home?.name || 'Home';
  const awayName = metadata?.teams?.away?.name || 'Away';
  const score = metadata?.score || 'vs';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-[98vw] h-[98vh] flex flex-col bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Film className="w-4 h-4" />
              <span>戦術アニメーション・動画クリエイター</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800 text-xs text-slate-300">
              <span className="font-semibold text-white">{homeName}</span>
              <span className="text-slate-500">{score}</span>
              <span className="font-semibold text-white">{awayName}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700"
          >
            <X className="w-4 h-4" />
            <span>閉じる</span>
          </button>
        </div>

        {/* ボード本体 */}
        <div className="flex-1 min-h-0">
          <TacticalAnimationBoard
            initialMatch={metadata}
            onClose={onClose}
            skipAutoImport={skipAutoImport}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};
