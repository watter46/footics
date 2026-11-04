'use client';

import { Monitor, Sparkles } from 'lucide-react';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { DEFAULT_SCREEN_BACKGROUND } from '@/lib/types/tactical-unified';
import { ScreenBoundarySection } from './screen-boundary-section';

export function ScreenBackgroundPanel() {
  const screenBackground = useTacticalUnifiedStoreContext(
    (s) => s.project.screenBackground ?? DEFAULT_SCREEN_BACKGROUND,
  );
  const updateScreenBackground = useTacticalUnifiedStoreContext(
    (s) => s.updateScreenBackground,
  );

  return (
    <div className="flex flex-col h-full bg-[#121214] text-white text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] shrink-0 bg-[#18181B]">
        <div className="flex items-center gap-2">
          <Monitor size={14} className="text-[#60A5FA]" />
          <span className="font-semibold text-white/90">Screen Background</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
        {/* ピッチ外周背景 */}
        <div>
          <p className="text-[11px] text-white/50 mb-3">
            ピッチ外周の画面背景を設定します
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            {/* ダークシネマティック */}
            <button
              type="button"
              onClick={() => updateScreenBackground({ type: 'cinematic' })}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                screenBackground.type === 'cinematic'
                  ? 'bg-[#FF8100]/15 border-[#FF8100] shadow-[0_0_12px_rgba(255,129,0,0.25)]'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              {/* プレビューサムネイル */}
              <div
                className="w-12 h-12 rounded border border-white/20 shrink-0 shadow-inner flex items-center justify-center relative overflow-hidden"
                style={{
                  background:
                    'radial-gradient(circle, #2B2B2B 0%, #050505 100%)',
                }}
              >
                <Sparkles size={14} className="text-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`font-semibold text-xs ${
                      screenBackground.type === 'cinematic'
                        ? 'text-[#FFA336]'
                        : 'text-white/90'
                    }`}
                  >
                    ダークシネマティック
                  </span>
                  {screenBackground.type === 'cinematic' && (
                    <span className="text-[10px] text-[#FFA336] font-medium px-1.5 py-0.5 rounded bg-[#FF8100]/20">
                      選択中
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/60">
                  ビネット放射グラデーション
                </p>
                <p className="text-[10px] text-white/40 mt-1">
                  中央#2B2B2B 〜 外周#050505
                </p>
              </div>
            </button>

            {/* 単色ダーク */}
            <button
              type="button"
              onClick={() => updateScreenBackground({ type: 'dark' })}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                screenBackground.type === 'dark'
                  ? 'bg-[#FF8100]/15 border-[#FF8100] shadow-[0_0_12px_rgba(255,129,0,0.25)]'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              {/* プレビューサムネイル */}
              <div className="w-12 h-12 rounded border border-white/20 shrink-0 shadow-inner bg-[#0D0D0E]" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`font-semibold text-xs ${
                      screenBackground.type === 'dark'
                        ? 'text-[#FFA336]'
                        : 'text-white/90'
                    }`}
                  >
                    単色ダーク
                  </span>
                  {screenBackground.type === 'dark' && (
                    <span className="text-[10px] text-[#FFA336] font-medium px-1.5 py-0.5 rounded bg-[#FF8100]/20">
                      選択中
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/60">#0D0D0E</p>
                <p className="text-[10px] text-white/40 mt-1">
                  マットなダークグレー単色
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 境界線 (Boundary Box) セクション */}
        <ScreenBoundarySection />
      </div>
    </div>
  );
}
