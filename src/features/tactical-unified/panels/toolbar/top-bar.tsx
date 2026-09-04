'use client';

/**
 * top-bar.tsx
 * Figma-like Top Bar:
 *  - Left: Projects & Title (inline edit + save status), Undo/Redo
 *  - Center: Team visibility quick filter, Aspect ratio toggle (16:9 / 9:16)
 *  - Right: Panel toggles, Copy PNG, Primary Export, and More Actions menu (...)
 */

import { Copy, Upload } from 'lucide-react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TopBarCenter } from './top-bar-center';
import { TopBarHistory } from './top-bar-history';
import { TopBarMoreMenu } from './top-bar-more-menu';
import { TopBarPanels } from './top-bar-panels';
import { TopBarTitle } from './top-bar-title';

export function TopBar() {
  const openExportModal = useTacticalUnifiedStore((s) => s.openExportModal);

  function handleCopy() {
    window.dispatchEvent(new CustomEvent('tactical:copy-png'));
  }

  return (
    <header className="flex items-center justify-between h-11 px-3 bg-[#111] border-b border-white/10 shrink-0 z-50 select-none">
      {/* Left: Brand / Project Manager, Editable Title, Save Status, Undo / Redo */}
      <div className="flex items-center gap-2">
        <TopBarTitle />
        <div className="h-4 w-px bg-white/10" />
        <TopBarHistory />
      </div>

      {/* Center: Team Visibility & Aspect Ratio */}
      <TopBarCenter />

      {/* Right: Panel Toggles, Copy PNG, Primary Export, More Options (...) */}
      <div className="flex items-center gap-1.5">
        <TopBarPanels />

        {/* Copy PNG */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs transition-colors cursor-pointer"
          aria-label="Copy PNG"
          title="Copy current slide image to clipboard"
        >
          <Copy size={13} />
          <span className="hidden md:inline">Copy PNG</span>
        </button>

        {/* Export Modal (Primary) */}
        <button
          type="button"
          onClick={() => openExportModal()}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
          aria-label="Export"
          title="Export image or video"
        >
          <Upload size={13} />
          <span>Export</span>
        </button>

        {/* More Actions (...) Dropdown */}
        <TopBarMoreMenu />
      </div>
    </header>
  );
}
