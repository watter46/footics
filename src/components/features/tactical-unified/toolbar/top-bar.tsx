'use client';

/**
 * top-bar.tsx
 * Minimal top bar — サイドパネル / アスペクト比 / コピー / 書出 / メニュー
 */

import {
  Copy,
  Folders,
  LayoutTemplate,
  Menu,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import type { AspectRatio } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

export function TopBar() {
  const toggleSidebar = useTacticalUnifiedStore((s) => s.toggleSidebar);
  const inspectorOpen = useTacticalUnifiedStore((s) => s.panels.inspectorOpen);
  const setInspectorOpen = useTacticalUnifiedStore((s) => s.setInspectorOpen);
  const aspectRatio = useTacticalUnifiedStore((s) => s.project.aspectRatio);
  const setAspectRatio = useTacticalUnifiedStore((s) => s.setAspectRatio);
  const openExportModal = useTacticalUnifiedStore((s) => s.openExportModal);

  function handleCopy() {
    // PNG clipboard — impl in export hook
    window.dispatchEvent(new CustomEvent('tactical:copy-png'));
  }

  const nextRatio: AspectRatio = aspectRatio === '16:9' ? '9:16' : '16:9';

  return (
    <header className="flex items-center justify-between h-10 px-3 bg-[#111] border-b border-white/10 shrink-0 z-50">
      {/* Left */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        aria-label="サイドパネル切替"
      >
        <Folders size={16} />
      </button>

      {/* Center */}
      <button
        type="button"
        onClick={() => setAspectRatio(nextRatio)}
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="アスペクト比切替"
      >
        <LayoutTemplate size={14} />
        <span>{aspectRatio}</span>
      </button>

      {/* Right */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setInspectorOpen(!inspectorOpen)}
          className={`p-1.5 rounded transition-colors ${
            inspectorOpen
              ? 'bg-blue-600/20 text-blue-400'
              : 'hover:bg-white/10 text-white/70 hover:text-white'
          }`}
          aria-label="インスペクターパネル切替"
          title="インスペクター切替"
        >
          <SlidersHorizontal size={16} />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          aria-label="PNGコピー"
          title="PNGコピー"
        >
          <Copy size={16} />
        </button>
        <button
          type="button"
          onClick={() => openExportModal()}
          className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          aria-label="書き出し"
          title="書き出し"
        >
          <Upload size={16} />
        </button>
        <button
          type="button"
          className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          aria-label="メニュー"
        >
          <Menu size={16} />
        </button>
      </div>
    </header>
  );
}
