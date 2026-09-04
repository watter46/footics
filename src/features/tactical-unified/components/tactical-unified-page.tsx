'use client';

/**
 * tactical-unified-page.tsx
 * Figma-like Layout Orchestrator:
 *  - TopBar with action & toggle icons
 *  - Central Canvas (Maximized)
 *  - Always-visible Right Panel (Formation & Sub-members / Inspector)
 *  - Slide Strip
 *  - Clipboard paste & Image drop support
 */

import dynamic from 'next/dynamic';
import type React from 'react';
import { useCallback, useEffect } from 'react';
import { useKeyboardShortcuts } from '@/features/tactical-unified/hooks/use-keyboard-shortcuts';
import { useTacticalAutoSave } from '@/features/tactical-unified/hooks/use-tactical-auto-save';
import { useTacticalCaptureBridge } from '@/features/tactical-unified/hooks/use-tactical-capture-bridge';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { RightPanel } from '../panels/right-panel/right-panel';
import { ProjectManagerModal } from './dialogs/project-manager-modal';
import { ExportModal } from './export/export-modal';
import { TimelineBar } from './timeline/timeline-bar';
import { TopBar } from '../panels/toolbar';

// Canvas はクライアントサイドのみ (Konva)
const UnifiedCanvas = dynamic(
  () => import('./canvas/unified-canvas').then((m) => m.UnifiedCanvas),
  { ssr: false },
);

export function TacticalUnifiedPage() {
  // 💾 プロジェクト自動保存 & リロード時自動復元 (Dexie IndexedDB)
  useTacticalAutoSave();

  const exportModalOpen = useTacticalUnifiedStore(
    (s) => s.panels.exportModalOpen,
  );
  const projectManagerModalOpen = useTacticalUnifiedStore(
    (s) => s.panels.projectManagerModalOpen,
  );
  const closeProjectManagerModal = useTacticalUnifiedStore(
    (s) => s.closeProjectManagerModal,
  );
  const setImageBackground = useTacticalUnifiedStore(
    (s) => s.setImageBackground,
  );

  const movePlayerToPitch = useTacticalUnifiedStore((s) => s.movePlayerToPitch);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);

  // 🎯 拡張機能からのダイレクトキャプチャ受信・自動配置
  useTacticalCaptureBridge();

  // キーボードショートカット (Delete/Escape)
  useKeyboardShortcuts();

  // 📋 クリップボード画像貼り付け (Ctrl+V / Paste)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
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
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [setImageBackground]);

  // 📂 ファイルドラッグ＆ドロップ対応 & サブ選手ピッチ投入対応
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
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
        return;
      }

      // サブメンバーのピッチへのドロップ処理
      const rawJson = e.dataTransfer.getData('application/json');
      if (rawJson) {
        try {
          const data = JSON.parse(rawJson);
          if (data.type === 'bench-player' && data.playerId) {
            const canvasEl = document.querySelector('canvas');
            if (canvasEl) {
              const rect = canvasEl.getBoundingClientRect();
              const nx = Math.max(
                0,
                Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
              );
              const ny = Math.max(
                0,
                Math.min(100, ((e.clientY - rect.top) / rect.height) * 100),
              );
              movePlayerToPitch(activeSlideId, data.playerId, nx, ny);
            }
          }
        } catch {}
      }
    },
    [setImageBackground, movePlayerToPitch, activeSlideId],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col h-screen w-screen bg-[#0a0a0a] overflow-hidden select-none"
    >
      {/* Top Bar */}
      <TopBar />

      {/* Main Area */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Canvas — 最大化 */}
        <main className="flex-1 relative overflow-hidden flex flex-col bg-[#0a0a0a]">
          <UnifiedCanvas />
        </main>

        {/* Right Panel (常時表示 / アニメーションなし) */}
        <RightPanel />
      </div>

      {/* Timeline Bar */}
      <TimelineBar />

      {/* Export Modal (Portal) */}
      {exportModalOpen && <ExportModal />}

      {/* Project Manager Modal */}
      {projectManagerModalOpen && (
        <ProjectManagerModal
          isOpen={projectManagerModalOpen}
          onClose={closeProjectManagerModal}
        />
      )}
    </div>
  );
}
