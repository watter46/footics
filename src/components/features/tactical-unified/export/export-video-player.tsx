'use client';

/**
 * export-video-player.tsx
 * Inline video preview player for exported MP4 / WebM video blobs.
 * Features:
 *   - Auto looping video playback
 *   - Native controls & play/pause/reset
 *   - Direct Download button & Re-export button
 *   - Video metadata display (file size, format, resolution)
 */

import {
  CheckCircle2,
  Download,
  Play,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ExportVideoPlayerProps {
  videoBlob: Blob;
  filename: string;
  onDownload: () => void;
  onReExport: () => void;
}

export function ExportVideoPlayer({
  videoBlob,
  filename,
  onDownload,
  onReExport,
}: ExportVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoDimensions, setVideoDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(videoBlob);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoBlob]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setVideoDimensions({
      width: video.videoWidth,
      height: video.videoHeight,
    });
  };

  const formattedSize = (videoBlob.size / (1024 * 1024)).toFixed(2);
  const isWebm = videoBlob.type.includes('webm');

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-black/60 border border-white/15 p-4 overflow-hidden">
      {/* Header with success badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-400" />
          <span className="text-xs font-semibold text-white">
            Export Completed — Live Video Preview
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-white/50">
          <span>{formattedSize} MB</span>
          {videoDimensions && (
            <>
              <span>•</span>
              <span>
                {videoDimensions.width}x{videoDimensions.height}
              </span>
            </>
          )}
          <span>•</span>
          <span className="uppercase text-blue-400 font-semibold">
            {isWebm ? 'VP9 WebM' : 'H.264 MP4'}
          </span>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-[#020617] flex items-center justify-center">
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            loop
            muted
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onReExport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium border border-white/10 transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className="text-white/60" />
          <span>Export Again / Change Settings</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold shadow-lg shadow-green-600/20 transition-all cursor-pointer"
        >
          <Download size={14} />
          <span>Download {filename}</span>
        </button>
      </div>
    </div>
  );
}
