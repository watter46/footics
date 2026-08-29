'use client';

/**
 * export-modal.tsx
 * Export modal with real-time preview & inline post-export video player — PNG / ZIP / MP4 / Transparent WebM / GIF
 */

import {
  Archive,
  CheckCircle2,
  Clapperboard,
  Copy,
  Crop,
  Film,
  FlaskConical,
  Image,
  Layers,
  QrCode,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  type BenchmarkProgress,
  runAutoBenchmark,
} from '@/lib/tactical/export/auto-benchmark-engine';
import type { ExportTarget } from '@/lib/types/tactical-unified';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import { ExportPreviewPlayer } from './export-preview-player';
import { ExportVideoPlayer } from './export-video-player';

type ExportFormat = ExportTarget['format'];

const FORMAT_OPTIONS: {
  format: ExportFormat;
  icon: React.ElementType;
  label: string;
  desc: string;
  badge?: string;
}[] = [
  {
    format: 'png',
    icon: Image,
    label: 'PNG (Current Slide)',
    desc: 'Export current slide in high resolution (Boundary-aware)',
  },
  {
    format: 'zip',
    icon: Archive,
    label: 'ZIP (All Slides)',
    desc: 'Download all slides as high-res PNG archive',
  },
  {
    format: 'mp4',
    icon: Film,
    label: 'MP4 Video (H.264)',
    desc: 'Export smooth video animation for X & YouTube',
    badge: 'Popular',
  },
  {
    format: 'webm',
    icon: Layers,
    label: 'Transparent WebM (VP9)',
    desc: 'Transparent overlay video for Premiere, DaVinci & FCP',
    badge: 'Pro Editor',
  },
  {
    format: 'gif',
    icon: Clapperboard,
    label: 'GIF Animation',
    desc: 'Export lightweight looping tactical GIF',
  },
];

