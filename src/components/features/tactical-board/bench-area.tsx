'use client';

import { useDroppable } from '@dnd-kit/core';
import { ChevronDown, Layout, LayoutGrid, Users } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  FORMATION_LIST,
  type FormationMode,
  type FormationType,
} from '@/lib/data/formations';

interface BenchAreaProps {
  teamName: string;
  onTeamToggle: () => void;
  onAlignGrid: () => void;
  formationMode: FormationMode;
  onFormationModeChange: (mode: FormationMode) => void;
  onFormationChange?: (formation: FormationType) => void;
  season?: string;
  onSeasonChange?: (season: string) => void;
  availableSeasons?: readonly string[];
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
  season,
  onSeasonChange,
  availableSeasons,
  children,
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
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.15em]">
              Player Bench
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* グリッド整列ボタン */}
            <button
              type="button"
              onClick={onAlignGrid}
              title="Align Grid"
              className="p-1 px-2 hover:bg-slate-700/50 rounded flex items-center gap-1.5 transition-none group border border-transparent hover:border-slate-600"
            >
              <LayoutGrid className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-400" />
              <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-300 uppercase leading-none">
                Align
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTeamToggle}
            className="flex-1 flex items-center justify-between px-2 py-1.5 bg-slate-700/30 hover:bg-slate-700/50 rounded border border-slate-600 transition-none group text-left"
          >
            <span className="text-[9px] font-bold text-slate-100 truncate pr-1">
              {teamName}
            </span>
            <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
          </button>

          {season && onSeasonChange && (
            <div className="relative shrink-0">
              <select
                value={season}
                onChange={(e) => onSeasonChange(e.target.value)}
                className="h-[27px] bg-slate-800/80 border border-slate-600 hover:border-slate-500 rounded px-2 text-[9px] font-bold text-blue-400 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 pr-5 transition-colors"
                title="シーズン切り替え"
              >
                {(availableSeasons || ['26-27', '25-26', '24-25']).map((s) => (
                  <option
                    key={s}
                    value={s}
                    className="bg-slate-900 text-slate-200"
                  >
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* フォーメーション選択 & モード切替 */}
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 pl-2">
              <Layout className="w-2.5 h-2.5 text-slate-500" />
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                Formation
              </span>
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

          <div className="relative w-full">
            <select
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value as FormationType;
                if (val && onFormationChange) {
                  onFormationChange(val);
                }
              }}
              className="w-full h-7 bg-slate-900/80 border border-slate-700 hover:border-slate-600 rounded-md px-2.5 text-[10px] font-bold text-slate-200 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 pr-7 transition-colors"
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                Choose Formation...
              </option>
              {FORMATION_LIST.map((f) => (
                <option
                  key={f}
                  value={f}
                  className="bg-slate-900 text-slate-200"
                >
                  {f}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Interactive Droppable Area - Free positioning */}
      <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden bench-grid-bg relative min-h-0">
        <div ref={setNodeRef} className="relative w-full h-[600px]">
          {children}
        </div>

        {React.Children.count(children) === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-slate-600 text-[9px] font-bold uppercase tracking-widest text-center px-4">
              Bench Empty
            </span>
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
