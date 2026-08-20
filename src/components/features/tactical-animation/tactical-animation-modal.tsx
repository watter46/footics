'use client';

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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-[99vw] h-[99vh] flex flex-col bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
        <TacticalAnimationBoard
          initialMatch={metadata}
          onClose={onClose}
          skipAutoImport={skipAutoImport}
        />
      </div>
    </div>,
    document.body,
  );
};
