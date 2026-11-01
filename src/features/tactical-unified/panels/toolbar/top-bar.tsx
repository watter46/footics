'use client';

/**
 * top-bar.tsx
 * Figma-like Top Bar:
 *  - Left: Projects & Title (inline edit + save status), Undo/Redo
 *  - Center: Team visibility quick filter, Aspect ratio toggle (16:9 / 9:16)
 *  - Right: Panel toggles, Copy PNG, Primary Export, and More Actions menu (...)
 */

import { ArrowLeft, Columns2, Copy, PanelLeft, Upload } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
  type CanvasCoreHandle,
  CanvasToast,
  useCanvasToast,
} from '@/features/tactical-unified/core';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { TopBarCenter } from './top-bar-center';
import { TopBarHistory } from './top-bar-history';
import { TopBarMoreMenu } from './top-bar-more-menu';
import { TopBarPanels } from './top-bar-panels';
import { TopBarTitle } from './top-bar-title';

export interface TopBarProps {
  canvasRef?: React.RefObject<CanvasCoreHandle | null>;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export function TopBar({
  canvasRef,
  isFocusMode = false,
  onToggleFocusMode,
}: TopBarProps = {}): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectMatchId = useTacticalUnifiedStoreContext(
    (s) => s.project.matchId,
  );
  const matchId = searchParams?.get('matchId') || projectMatchId;

  const handleBack = () => {
    if (matchId) {
      router.push(`/match/${matchId}`);
    } else {
      router.back();
    }
  };

  const openExportModal = useTacticalUnifiedStoreContext(
    (s) => s.openExportModal,
  );
  const sidebarOpen = useTacticalUnifiedStoreContext(
    (s) => s.panels.sidebarOpen,
  );
  const toggleSidebar = useTacticalUnifiedStoreContext((s) => s.toggleSidebar);
  const splitPreviewOpen = useTacticalUnifiedStoreContext(
    (s) => s.panels.splitPreviewOpen,
  );
  const toggleSplitPreview = useTacticalUnifiedStoreContext(
    (s) => s.toggleSplitPreview,
  );
  const { toastMessage, showToast } = useCanvasToast();

  async function handleCopy() {
    await canvasRef?.current?.copyToClipboard();
    showToast('📋 画像をクリップボードにコピーしました！');
  }

  return (
    <header className="flex items-center justify-between h-11 px-3 bg-[#121214] border-b border-white/[0.07] shrink-0 z-50 select-none">
      {/* Left: Back Button, Sidebar Toggle, Brand / Project Manager, Editable Title, Undo / Redo */}
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        <IconButton
          variant="ghost"
          size="sm"
          onClick={handleBack}
          title="戻る"
          aria-label="戻る"
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
        </IconButton>

        <IconButton
          variant="ghost"
          size="sm"
          isActive={sidebarOpen && !isFocusMode}
          onClick={toggleSidebar}
          title="Toggle Left Sequences Sidebar"
          aria-label="Toggle Sequences Sidebar"
        >
          <PanelLeft size={15} strokeWidth={1.5} />
        </IconButton>

        <TopBarTitle />
        <div className="h-4 w-px bg-white/[0.07] shrink-0" />
        <TopBarHistory />
      </div>

      {/* Center: Team Visibility & Aspect Ratio */}
      <TopBarCenter />

      {/* Right: Panel Toggles, Copy PNG, Primary Export, More Options (...) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <TopBarPanels />

        {/* 3D Split Preview Toggle */}
        <IconButton
          variant="ghost"
          size="sm"
          isActive={Boolean(splitPreviewOpen && !isFocusMode)}
          onClick={toggleSplitPreview}
          aria-label="Toggle 3D Split Preview"
          title="Toggle 3D Split Preview (Side-by-Side)"
        >
          <Columns2 size={15} strokeWidth={1.5} />
        </IconButton>

        {/* Copy PNG */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          icon={<Copy size={13} strokeWidth={1.5} />}
          aria-label="Copy PNG"
          title="Copy current slide image to clipboard"
        >
          <span className="hidden md:inline">Copy PNG</span>
        </Button>

        {/* Export Modal (Primary) */}
        <Button
          variant="primary"
          size="sm"
          onClick={() => openExportModal()}
          icon={<Upload size={13} strokeWidth={1.5} />}
          aria-label="Export"
          title="Export image or video"
        >
          <span>Export</span>
        </Button>

        {/* More Actions (...) Dropdown */}
        <TopBarMoreMenu />
      </div>
      <CanvasToast message={toastMessage} />
    </header>
  );
}
