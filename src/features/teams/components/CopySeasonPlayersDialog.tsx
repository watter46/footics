'use client';

import { Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog';
import { NativeSelect } from '@/components/ui/select';
import {
  type UseSeasonPlayerCopyParams,
  useSeasonPlayerCopy,
} from '../hooks/use-season-player-copy';
import { CopySeasonPlayerGrid } from './copy-season-player-grid';

export type CopySeasonPlayersDialogProps = UseSeasonPlayerCopyParams;

export function CopySeasonPlayersDialog(props: CopySeasonPlayersDialogProps) {
  const { isOpen, onClose, targetSeason } = props;
  const copy = useSeasonPlayerCopy(props);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="xl">
      <DialogHeader title="他シーズンから選手を引き継ぐ" onClose={onClose} />

      <DialogContent className="space-y-4 p-0 max-h-[75vh] flex flex-col">
        {/* Controls Bar */}
        <div className="py-2 px-1 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-white/80">
              コピー元:
            </span>
            <div className="w-32">
              <NativeSelect
                value={copy.fromSeason}
                onChange={(e) => copy.setFromSeason(e.target.value)}
              >
                {copy.otherSeasons.map((s) => (
                  <option key={s} value={s}>
                    Season {s}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <span className="text-xs text-white/40 font-medium">➔</span>
            <span className="text-xs font-bold text-white bg-accent-orange/15 border border-accent-orange/30 px-2.5 py-1 rounded-md">
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
              <Button
                key={label}
                type="button"
                variant="ghost"
                size="xs"
                onClick={action}
                className={highlight ? 'text-accent-orange' : 'text-white/60'}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Players Selection List */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-2">
          <CopySeasonPlayerGrid
            isLoading={copy.isLoading}
            fromSeason={copy.fromSeason}
            mergedSourcePlayers={copy.mergedSourcePlayers}
            selectedPlayerIds={copy.selectedPlayerIds}
            onTogglePlayer={copy.toggleSelectPlayer}
          />
        </div>
      </DialogContent>

      <DialogFooter className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/60">
          選択中:{' '}
          <strong className="text-accent-orange">
            {copy.selectedPlayerIds.size}
          </strong>{' '}
          名
        </span>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            disabled={copy.isSubmitting || copy.selectedPlayerIds.size === 0}
            onClick={copy.handleExecuteCopy}
            className="gap-2"
          >
            {copy.isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span>
              {copy.selectedPlayerIds.size} 名を Season {targetSeason}{' '}
              に引き継ぐ
            </span>
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
