import type React from 'react';
import { useMemoOverlayStore } from '@/features/memo-overlay/stores/memo-overlay-store';
import { QUICK_TAGS, type QuickTag } from '../../../constants/quick-tags';
import { cn } from '../../../utils/cn';

interface QuickTagBarProps {
  className?: string;
}

/**
 * QuickTagBar
 *
 * 責務: EVENT モードのメモオーバーレイ上部にプリセットタグ（ビルドアップ・プレス等）を
 * 横並びで表示し、ショートカット番号（1〜4）と選択状態（amberハイライト）を表示する。
 */
export const QuickTagBar: React.FC<QuickTagBarProps> = ({ className }) => {
  const selectedLabels = useMemoOverlayStore((s) => s.selectedLabels);
  const addLabel = useMemoOverlayStore((s) => s.addLabel);
  const setSelectedLabels = useMemoOverlayStore((s) => s.setSelectedLabels);

  const handleToggleTag = (tag: QuickTag) => {
    if (selectedLabels.includes(tag.label)) {
      setSelectedLabels(selectedLabels.filter((l) => l !== tag.label));
    } else {
      addLabel(tag.label);
    }
  };

  return (
    <div
      className={cn(
        'w-[22vw] min-w-[380px] flex items-center justify-between gap-1.5 p-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-lg font-sans',
        className,
      )}
      role="toolbar"
      aria-label="Quick Tags"
    >
      {QUICK_TAGS.map((tag) => {
        const isSelected = selectedLabels.includes(tag.label);
        return (
          <button
            key={tag.key}
            type="button"
            onClick={() => handleToggleTag(tag)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer select-none',
              isSelected
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                : 'bg-slate-800/80 text-slate-300 border border-slate-700/50 hover:bg-slate-700/60 hover:text-white',
            )}
            title={`Shortcut: ${tag.shortcut}`}
          >
            <span
              className={cn(
                'inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold',
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-extrabold'
                  : 'bg-slate-700 text-slate-400',
              )}
            >
              {tag.shortcut}
            </span>
            <span className="truncate">{tag.label}</span>
          </button>
        );
      })}
    </div>
  );
};