export function ExportModal() {
  const closeExportModal = useTacticalUnifiedStore((s) => s.closeExportModal);
  const isExporting = useTacticalUnifiedStore((s) => s.isExporting);
  const pendingExport = useTacticalUnifiedStore((s) => s.pendingExport);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(
    pendingExport?.format ?? 'mp4',
  );
  const [maxQueueSize, setMaxQueueSize] = useState<'60' | '240'>('60');
  const [keyFrameIntervalSec, setKeyFrameIntervalSec] = useState<
    '1' | '2' | '5' | '10'
  >('2');
  const [latencyMode, setLatencyMode] = useState<'realtime' | 'quality'>(
    'realtime',
  );

  // Benchmark state
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] =
    useState<BenchmarkProgress | null>(null);
  const [benchmarkReport, setBenchmarkReport] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const isBenchmarkCancelledRef = useRef(false);

  // iOS Share state
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Exported video state for post-render preview
  const [completedVideo, setCompletedVideo] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const handleCompleted = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        blob: Blob;
        filename: string;
      };
      if (detail?.blob) {
        console.log(
          '[ExportModal] Received tactical:export-completed event:',
          detail.filename,
          detail.blob.size,
          'bytes',
        );
        setExportError(null);
        setCompletedVideo(detail);
      }
    };

    const handleError = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        error: string;
      };
      console.error(
        '[ExportModal] Received tactical:export-error event:',
        detail?.error,
      );
      setExportError(detail?.error || 'Video export failed. Please try again.');
    };

    window.addEventListener('tactical:export-completed', handleCompleted);
    window.addEventListener('tactical:export-error', handleError);
    return () => {
      window.removeEventListener('tactical:export-completed', handleCompleted);
      window.removeEventListener('tactical:export-error', handleError);
    };
  }, []);

  const boundaryBox = activeSlide?.boundaryBox;
  const isBoundaryActive =
    boundaryBox?.enabled &&
    boundaryBox.width > 0 &&
    boundaryBox.height > 0 &&
    (boundaryBox.width < 100 ||
      boundaryBox.height < 100 ||
      boundaryBox.x > 0 ||
      boundaryBox.y > 0);

  async function handleExport() {
    setCompletedVideo(null);
    setExportError(null);
    let detail: ExportTarget;

    if (selectedFormat === 'png') {
      detail = {
        format: 'png',
        scope: 'current',
        scale: 2,
      };
    } else if (selectedFormat === 'zip') {
      detail = {
        format: 'zip',
        scope: 'all',
        scale: 2,
      };
    } else if (selectedFormat === 'mp4') {
      detail = {
        format: 'mp4',
        scope: 'all',
        fps: '60',
        scale: 2,
        quality: 'high',
        bitrateMbps: '24',
        h264Profile: 'high',
        keyFrameIntervalSec,
        latencyMode,
        maxQueueSize,
      };
    } else if (selectedFormat === 'webm') {
      detail = {
        format: 'webm',
        scope: 'all',
        fps: '60',
        scale: 2,
        transparent: true,
        keyFrameIntervalSec,
        latencyMode,
        maxQueueSize,
      };
    } else {
      detail = {
        format: 'gif',
        scope: 'all',
        fps: '15',
      };
    }

    console.log(
      `[ExportModal] Export button clicked: format=${selectedFormat}, queueSize=${maxQueueSize}, keyFrameGOP=${keyFrameIntervalSec}s, latencyMode=${latencyMode}, fixedSpecs=1080p@60fps/24M/High`,
    );

    window.dispatchEvent(
      new CustomEvent('tactical:export', {
        detail,
      }),
    );
  }

  const handleCreateShareLink = async () => {
    if (slides.length <= 1) {
      setExportError('iPhone Export requires 2 or more scenes.');
      return;
    }
    setIsCreatingShareLink(true);
    setExportError(null);
    setShareUrl(null);
    setQrCodeDataUrl(null);

    try {
      const { project } = useTacticalUnifiedStore.getState();
      const payload = {
        version: 1,
        createdAt: Date.now(),
        title: project.title || 'Untitled',
        orientation: project.aspectRatio === '9:16' ? 'vertical' : 'horizontal',
        teamVisibility: 'both',
        exportFps: 60,
        scenes: project.slides,
        photos: {}, // Omit photos to keep payload small, or implement packPlayerPhotos if needed
      };

      const res = await fetch('/api/tactical-export/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create share link');
      }

      const data = await res.json();
      const url = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(url);

      const qrCode = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(qrCode);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  const handleRunAutoBenchmark = async (mode: 'full' | 'quick' = 'full') => {
    if (slides.length === 0 || isBenchmarking || isExporting) return;
    setIsBenchmarking(true);
    setBenchmarkReport(null);
    setExportError(null);
    isBenchmarkCancelledRef.current = false;

    try {
      const { markdownReport } = await runAutoBenchmark({
        slides,
        fps: 60,
        scale: 2,
        format: selectedFormat === 'webm' ? 'webm' : 'mp4',
        aspectRatio,
        boundaryBox,
        stageWidth: 1280,
        stageHeight: 720,
        mode,
        onProgress: (p) => setBenchmarkProgress(p),
        checkCancelled: () => isBenchmarkCancelledRef.current,
      });
      setBenchmarkReport(markdownReport);
    } catch (err: unknown) {
      if ((err as Error).message !== 'Benchmark cancelled by user') {
        setExportError((err as Error).message || 'Auto benchmark failed');
      }
    } finally {
      setIsBenchmarking(false);
      setBenchmarkProgress(null);
    }
  };

  const handleCopyReport = () => {
    if (!benchmarkReport) return;
    navigator.clipboard.writeText(benchmarkReport);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleDownloadCompletedVideo = () => {
    if (!completedVideo) return;
    const url = URL.createObjectURL(completedVideo.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = completedVideo.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReExport = () => {
    setCompletedVideo(null);
    setExportError(null);
    setBenchmarkReport(null);
  };

  const isVideoFormat = selectedFormat === 'mp4' || selectedFormat === 'webm';
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const aspectRatio = useTacticalUnifiedStore((s) => s.project.aspectRatio);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4"
      onClick={(e) => {
        if (!isExporting && e.target === e.currentTarget) closeExportModal();
      }}
      onKeyDown={(e) => {
        if (!isExporting && e.key === 'Escape') closeExportModal();
      }}
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-[#121212] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-400" />
            <h2
              id="export-modal-title"
              className="text-sm font-semibold text-white"
            >
              {completedVideo
                ? 'Export Completed & Preview'
                : 'Export Scene & Video'}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeExportModal}
            disabled={isExporting}
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error Banner */}
        {exportError && !completedVideo && (
          <div className="px-6 py-3 bg-red-500/15 border-b border-red-500/30 text-xs text-red-300 flex items-center justify-between">
            <span>⚠️ {exportError}</span>
            <button
              type="button"
              onClick={() => setExportError(null)}
              className="text-red-300/70 hover:text-red-200 text-[11px] underline ml-3 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body */}
        {completedVideo ? (
          /* Completed Video View */
          <div className="p-6 overflow-y-auto">
            <ExportVideoPlayer
              videoBlob={completedVideo.blob}
              filename={completedVideo.filename}
              onDownload={handleDownloadCompletedVideo}
              onReExport={handleReExport}
            />
          </div>
        ) : (
          /* Standard 2 Columns Layout */
          <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto">
            {/* Left Column: Live Animation Preview */}
            <div className="md:col-span-6 space-y-3">
              <ExportPreviewPlayer
                slides={slides}
                aspectRatio={aspectRatio}
                boundaryBox={boundaryBox}
              />

              {/* Boundary Crop Indicator */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/60">
                <Crop
                  size={15}
                  className={
                    isBoundaryActive ? 'text-green-400' : 'text-white/40'
                  }
                />
                <span>
                  Export Area:
                  <strong
                    className={
                      isBoundaryActive
                        ? 'ml-1.5 text-green-400 font-semibold'
                        : 'ml-1.5 text-white/60 font-normal'
                    }
                  >
                    {isBoundaryActive
                      ? 'Cropped to Boundary Box'
                      : 'Full Pitch (100%)'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Right Column: Export Format & Settings */}
            <div className="md:col-span-6 space-y-4">
              {/* Format selection */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
                  Select Export Format
                </p>
                <div className="space-y-1.5">
                  {FORMAT_OPTIONS.map(
                    ({ format, icon: Icon, label, desc, badge }) => {
                      const isSelected = selectedFormat === format;
                      return (
                        <button
                          type="button"
                          key={format}
                          onClick={() => setSelectedFormat(format)}
                          disabled={isExporting}
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
                              <p className="text-xs font-medium text-white">
                                {label}
                              </p>
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
                    },
                  )}
                </div>
              </div>

              {/* Video Settings: Fixed High-Quality Specs + Configurable GPU Queue Buffer */}
              {isVideoFormat && (
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
                      Video Configuration
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
                      1080p FHD • 60 FPS • 24M High
                    </span>
                  </div>

                  {/* GPU Queue Buffer Watermark Control */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-white/70">
                        GPU Pipeline Buffer (Queue Size)
                      </span>
                      <span className="text-[9px] text-white/40">
                        先行投入フレーム数
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-black/40 p-0.5 border border-white/10">
                      <button
                        type="button"
                        onClick={() => setMaxQueueSize('60')}
                        disabled={isExporting}
                        title="60 Frames (推奨・万能 / 長尺・短尺ともに最速)"
                        className={[
                          'py-1.5 px-3 text-[10px] rounded-md font-medium transition-all cursor-pointer text-center',
                          maxQueueSize === '60'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-white/50 hover:text-white',
                        ].join(' ')}
                      >
                        <span className="font-semibold">60 (推奨・最速)</span>
                        <span className="block text-[8px] opacity-70 mt-0.5">
                          全動画向け・最高効率
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaxQueueSize('240')}
                        disabled={isExporting}
                        title="240 Frames (短尺ブースト / 3〜5秒動画の待機ゼロ化)"
                        className={[
                          'py-1.5 px-3 text-[10px] rounded-md font-medium transition-all cursor-pointer text-center',
                          maxQueueSize === '240'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-white/50 hover:text-white',
                        ].join(' ')}
                      >
                        <span className="font-semibold">
                          240 (短尺ブースト)
                        </span>
                        <span className="block text-[8px] opacity-70 mt-0.5">
                          短尺特化・待機ゼロ
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Keyframe Interval (GOP) Control */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-white/70">
                        Keyframe Interval (GOP)
                      </span>
                      <span className="text-[9px] text-white/40">
                        Iフレーム生成間隔
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-black/40 p-0.5 border border-white/10">
                      {[
                        { sec: '1', label: '1s (60f)', sub: '高頻度' },
                        { sec: '2', label: '2s (120f)', sub: '標準' },
                        { sec: '5', label: '5s (300f)', sub: '推奨・高速' },
                        { sec: '10', label: '10s (600f)', sub: '最速特化' },
                      ].map(({ sec, label, sub }) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() =>
                            setKeyFrameIntervalSec(
                              sec as '1' | '2' | '5' | '10',
                            )
                          }
                          disabled={isExporting}
                          className={[
                            'py-1.5 px-2 text-[10px] rounded-md font-medium transition-all cursor-pointer text-center',
                            keyFrameIntervalSec === sec
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-white/50 hover:text-white',
                          ].join(' ')}
                        >
                          <span className="font-semibold">{label}</span>
                          <span className="block text-[8px] opacity-70 mt-0.5">
                            {sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Latency Mode Control */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-white/70">
                        Encoder Latency Mode
                      </span>
                      <span className="text-[9px] text-white/40">
                        GPU処理モード
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-black/40 p-0.5 border border-white/10">
                      <button
                        type="button"
                        onClick={() => setLatencyMode('realtime')}
                        disabled={isExporting}
                        className={[
                          'py-1.5 px-2.5 text-[10px] rounded-md font-medium transition-all cursor-pointer text-center',
                          latencyMode === 'realtime'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-white/50 hover:text-white',
                        ].join(' ')}
                      >
                        <span className="font-semibold">
                          Realtime (推奨・低遅延)
                        </span>
                        <span className="block text-[8px] opacity-70 mt-0.5">
                          先読み探索スキップで高速化
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLatencyMode('quality')}
                        disabled={isExporting}
                        className={[
                          'py-1.5 px-2.5 text-[10px] rounded-md font-medium transition-all cursor-pointer text-center',
                          latencyMode === 'quality'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-white/50 hover:text-white',
                        ].join(' ')}
                      >
                        <span className="font-semibold">
                          Quality (深層圧縮)
                        </span>
                        <span className="block text-[8px] opacity-70 mt-0.5">
                          先読み探索・高圧縮率
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* iOS Export Share Link Overlay */}
        {shareUrl && qrCodeDataUrl && (
          <div className="p-6 flex flex-col items-center justify-center space-y-4 bg-slate-900/50 border-b border-white/10">
            <div className="flex flex-col items-center gap-2">
              <QrCode size={24} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Scan to Export on iPhone
              </h3>
              <p className="text-xs text-white/60 text-center max-w-sm">
                Scan this QR code with your iPhone to open the Footics Export
                Studio in iOS Safari and render with hardware acceleration.
              </p>
            </div>
            <div className="p-2 bg-white rounded-xl shadow-xl">
              <img
                src={qrCodeDataUrl}
                alt="Export Share QR Code"
                className="w-48 h-48"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 w-full max-w-md">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80 font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success('Link copied to clipboard!');
                }}
                className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg border border-emerald-500/30 transition-colors"
              >
                <Copy size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setShareUrl(null);
                setQrCodeDataUrl(null);
              }}
              className="mt-4 px-4 py-2 text-xs text-white/50 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Benchmark Running Overlay */}
        {isBenchmarking && benchmarkProgress && (
          <div className="p-6 space-y-4 bg-blue-950/20 border-b border-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical
                  size={18}
                  className="text-blue-400 animate-pulse"
                />
                <span className="text-sm font-semibold text-white">
                  Running Auto Matrix Benchmark...
                </span>
              </div>
              <span className="text-xs font-mono text-blue-300">
                Pattern {benchmarkProgress.currentIndex} /{' '}
                {benchmarkProgress.totalPatterns} (
                {benchmarkProgress.currentPercent}%)
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${benchmarkProgress.currentPercent}%` }}
              />
            </div>
            <p className="text-xs text-white/70 font-mono">
              {benchmarkProgress.statusMessage}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  isBenchmarkCancelledRef.current = true;
                }}
                className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 cursor-pointer"
              >
                Stop Benchmark
              </button>
            </div>
          </div>
        )}

        {/* Benchmark Result Report Display */}
        {benchmarkReport && !isBenchmarking && (
          <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] bg-black/40 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Auto Benchmark Complete!
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer transition-colors shadow"
                >
                  <Copy size={14} />
                  <span>
                    {copiedReport
                      ? 'Copied to Clipboard!'
                      : 'Copy Markdown Report'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBenchmarkReport(null)}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-black/80 border border-white/10 text-xs font-mono text-white/90 whitespace-pre-wrap leading-relaxed select-text overflow-x-auto max-h-[400px]">
              {benchmarkReport}
            </div>
          </div>
        )}

        {/* Actions & Progress (Only in selection mode) */}
        {!completedVideo && !isBenchmarking && !shareUrl && (
          <div className="px-6 py-4 border-t border-white/10 shrink-0 flex items-center justify-between gap-3 bg-white/[0.01]">
            <div className="flex items-center gap-2">
              {isVideoFormat && (
                <>
                  <button
                    type="button"
                    onClick={handleCreateShareLink}
                    disabled={
                      isExporting || isBenchmarking || isCreatingShareLink
                    }
                    title="iPhoneでQRコードを読み取り、HWエンコーダで高速・無劣化出力"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-600/10 hover:bg-emerald-600/20 text-xs text-emerald-300 font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isCreatingShareLink ? (
                      <span className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                    ) : (
                      <Smartphone size={14} />
                    )}
                    <span>iPhone Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunAutoBenchmark('quick')}
                    disabled={
                      isExporting || isBenchmarking || isCreatingShareLink
                    }
                    title="上位有力4パターン（短尺・長尺最適候補）のみを高速計測（中〜長尺におすすめ）"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 text-xs text-blue-300 font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FlaskConical size={14} />
                    <span>⚡ Quick Test</span>
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeExportModal}
                disabled={isExporting || isBenchmarking || isCreatingShareLink}
                className="px-5 py-2.5 rounded-xl border border-white/15 text-xs font-medium text-white/70 hover:text-white hover:border-white/30 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || isBenchmarking || isCreatingShareLink}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs text-white font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 min-w-[140px]"
              >
                {isExporting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <span>Start PC Export</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
