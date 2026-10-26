import { Download, Pencil, Star, Trash2 } from 'lucide-react';
import type React from 'react';
import type { CapturedScreenshot } from '~/features/capture/db/screenshot-db';

export interface ScreenshotCardProps {
  screenshot: CapturedScreenshot;
  onOpenCanvas: (id: string) => void;
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void;
  onDownload: (screenshot: CapturedScreenshot, e?: React.MouseEvent) => void;
  onDelete: (id: string, e?: React.MouseEvent) => void;
}

export const ScreenshotCard: React.FC<ScreenshotCardProps> = ({
  screenshot,
  onOpenCanvas,
  onToggleFavorite,
  onDownload,
  onDelete,
}) => {
  const formattedTime =
    screenshot.videoTime !== undefined && screenshot.videoTime > 0
      ? `${Math.floor(screenshot.videoTime / 60)}:${(screenshot.videoTime % 60)
          .toString()
          .padStart(2, '0')}`
      : null;

  const formattedDate = `${new Date(
    screenshot.timestamp,
  ).toLocaleDateString()} ${new Date(screenshot.timestamp).toLocaleTimeString(
    [],
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  )}`;

  return (
    <div className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition flex flex-col shadow-sm">
      {/* Thumbnail / Image Preview */}
      <div
        onClick={() => onOpenCanvas(screenshot.id)}
        className="aspect-video bg-black/80 relative cursor-pointer overflow-hidden flex items-center justify-center"
      >
        <img
          src={screenshot.thumbnailDataUrl || screenshot.imageDataUrl}
          alt={screenshot.videoTitle}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          loading="lazy"
        />

        {/* Hover Overlay with Edit Prompt */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
          <span className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-lg">
            <Pencil className="w-3.5 h-3.5" />
            編集する
          </span>
        </div>

        {/* Favorite Button (Top Right) */}
        <button
          type="button"
          onClick={(e) => onToggleFavorite(screenshot.id, e)}
          title={screenshot.isFavorite ? 'お気に入り解除' : 'お気に入り追加'}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur border border-white/10 transition z-10"
        >
          <Star
            className={`w-3.5 h-3.5 ${
              screenshot.isFavorite
                ? 'fill-amber-400 text-amber-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          />
        </button>

        {/* Video Time Tag (Bottom Left) */}
        {formattedTime && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] text-zinc-300 font-mono">
            {formattedTime}
          </div>
        )}
      </div>

      {/* Card Footer Info */}
      <div className="p-3 flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/90 border-t border-zinc-800">
        <span className="text-[11px] text-zinc-500">{formattedDate}</span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => onDownload(screenshot, e)}
            title="ダウンロード"
            className="p-1 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => onDelete(screenshot.id, e)}
            title="削除"
            className="p-1 hover:text-red-400 hover:bg-red-500/10 rounded transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
