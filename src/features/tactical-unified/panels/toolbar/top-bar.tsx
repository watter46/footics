'use client';

/**
 * top-bar.tsx
 * Figma-like Top Bar:
 *  - Left: Projects & Title (inline edit + save status), Undo/Redo
 *  - Center: Team visibility quick filter, Aspect ratio toggle (16:9 / 9:16)
 *  - Right: Panel toggles, Copy PNG, Primary Export, and More Actions menu (...)
 */

import { ArrowLeft, Copy, PanelLeft, Upload } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
  type CanvasCoreHandle,
  CanvasToast,
  useCanvasToast,
} from '@/features/tactical-unified/core';
import {
  selectActivePhaseBoundaryBox,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
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

  const workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode);
  const openExportModal = useTacticalUnifiedStoreContext(
    (s) => s.openExportModal,
  );
  const sidebarOpen = useTacticalUnifiedStoreContext(
    (s) => s.panels.sidebarOpen,
  );
  const toggleSidebar = useTacticalUnifiedStoreContext((s) => s.toggleSidebar);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const activeBoundaryBox = useTacticalUnifiedStoreContext(
    selectActivePhaseBoundaryBox,
  );
  const { toastMessage, showToast } = useCanvasToast();

  async function handleCopy() {
    if (workspaceMode === 'director') {
      const canvas = document.querySelector('canvas');
      if (canvas && typeof canvas.toBlob === 'function') {
        const boundaryBox = activeBoundaryBox ?? activeSlide?.boundaryBox;
        let sourceCanvas: HTMLCanvasElement = canvas;

        const isBoundaryActive = Boolean(
          boundaryBox?.enabled &&
            boundaryBox.width > 0 &&
            boundaryBox.height > 0 &&
            (boundaryBox.width < 100 ||
              boundaryBox.height < 100 ||
              boundaryBox.x > 0 ||
              boundaryBox.y > 0),
        );

        if (
          isBoundaryActive &&
          boundaryBox &&
          canvas.dataset.cropped !== 'true'
        ) {
          const sx = Math.round((boundaryBox.x / 100) * canvas.width);
          const sy = Math.round((boundaryBox.y / 100) * canvas.height);
          const sw = Math.max(
            1,
            Math.round((boundaryBox.width / 100) * canvas.width),
          );
          const sh = Math.max(
            1,
            Math.round((boundaryBox.height / 100) * canvas.height),
          );

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = sw;
          cropCanvas.height = sh;
          const ctx = cropCanvas.getContext('2d');
          ctx?.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
          sourceCanvas = cropCanvas;
        }

        await new Promise<void>((resolve, reject) => {
          sourceCanvas.toBlob(async (blob) => {
            if (!blob) {
              resolve();
              return;
            }
            try {
              if (
                typeof navigator !== 'undefined' &&
                navigator.clipboard?.write
              ) {
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': blob }),
                ]);
              }
              resolve();
            } catch (err) {
              reject(err);
            }
          });
        });
      } else if (canvasRef?.current?.copyToClipboard) {
        await canvasRef.current.copyToClipboard();
      }
    } else {
      await canvasRef?.current?.copyToClipboard();
    }
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
          className="whitespace-nowrap shrink-0"
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
          className="whitespace-nowrap shrink-0"
        >
          <PanelLeft size={15} strokeWidth={1.5} />
        </IconButton>

        <TopBarTitle />
        <div className="h-4 w-px bg-white/[0.07] shrink-0" />
        <TopBarHistory />
      </div>

      {/* Center: Team Visibility & Aspect Ratio */}
      <TopBarCenter />

      {/* Right: Panel Toggles, Copy, Primary Export, More Options (...) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <TopBarPanels />

        {/* Copy */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          icon={<Copy size={13} strokeWidth={1.5} />}
          aria-label="Copy"
          title="Copy current slide image to clipboard"
          className="whitespace-nowrap shrink-0"
        >
          <span className="hidden md:inline">Copy</span>
        </Button>

        {/* Export Modal (Primary) */}
        <Button
          variant="primary"
          size="sm"
          onClick={() => openExportModal()}
          icon={<Upload size={13} strokeWidth={1.5} />}
          aria-label="Export"
          title="Export image or video"
          className="whitespace-nowrap shrink-0"
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
