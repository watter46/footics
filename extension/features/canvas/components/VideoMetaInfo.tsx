import { Clock, ExternalLink } from 'lucide-react';
import type React from 'react';
import type { CapturedScreenshot } from '../../capture/db/screenshot-db';

export interface VideoMetaInfoProps {
  screenshot: CapturedScreenshot | null;
}

function formatVideoTime(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VideoMetaInfo({
  screenshot,
}: VideoMetaInfoProps): React.ReactElement {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span
        className="text-xs font-semibold text-white truncate max-w-[180px] md:max-w-xs"
        title={screenshot?.videoTitle || 'Footics Tactics Quick Canvas'}
      >
        {screenshot?.videoTitle || 'Footics Quick Canvas'}
      </span>
      {screenshot?.videoUrl && (
        <a
          href={screenshot.videoUrl}
          target="_blank"
          rel="noreferrer"
          title="元動画を開く"
          aria-label="元動画を開く"
          className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
      {screenshot?.videoTime !== undefined && (
        <div className="flex items-center gap-1 text-[11px] text-white/40 font-mono shrink-0">
          <Clock className="w-3 h-3 text-white/30" />
          <span>{formatVideoTime(screenshot.videoTime)}</span>
        </div>
      )}
    </div>
  );
}
