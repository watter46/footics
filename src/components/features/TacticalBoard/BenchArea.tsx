"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Users, ChevronDown, LayoutGrid, Layout } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FORMATION_LIST, FormationType, FormationMode } from '@/lib/data/formations';

interface BenchAreaProps {
  teamName: string;
  onTeamToggle: () => void;
  onAlignGrid: () => void;
  formationMode: FormationMode;
  onFormationModeChange: (mode: FormationMode) => void;
  onFormationChange?: (formation: FormationType) => void;
  children?: React.ReactNode;
}

/**
 * 控え選手エリア (ベンチ)
 * 自由配置可能な領域。ヘッダーのボタンからグリッド整列が可能。
 */
export const BenchArea: React.FC<BenchAreaProps> = ({ 
  teamName, 
  onTeamToggle, 
  onAlignGrid,
  formationMode,
  onFormationModeChange,
  onFormationChange,
  children 
}) => {
  const { setNodeRef } = useDroppable({
    id: 'bench',
    data: {
      accepts: ['player'],
    },
  });

  return (
    <div className="w-full h-full bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-inner">
      {/* Bench Header */}
      <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-800 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.15em]">Player Bench</span>
          </div>
          
          {/* グリッド整列ボタン */}
          <button 
            onClick={onAlignGrid}
            title="Align Grid"
            className="p-1 px-2 hover:bg-slate-700/50 rounded flex items-center gap-1.5 transition-none group border border-transparent hover:border-slate-600"
          >
            <LayoutGrid className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-400" />
            <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-300 uppercase leading-none">Align Grid</span>
          </button>
        </div>
        
        <button 
          onClick={onTeamToggle}
          className="flex items-center justify-between w-full px-2 py-1.5 bg-slate-700/30 hover:bg-slate-700/50 rounded border border-slate-600 transition-none group text-left"
        >
          <span className="text-[9px] font-bold text-slate-100 truncate pr-2">{teamName}</span>
          <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
        </button>

        {/* フォーメーション選択 & モード切替 */}
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 pl-2">
              <Layout className="w-2.5 h-2.5 text-slate-500" />
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Formation</span>
            </div>
            
            {/* Full / Half Toggle */}
            <div className="flex bg-slate-950/50 p-0.5 rounded-lg border border-slate-800/50">
              <Button 
                variant={formationMode === 'full' ? 'default' : 'ghost'} 
                size="xs" 
                onClick={() => onFormationModeChange('full')}
                className={`text-[8px] h-5 px-2 rounded-md ${formationMode === 'full' ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
              >
                FULL
              </Button>
              <Button 
                variant={formationMode === 'half' ? 'default' : 'ghost'} 
                size="xs" 
                onClick={() => onFormationModeChange('half')}
                className={`text-[8px] h-5 px-2 rounded-md ${formationMode === 'half' ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
              >
                HALF
              </Button>
            </div>
          </div>

          <Select onValueChange={(val) => onFormationChange?.(val as FormationType)}>
            <SelectTrigger className="w-full h-7 bg-slate-900/50 border-slate-700 hover:bg-slate-800 text-[10px] font-bold text-slate-200">
              <SelectValue placeholder="Chose Formation..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
              {FORMATION_LIST.map((f) => (
                <SelectItem key={f} value={f} className="text-[10px] py-1">
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Interactive Droppable Area - Free positioning */}
      <div 
        className="flex-1 p-4 overflow-y-auto overflow-x-hidden bench-grid-bg relative min-h-0"
      >
        <div ref={setNodeRef} className="relative w-full h-[600px]">
          {children}
        </div>

        {React.Children.count(children) === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-slate-600 text-[9px] font-bold uppercase tracking-widest text-center px-4">Bench Empty</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .bench-grid-bg {
          background-image: 
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.01) 1px, transparent 0);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
};
