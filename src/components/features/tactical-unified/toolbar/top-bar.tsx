'use client';

/**
 * top-bar.tsx
 * Figma-like Top Bar:
 *  - Title & Quick Tools: Team Swap (左右入替), Pitch Restore (ピッチ復帰), Image Import (画像インポート)
 *  - Center: Aspect Ratio Switcher (16:9 / 9:16)
 *  - Right: Right panel toggles (Formation & Subs / Inspector), PNG Copy, Export
 */

import {
  ArrowLeftRight,
  ArrowUpDown,
  Copy,
  ImagePlus,
  LayoutTemplate,
  RotateCcw,
  SlidersHorizontal,
  Upload,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useRef } from 'react';
import type { AspectRatio } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

export function TopBar() {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const aspectRatio = useTacticalUnifiedStore((s) => s.project.aspectRatio);
  const setAspectRatio = useTacticalUnifiedStore((s) => s.setAspectRatio);
  const openExportModal = useTacticalUnifiedStore((s) => s.openExportModal);
  const swapTeamSides = useTacticalUnifiedStore((s) => s.swapTeamSides);
  const restoreDefaultPitch = useTacticalUnifiedStore(
    (s) => s.restoreDefaultPitch,
  );
  const setImageBackground = useTacticalUnifiedStore(
    (s) => s.setImageBackground,
  );
  const rightPanelTab = useTacticalUnifiedStore((s) => s.panels.rightPanelTab);
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCopy() {
    window.dispatchEvent(new CustomEvent('tactical:copy-png'));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            setImageBackground(dataUrl);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    // reset
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const nextRatio: AspectRatio = aspectRatio === '16:9' ? '9:16' : '16:9';

  return (
    <header className="flex items-center justify-between h-11 px-3 bg-[#111] border-b border-white/10 shrink-0 z-50 select-none">
      {/* Left: Quick Pitch Tools */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold tracking-wide text-white/90 mr-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Tactical
        </span>

        <div className="h-4 w-px bg-white/10" />

        {/* ピッチ入れ替え */}
        <button
          type="button"
          onClick={() => swapTeamSides(activeSlideId)}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors"
          title={
            aspectRatio === '9:16'
              ? 'ピッチ内のチーム陣地（攻守の方向）を上下反転入れ替え'
              : 'ピッチ内のチーム陣地（攻守の方向）を左右反転入れ替え'
          }
        >
          {aspectRatio === '9:16' ? (
            <ArrowUpDown size={13} className="text-amber-400" />
          ) : (
            <ArrowLeftRight size={13} className="text-amber-400" />
          )}
          <span>ピッチ入替</span>
        </button>

        {/* デフォルトピッチ復帰 */}
        <button
          type="button"
          onClick={restoreDefaultPitch}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors"
          title="デフォルトのピッチ背景を再配置"
        >
          <RotateCcw size={13} className="text-emerald-400" />
          <span>ピッチ復帰</span>
        </button>

        {/* 画像Import */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
          title="画像ファイルをインポートして背景にセット"
        >
          <ImagePlus size={13} className="text-sky-400" />
          <span>画像Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Center: Aspect Ratio */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setAspectRatio(nextRatio)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 hover:text-white transition-colors"
          aria-label="アスペクト比切替"
          title="16:9 / 9:16 切替"
        >
          <LayoutTemplate size={13} className="text-blue-400" />
          <span>{aspectRatio}</span>
        </button>
      </div>

      {/* Right: Panel Toggles & Export */}
      <div className="flex items-center gap-1.5">
        {/* 右パネル切替アイコン群 */}
        <div className="flex items-center p-0.5 rounded-lg bg-white/5 border border-white/10 mr-1">
          <button
            type="button"
            onClick={() => setRightPanelTab('formation_sub')}
            className={`p-1.5 rounded transition-colors ${
              rightPanelTab === 'formation_sub'
                ? 'bg-blue-600 text-white shadow'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="フォーメーション & サブメンバー パネル表示"
            aria-label="フォーメーション & サブメンバー パネル表示"
          >
            <Users size={14} />
          </button>

          <button
            type="button"
            onClick={() => setRightPanelTab('inspector')}
            className={`p-1.5 rounded transition-colors ${
              rightPanelTab === 'inspector'
                ? 'bg-blue-600 text-white shadow'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="プロパティ・詳細設定 パネル表示"
            aria-label="プロパティ・詳細設定 パネル表示"
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>

        {/* PNG Copy */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs transition-colors"
          aria-label="PNGコピー"
          title="現在のスライド画像をクリップボードにコピー"
        >
          <Copy size={13} />
          <span>PNGコピー</span>
        </button>

        {/* 書き出しモーダル */}
        <button
          type="button"
          onClick={() => openExportModal()}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-sm"
          aria-label="書き出し"
          title="画像・動画エクスポート"
        >
          <Upload size={13} />
          <span>書き出し</span>
        </button>
      </div>
    </header>
  );
}
