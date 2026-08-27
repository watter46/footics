'use client';

/**
 * export-modal.tsx
 * Export modal with preview — PNG / ZIP / MP4 / GIF
 */

import { Archive, Clapperboard, Film, Image, X } from 'lucide-react';
import { useState } from 'react';
import type { ExportTarget } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

type ExportFormat = ExportTarget['format'];

const FORMAT_OPTIONS: {
  format: ExportFormat;
  icon: React.ElementType;
  label: string;
  desc: string;
}[] = [
  {
    format: 'png',
    icon: Image,
    label: 'PNG (現在のスライド)',
    desc: '現在表示中のスライドを高画質で保存',
  },
  {
    format: 'zip',
    icon: Archive,
    label: 'ZIP (全スライド)',
    desc: '全スライドをまとめてダウンロード',
  },
  {
    format: 'mp4',
    icon: Film,
    label: 'MP4 フレーム (アニメーション)',
    desc: 'フレームをZIPで書き出し（mp4変換は外部ツール）',
  },
  {
    format: 'gif',
    icon: Clapperboard,
    label: 'GIF (アニメーション)',
    desc: 'ループGIFとして書き出し',
  },
];

export function ExportModal() {
  const closeExportModal = useTacticalUnifiedStore((s) => s.closeExportModal);
  const isExporting = useTacticalUnifiedStore((s) => s.isExporting);
  const pendingExport = useTacticalUnifiedStore((s) => s.pendingExport);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(
    pendingExport?.format ?? 'png',
  );

  async function handleExport() {
    // useKonvaExport は UnifiedCanvas 内の stageRef に依存するため
    // カスタムイベントで Canvas 側に委譲
    window.dispatchEvent(
      new CustomEvent('tactical:export', {
        detail: {
          format: selectedFormat,
          scope: selectedFormat === 'zip' ? 'all' : 'current',
        } as ExportTarget,
      }),
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeExportModal();
      }}
    >
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">書き出し</h2>
          <button
            type="button"
            onClick={closeExportModal}
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Format selection */}
        <div className="p-5 space-y-2">
          {FORMAT_OPTIONS.map(({ format, icon: Icon, label, desc }) => (
            <button
              type="button"
              key={format}
              onClick={() => setSelectedFormat(format)}
              className={[
                'w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                selectedFormat === format
                  ? 'border-blue-500 bg-blue-600/15 text-white'
                  : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white',
              ].join(' ')}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium">{label}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={closeExportModal}
            className="flex-1 py-2 rounded-xl border border-white/20 text-sm text-white/60 hover:text-white hover:border-white/40 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? '書き出し中...' : '書き出す'}
          </button>
        </div>
      </div>
    </div>
  );
}
