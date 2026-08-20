'use client';

import { Shield, Sparkles } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { ChelseaTacticalBoardModal } from './chelsea-tactical-board-modal';

export const ChelseaTacticalBoardButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:border-blue-400 transition-all shadow-sm group"
      >
        <Shield className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
        <div className="flex items-center gap-1.5">
          <span>Tactical Board</span>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
            Chelsea
          </span>
        </div>
      </button>

      <ChelseaTacticalBoardModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};
