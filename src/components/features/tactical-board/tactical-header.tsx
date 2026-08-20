'use client';

import {
  ArrowLeftRight,
  Camera,
  Circle,
  Clapperboard,
  Eraser,
  Monitor,
  MousePointer,
  MoveRight,
  RotateCcw,
  Smartphone,
  X,
} from 'lucide-react';
import type React from 'react';
import { useTacticalStore } from '@/stores/tactical-store';
import type { Match } from '@/types';
import type { TacticalDrawTool } from './drawing/tactical-drawing-canvas';

interface TacticalHeaderProps {
  metadata: Match;
  onClose: () => void;
  onReset: () => void;
  activeDrawTool: TacticalDrawTool;
  onSelectDrawTool: (tool: TacticalDrawTool) => void;
  onExportScreenshot: () => void;
  onClearDrawing: () => void;
  onOpenAnimation?: () => void;
  isExporting?: boolean;
}

export const TacticalHeader: React.FC<TacticalHeaderProps> = ({
  metadata,
  onClose,
  onReset,
  activeDrawTool,
  onSelectDrawTool,
  onExportScreenshot,
  onClearDrawing,
  onOpenAnimation,
  isExporting = false,
}) => {
  const isFlipped = useTacticalStore((s) => s.isFlipped);
  const toggleFlipped = useTacticalStore((s) => s.toggleFlipped);
  const orientation = useTacticalStore((s) => s.orientation);
  const setOrientation = useTacticalStore((s) => s.setOrientation);
  const homeColor = useTacticalStore((s) => s.homeColor);
  const setHomeColor = useTacticalStore((s) => s.setHomeColor);
  const awayColor = useTacticalStore((s) => s.awayColor);
  const setAwayColor = useTacticalStore((s) => s.setAwayColor);
  const savedSettings = useTacticalStore((s) => s.savedSettings);

  return (
    <div className="flex items-center justify-between px-6 py-2 border-b border-slate-800 bg-slate-900/50 h-14 shrink-0 overflow-x-auto">
      <div className="flex items-center gap-4">
        <div className="flex flex-col shrink-0">
          <h2 className="text-sm font-bold text-slate-100 mb-1 leading-none">
            Tactical Board
          </h2>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
            <span>
              {metadata.teams.home.name} vs {metadata.teams.away.name}
            </span>
            <span className="text-slate-700">|</span>
            <span>{Object.keys(savedSettings).length} Registered</span>
          </div>
        </div>

        {/* 向き切り替え (縦画面 / 横画面) */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setOrientation('vertical')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              orientation === 'vertical'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="縦画面モード"
          >
            <Smartphone className="w-3 h-3" />
            <span>縦画面</span>
          </button>
          <button
            type="button"
            onClick={() => setOrientation('horizontal')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              orientation === 'horizontal'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="横画面モード"
          >
            <Monitor className="w-3 h-3" />
            <span>横画面</span>
          </button>
        </div>

        <button
          type="button"
          onClick={toggleFlipped}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-none border ${isFlipped ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'}`}
        >
          <ArrowLeftRight className="w-3 h-3" />
          {isFlipped ? 'AWAY VIEW' : 'HOME VIEW'}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-none border bg-slate-800 border-slate-700 text-slate-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400"
        >
          <RotateCcw className="w-3 h-3" />
          RESET
        </button>

        {/* 描画ツール & スクリーンショット グループ */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          {/* コマ操作モード */}
          <button
            type="button"
            title="コマ移動モード (コマをドラッグ)"
            onClick={() => onSelectDrawTool('select')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-none border ${
              activeDrawTool === 'select'
                ? 'bg-blue-500/20 border-blue-500/60 text-blue-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            <MousePointer className="w-3 h-3" />
            <span>SELECT</span>
          </button>

          {/* 実線矢印 */}
          <button
            type="button"
            title="実線矢印を描画"
            onClick={() => onSelectDrawTool('arrow_solid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-none border ${
              activeDrawTool === 'arrow_solid'
                ? 'bg-blue-500/20 border-blue-500/60 text-blue-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            <MoveRight className="w-3 h-3" />
            <span>SOLID ARROW</span>
          </button>

          {/* 点線矢印 */}
          <button
            type="button"
            title="点線矢印を描画"
            onClick={() => onSelectDrawTool('arrow_dash')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-none border ${
              activeDrawTool === 'arrow_dash'
                ? 'bg-orange-500/20 border-orange-500/60 text-orange-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            <MoveRight className="w-3 h-3 stroke-dasharray-2" />
            <span>DASH ARROW</span>
          </button>

          {/* ゾーン */}
          <button
            type="button"
            title="円形ゾーンを描画"
            onClick={() => onSelectDrawTool('zone_circle')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-none border ${
              activeDrawTool === 'zone_circle'
                ? 'bg-red-500/20 border-red-500/60 text-red-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            <Circle className="w-3 h-3" />
            <span>ZONE</span>
          </button>

          {/* 描画クリア（消しゴムとゴミ箱を1つに統合） */}
          <button
            type="button"
            title="すべての矢印・描画を消去"
            onClick={onClearDrawing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-none border bg-slate-800 border-slate-700 text-slate-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400"
          >
            <Eraser className="w-3 h-3" />
            <span>CLEAR</span>
          </button>

          {/* スクリーンショット（クリップボードコピー） */}
          <button
            type="button"
            title="ピッチ全体の画像をクリップボードにコピー"
            onClick={onExportScreenshot}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 ml-2 rounded-full text-[10px] font-bold transition-none border bg-emerald-600/20 border-emerald-500/60 text-emerald-400 hover:bg-emerald-600/30 hover:border-emerald-400 disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isExporting ? 'COPYING...' : 'COPY IMAGE'}</span>
          </button>

          {/* アニメーション作成へ移行 */}
          {onOpenAnimation && (
            <button
              type="button"
              title="現在の配置でアニメーションを作成"
              onClick={onOpenAnimation}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-none border bg-purple-600/20 border-purple-500/60 text-purple-300 hover:bg-purple-600/30 hover:border-purple-400 shadow-sm"
            >
              <Clapperboard className="w-3.5 h-3.5 text-purple-400" />
              <span>TO ANIMATION</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 ml-4">
        <div className="flex items-center gap-3 px-3 py-1 bg-slate-800/30 rounded-full border border-slate-700/50 min-h-0">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={homeColor}
              onChange={(e) => setHomeColor(e.target.value)}
              className="w-3 h-3 bg-transparent border-none rounded-full cursor-pointer"
            />
            <span className="text-[9px] text-slate-300 font-bold uppercase">
              {metadata.teams.home.name}
            </span>
          </div>
          <div className="w-[1px] h-2 bg-slate-700"></div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-300 font-bold uppercase">
              {metadata.teams.away.name}
            </span>
            <input
              type="color"
              value={awayColor}
              onChange={(e) => setAwayColor(e.target.value)}
              className="w-3 h-3 bg-transparent border-none rounded-full cursor-pointer"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-none"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
