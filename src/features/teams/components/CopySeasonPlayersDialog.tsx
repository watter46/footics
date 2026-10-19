'use client';

import { Copy, FolderSync, Loader2, X } from 'lucide-react';
import type React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  type UseSeasonPlayerCopyParams,
  useSeasonPlayerCopy,
} from '../hooks/use-season-player-copy';
import { CopySeasonPlayerGrid } from './copy-season-player-grid';

export type CopySeasonPlayersDialogProps = UseSeasonPlayerCopyParams;

export const CopySeasonPlayersDialog: React.FC<CopySeasonPlayersDialogProps> = (
  props,
) => {
  const { isOpen, onClose, targetSeason } = props;
  const copy = useSeasonPlayerCopy(props);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5 text-slate-100 font-bold text-base">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FolderSync className="w-4 h-4" />
            </div>
            <div>
              <span>他シーズンから選手を引き継ぐ</span>
              <span className="text-xs text-slate-400 font-normal block">
                コピー元シーズンを選択し、引き継ぎたい選手にチェックを入れてください
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="px-6 py-3.5 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-300">
              コピー元:
            </span>
            <select
              value={copy.fromSeason}
              onChange={(e) => copy.setFromSeason(e.target.value)}
              className="h-8 bg-slate-900 border border-slate-700 rounded-lg px-3 text-xs font-bold text-blue-400 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              {copy.otherSeasons.map((s) => (
                <option key={s} value={s}>
                  Season {s}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400 font-medium">➔</span>
            <span className="text-xs font-bold text-slate-100 bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 rounded-md">
              Season {targetSeason} (引き継ぎ先)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[
              {
                label: '未登録のみ選択',
                action: copy.handleSelectAllUnregistered,
                highlight: true,
              },
              { label: '全選択', action: copy.handleSelectAll },
              { label: '解除', action: copy.handleClearAll },
            ].map(({ label, action, highlight }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                className={`text-[11px] font-semibold px-2 py-1 rounded hover:bg-slate-800 transition-colors ${
                  highlight
                    ? 'text-slate-400 hover:text-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Players Selection List */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-2">
          <CopySeasonPlayerGrid
            isLoading={copy.isLoading}
            fromSeason={copy.fromSeason}
            mergedSourcePlayers={copy.mergedSourcePlayers}
            selectedPlayerIds={copy.selectedPlayerIds}
            onTogglePlayer={copy.toggleSelectPlayer}
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <span className="text-xs font-semibold text-slate-400">
            選択中:{' '}
            <strong className="text-blue-400">
              {copy.selectedPlayerIds.size}
            </strong>{' '}
            名
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <Button
              disabled={copy.isSubmitting || copy.selectedPlayerIds.size === 0}
              onClick={copy.handleExecuteCopy}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl gap-2 shadow-lg shadow-blue-600/25"
            >
              {copy.isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copy.selectedPlayerIds.size} 名を Season {targetSeason}{' '}
                に引き継ぐ
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
