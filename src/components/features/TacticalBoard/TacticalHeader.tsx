"use client";

import React from 'react';
import { X, ArrowLeftRight, RotateCcw } from 'lucide-react';
import { useTacticalStore } from '@/hooks/use-tactical-store';

interface TacticalHeaderProps {
  metadata: any;
  onClose: () => void;
  onReset: () => void;
}

export const TacticalHeader: React.FC<TacticalHeaderProps> = ({
  metadata,
  onClose,
  onReset,
}) => {
  const { 
    isFlipped, toggleFlipped, 
    homeColor, setHomeColor, 
    awayColor, setAwayColor,
    savedSettings
  } = useTacticalStore();

  return (
    <div className="flex items-center justify-between px-6 py-2 border-b border-slate-800 bg-slate-900/50 h-14 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <h2 className="text-sm font-bold text-slate-100 mb-1 leading-none">Tactical Board</h2>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
            <span>{metadata.teams.home.name} vs {metadata.teams.away.name}</span>
            <span className="text-slate-700">|</span>
            <span>{Object.keys(savedSettings).length} Registered</span>
          </div>
        </div>
        
        <button 
          onClick={toggleFlipped}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-none border ${isFlipped ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'}`}
        >
          <ArrowLeftRight className="w-3 h-3" />
          {isFlipped ? "AWAY VIEW" : "HOME VIEW"}
        </button>

        <button 
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-none border bg-slate-800 border-slate-700 text-slate-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400"
        >
          <RotateCcw className="w-3 h-3" />
          RESET
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-3 py-1 bg-slate-800/30 rounded-full border border-slate-700/50 min-h-0">
          <div className="flex items-center gap-2">
            <input type="color" value={homeColor} onChange={e => setHomeColor(e.target.value)} className="w-3 h-3 bg-transparent border-none rounded-full cursor-pointer" />
            <span className="text-[9px] text-slate-300 font-bold uppercase">{metadata.teams.home.name}</span>
          </div>
          <div className="w-[1px] h-2 bg-slate-700"></div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-300 font-bold uppercase">{metadata.teams.away.name}</span>
            <input type="color" value={awayColor} onChange={e => setAwayColor(e.target.value)} className="w-3 h-3 bg-transparent border-none rounded-full cursor-pointer" />
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-none">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
