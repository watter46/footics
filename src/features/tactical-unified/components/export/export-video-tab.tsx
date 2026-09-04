'use client';

import { CheckCircle2, Clapperboard, Film, Layers } from 'lucide-react';
import { ExportVideoMorphingSection } from './export-video-morphing-section';
import { ExportVideoPipelineSection } from './export-video-pipeline-section';
import type { ExportFormat } from './use-export-modal-state';
import type { useVideoMorphingConfig } from './use-video-morphing-config';

interface ExportVideoTabProps {
  selectedFormat: ExportFormat;
  onSelectFormat: (fmt: ExportFormat) => void;
  morphing: ReturnType<typeof useVideoMorphingConfig>;
  maxQueueSize: '60' | '240';
  onMaxQueueSizeChange: (val: '60' | '240') => void;
  keyFrameIntervalSec: '1' | '2' | '5' | '10';
  onKeyFrameIntervalChange: (val: '1' | '2' | '5' | '10') => void;
  latencyMode: 'realtime' | 'quality';
  onLatencyModeChange: (val: 'realtime' | 'quality') => void;
  disabled?: boolean;
}

const VIDEO_FORMATS = [
  {
    format: 'mp4' as const,
    icon: Film,
    label: 'MP4 Video (H.264)',
    desc: 'Export smooth video animation for X & YouTube',
    badge: 'Popular',
  },
  {
    format: 'webm' as const,
    icon: Layers,
    label: 'Transparent WebM (VP9)',
    desc: 'Transparent overlay video for Premiere, DaVinci & FCP',
    badge: 'Pro Editor',
  },
  {
    format: 'gif' as const,
    icon: Clapperboard,
    label: 'GIF Animation',
    desc: 'Export lightweight looping tactical GIF',
  },
];

export function ExportVideoTab({
  selectedFormat,
  onSelectFormat,
  morphing,
  maxQueueSize,
  onMaxQueueSizeChange,
  keyFrameIntervalSec,
  onKeyFrameIntervalChange,
  latencyMode,
  onLatencyModeChange,
  disabled = false,
}: ExportVideoTabProps) {
  const isVideo = selectedFormat === 'mp4' || selectedFormat === 'webm';

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
          Select Video Format
        </p>
        {VIDEO_FORMATS.map(({ format, icon: Icon, label, desc, badge }) => {
          const isSelected = selectedFormat === format;
          return (
            <button
              type="button"
              key={format}
              onClick={() => onSelectFormat(format)}
              disabled={disabled}
              className={[
                'w-full flex items-start gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed',
                isSelected
                  ? 'border-blue-500 bg-blue-600/15 text-white shadow-sm ring-1 ring-blue-500/30'
                  : 'border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white',
              ].join(' ')}
            >
              <Icon
                size={16}
                className={`mt-0.5 shrink-0 ${isSelected ? 'text-blue-400' : 'text-white/60'}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-white">{label}</p>
                  {badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/40 mt-0.5 leading-snug">
                  {desc}
                </p>
              </div>
              {isSelected && (
                <CheckCircle2
                  size={15}
                  className="text-blue-400 mt-0.5 shrink-0"
                />
              )}
            </button>
          );
        })}
      </div>

      {isVideo && (
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
              Video & Morphing
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
              1080p FHD • 60 FPS • 24M High
            </span>
          </div>

          <ExportVideoMorphingSection morphing={morphing} disabled={disabled} />

          <ExportVideoPipelineSection
            maxQueueSize={maxQueueSize}
            onMaxQueueSizeChange={onMaxQueueSizeChange}
            keyFrameIntervalSec={keyFrameIntervalSec}
            onKeyFrameIntervalChange={onKeyFrameIntervalChange}
            latencyMode={latencyMode}
            onLatencyModeChange={onLatencyModeChange}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
