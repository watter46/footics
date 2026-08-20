'use client';

import { Check, ChevronDown, LayoutGrid, Sparkles } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import {
  FORMATION_LIST,
  type FormationMode,
  type FormationType,
} from '@/lib/data/formations';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';

interface FormationSelectPanelProps {
  defaultTeam?: 'home' | 'away';
}

export const FormationSelectPanel: React.FC<FormationSelectPanelProps> = ({
  defaultTeam = 'home',
}) => {
  const activeSceneIndex = useTacticalAnimationStore((s) => s.activeSceneIndex);
  const applyFormation = useTacticalAnimationStore((s) => s.applyFormation);

  const [targetTeam, setTargetTeam] = useState<'home' | 'away'>(defaultTeam);
  const [selectedFormation, setSelectedFormation] =
    useState<FormationType>('4-4-2');
  const [formationMode, setFormationMode] = useState<FormationMode>('half');
  const [applyToAllScenes, setApplyToAllScenes] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleApply = () => {
    applyFormation(
      activeSceneIndex,
      targetTeam,
      selectedFormation,
      formationMode,
      applyToAllScenes,
    );
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 1500);
  };

  return (
    <div className="flex flex-col gap-2.5 p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
          <span>フォーメーション配置</span>
        </div>
      </div>

      {/* 対象チーム切り替え */}
      <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
        <button
          type="button"
          onClick={() => setTargetTeam('home')}
          className={`flex-1 py-1 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
            targetTeam === 'home'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span>HOME</span>
        </button>
        <button
          type="button"
          onClick={() => setTargetTeam('away')}
          className={`flex-1 py-1 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
            targetTeam === 'away'
              ? 'bg-red-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span>AWAY</span>
        </button>
      </div>

      {/* フォーメーション選択 & 配置モード */}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <select
            value={selectedFormation}
            onChange={(e) =>
              setSelectedFormation(e.target.value as FormationType)
            }
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold appearance-none cursor-pointer focus:outline-none focus:border-blue-500 pr-7"
          >
            {FORMATION_LIST.map((f) => (
              <option key={f} value={f} className="bg-slate-900 text-white">
                {f}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* ハーフ / フル */}
        <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setFormationMode('half')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              formationMode === 'half'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="自陣ハーフコート内に展開"
          >
            Half
          </button>
          <button
            type="button"
            onClick={() => setFormationMode('full')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              formationMode === 'full'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="ピッチ全面に展開"
          >
            Full
          </button>
        </div>
      </div>

      {/* 全シーンに適用チェックボックス */}
      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={applyToAllScenes}
          onChange={(e) => setApplyToAllScenes(e.target.checked)}
          className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
        />
        <span>全シーンの配置を一括変更する</span>
      </label>

      {/* 適用ボタン */}
      <button
        type="button"
        onClick={handleApply}
        className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow ${
          isSuccess
            ? 'bg-emerald-600 text-white'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
        }`}
      >
        {isSuccess ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>配置完了！</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>{selectedFormation} を適用</span>
          </>
        )}
      </button>
    </div>
  );
};
