import {
  Archive,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Star,
  Trash2,
  Video,
} from 'lucide-react';
import type React from 'react';
import type { CapturedScreenshot } from '~/features/capture/db/screenshot-db';
import type { VideoGroup } from '../utils/grouping';
import { ScreenshotCard } from './ScreenshotCard';

export interface VideoGroupCardProps {
  group: VideoGroup;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDownloadGroup: (group: VideoGroup) => void;
  onDeleteGroup: (group: VideoGroup) => void;
  onOpenCanvas: (id: string) => void;
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void;
  onDownloadSingle: (
    screenshot: CapturedScreenshot,
    e?: React.MouseEvent,
  ) => void;
  onDeleteSingle: (id: string, e?: React.MouseEvent) => void;
}

export const VideoGroupCard: React.FC<VideoGroupCardProps> = ({
  group,
  isExpanded,
  onToggleExpand,
  onDownloadGroup,
  onDeleteGroup,
  onOpenCanvas,
  onToggleFavorite,
  onDownloadSingle,
  onDeleteSingle,
}) => {
  return (
    <article className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
      {/* Group Header Card */}
      <div
        onClick={onToggleExpand}
        className="px-5 py-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-850 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="text-zinc-400 hover:text-zinc-200"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>

          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-200 truncate">
                {group.videoTitle}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 shrink-0">
                {group.count} 枚
              </span>
              {group.favoriteCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 shrink-0">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {group.favoriteCount}
                </span>
              )}
            </div>

            {group.videoUrl && (
              <a
                href={group.videoUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-zinc-500 hover:text-emerald-400 flex items-center gap-1 truncate mt-0.5"
              >
                <span>{group.videoUrl}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            )}
          </div>
        </div>

        {/* Group Action Buttons */}
        <div
          className="flex items-center gap-2 shrink-0 ml-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onDownloadGroup(group)}
            title="この動画のスクショを一括保存"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-300 transition"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>一括保存</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteGroup(group)}
            title="この動画のスクショを一括削除"
            className="p-1.5 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Screenshots Grid (Collapsible) */}
      {isExpanded && (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-zinc-950/40">
          {group.screenshots.map((s) => (
            <ScreenshotCard
              key={s.id}
              screenshot={s}
              onOpenCanvas={onOpenCanvas}
              onToggleFavorite={onToggleFavorite}
              onDownload={onDownloadSingle}
              onDelete={onDeleteSingle}
            />
          ))}
        </div>
      )}
    </article>
  );
};
