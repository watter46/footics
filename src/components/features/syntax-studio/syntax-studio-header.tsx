'use client';

import {
  Activity,
  Columns2,
  Database,
  FileCode2,
  Layers,
  Maximize2,
  Shield,
  Sparkles,
} from 'lucide-react';
import type React from 'react';

interface SyntaxStudioHeaderProps {
  viewMode: 'split' | 'focus';
  onToggleViewMode: (mode: 'split' | 'focus') => void;
  onOpenJsonDrawer: () => void;
  matchMetadata: {
    homeTeam: string;
    awayTeam: string;
    actionType: string;
  } | null;
  datasetId: string | null;
  sceneCount: number;
}

export const SyntaxStudioHeader: React.FC<SyntaxStudioHeaderProps> = ({
  viewMode,
  onToggleViewMode,
  onOpenJsonDrawer,
  matchMetadata,
  datasetId,
  sceneCount,
}) => {
  return (
    <header className="h-14 px-4 sm:px-6 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 z-30">
      {/* ロゴ & タイトル & メタデータ */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                Syntax Studio
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-700/40">
                  v1.0
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* 試合メタデータ & Dataset ID 情報 */}
        {matchMetadata ? (
          <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-200">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold">{matchMetadata.homeTeam}</span>
              <span className="text-slate-500 font-mono">vs</span>
              <span className="font-semibold">{matchMetadata.awayTeam}</span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate max-w-[200px]">
                {matchMetadata.actionType}
              </span>
            </div>

            {datasetId && (
              <div className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 text-slate-500 font-mono text-[10px] border border-slate-800">
                <Database className="w-3 h-3 text-slate-400" />
                <span className="truncate max-w-[140px]">{datasetId}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-800 text-xs text-slate-500">
            <Layers className="w-3.5 h-3.5" />
            <span>
              {sceneCount > 0
                ? `${sceneCount} Phases Loaded`
                : 'No Dataset Loaded'}
            </span>
          </div>
        )}
      </div>

      {/* 右側アクション & モード切替 */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Split / Focus トグルボタン */}
        <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg shadow-inner">
          <button
            type="button"
            onClick={() => onToggleViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'split'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm shadow-cyan-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Split View: AI Draft vs Human Ground Truth (Press S)"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split View</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleViewMode('focus')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'focus'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Focus View: Large Single Pitch Canvas (Press S)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Focus View</span>
          </button>
        </div>

        {/* JSON Drawer ボタン */}
        <button
          type="button"
          onClick={onOpenJsonDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-medium transition-colors shadow-sm"
        >
          <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>JSON Schema</span>
        </button>
      </div>
    </header>
  );
};
