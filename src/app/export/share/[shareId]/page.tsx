'use client';

import {
  CheckCircle2,
  Clock,
  Download,
  File,
  Film,
  FolderOpen,
  Info,
  Loader2,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { TacticalExportSharePayload } from '@/lib/tactical/export/share-payload';
import { executeOffThreadVideoExport } from '@/lib/tactical/export/video-export-worker';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import type { Slide } from '@/lib/types/tactical-unified';

function detectIOSDevice(): {
  isIOS: boolean;
  isIPhone12: boolean;
  safariVersion: number | null;
} {
  if (typeof navigator === 'undefined') {
    return { isIOS: false, isIPhone12: false, safariVersion: null };
  }
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isIPhone12 =
    isIOS &&
    typeof window !== 'undefined' &&
    window.screen.width === 390 &&
    window.screen.height === 844;
  const safariMatch = ua.match(/Version\/(\d+)/);
  const safariVersion = safariMatch ? Number(safariMatch[1]) : null;
  return { isIOS, isIPhone12, safariVersion };
}

const IOS_ENCODER_PRESETS = {
  iphone12: {
    label: 'iPhone 12 (A14 Bionic) — Optimized',
    codec: 'avc1.64002a',
    maxQueueSize: 30,
    bitrateMbps: 24,
    fps: 60,
    latencyMode: 'quality' as const,
    keyFrameIntervalSec: 2,
  },
  iosGeneral: {
    label: 'iOS Safari — Safe',
    codec: 'avc1.4d002a',
    maxQueueSize: 20,
    bitrateMbps: 16,
    fps: 30,
    latencyMode: 'realtime' as const,
    keyFrameIntervalSec: 2,
  },
} as const;

export default function StandaloneExportSharePage() {
  const params = useParams();
  const shareId = params?.shareId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<TacticalExportSharePayload | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportCompleted, setExportCompleted] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);

  const [iosInfo] = useState(() =>
    typeof window === 'undefined'
      ? { isIOS: false, isIPhone12: false, safariVersion: null }
      : detectIOSDevice(),
  );
  const isIOS = iosInfo.isIOS;
  const [selectedPreset, setSelectedPreset] = useState<
    'iphone12' | 'iosGeneral'
  >(iosInfo.isIPhone12 ? 'iphone12' : 'iosGeneral');

  useEffect(() => {
    if (!shareId) return;
    let isMounted = true;

    async function fetchData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/tactical-export/share?id=${encodeURIComponent(shareId)}`,
        );
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `HTTP error ${res.status}`);
        }
        const json = await res.json();
        const payload = json.data as TacticalExportSharePayload;
        if (!isMounted) return;
        setShareData(payload);
      } catch (err) {
        if (!isMounted) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [shareId]);

  const handleExportClick = async () => {
    if (!shareData?.scenes || shareData.scenes.length === 0) {
      toast.error('エクスポート対象のシーンがありません。');
      return;
    }

    const slides = shareData.scenes as unknown as Slide[];
    const preset = IOS_ENCODER_PRESETS[selectedPreset];
    const isVertical = shareData.orientation === 'vertical';
    const stageWidth = isVertical ? 1080 : 1920;
    const stageHeight = isVertical ? 1920 : 1080;
    const totalDurationMs = calculateUnifiedTotalDuration(slides);

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    setExportCompleted(false);
    setExportedBlob(null);

    try {
      const result = await executeOffThreadVideoExport(
        {
          id: `export-${Date.now()}`,
          type: 'START_EXPORT',
          format: 'mp4',
          fps: preset.fps,
          scale: 1,
          quality: 'high',
          bitrate: preset.bitrateMbps * 1_000_000,
          h264Profile: 'high',
          keyFrameIntervalSec: preset.keyFrameIntervalSec,
          latencyMode: preset.latencyMode,
          maxQueueSize: preset.maxQueueSize,
          transparent: false,
          totalDurationMs,
          boundaryBox: null,
          stageWidth,
          stageHeight,
          slides,
          aspectRatio: isVertical ? '9:16' : '16:9',
          isMainThread: true,
        },
        (progress) => {
          setExportProgress(progress.percent);
        },
        () => false,
      );

      const blob = new Blob([result.buffer], { type: result.mimeType });
      setExportedBlob(blob);
      setExportCompleted(true);
      toast.success('エクスポートが完了しました！');
    } catch (err) {
      console.error('Export failed:', err);
      setExportError(err instanceof Error ? err.message : String(err));
      toast.error('エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportedBlob) return;
    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `footics-tactical-${shareId}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activePreset = IOS_ENCODER_PRESETS[selectedPreset];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="flex flex-col items-center gap-3 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <div className="font-bold text-sm text-slate-200">
            Loading export data...
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !shareData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-900/40 p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-100">
              Export link not found
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {loadError ||
                'This export URL is invalid or has expired (24h limit).'}
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Back to Footics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none">
      <header className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Footics Export Studio
            </span>
          </Link>
          {isIOS && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Smartphone className="w-2.5 h-2.5" />
              {iosInfo.isIPhone12 ? 'iPhone 12 A14 Mode' : 'iOS Mode'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>24h link</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-xl mx-auto w-full">
        <div className="w-full bg-slate-900/90 border border-slate-800 p-6 rounded-2xl flex flex-col gap-5 shadow-2xl">
          {/* Device Status */}
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs ${
              isIOS
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800/50 border-slate-700 text-slate-400'
            }`}
          >
            <Smartphone className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-bold block text-sm">
                {isIOS
                  ? iosInfo.isIPhone12
                    ? 'iPhone 12 (A14 Bionic) Detected'
                    : 'iOS Safari Detected'
                  : 'Desktop Browser'}
              </span>
              <span className="text-xs opacity-75">
                {isIOS
                  ? 'Apple Hardware Encoder & UMA Zero-Copy Ready'
                  : 'Standard Encoder Mode'}
              </span>
            </div>
          </div>

          {/* iOS Encoder Presets */}
          {isIOS && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400">
                Encoder Preset
              </p>
              <div className="space-y-2">
                {(
                  Object.entries(IOS_ENCODER_PRESETS) as [
                    'iphone12' | 'iosGeneral',
                    (typeof IOS_ENCODER_PRESETS)[keyof typeof IOS_ENCODER_PRESETS],
                  ][]
                ).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPreset(key)}
                    disabled={isExporting}
                    className={[
                      'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed',
                      selectedPreset === key
                        ? 'border-emerald-500 bg-emerald-600/15 text-white shadow-sm ring-1 ring-emerald-500/30'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white',
                    ].join(' ')}
                  >
                    <Sparkles
                      size={16}
                      className={`mt-0.5 shrink-0 ${
                        selectedPreset === key
                          ? 'text-emerald-400'
                          : 'text-white/40'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">
                        {preset.label}
                      </p>
                      <p className="text-[11px] text-white/50 mt-0.5 font-mono">
                        {preset.codec} · {preset.fps}fps · {preset.bitrateMbps}
                        Mbps · Queue:{preset.maxQueueSize}
                      </p>
                    </div>
                    {selectedPreset === key && (
                      <CheckCircle2
                        size={16}
                        className="text-emerald-400 mt-0.5 shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video Information */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span>Scene Information</span>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {shareData.scenes.length} Scenes
              </span>
            </div>
            <div className="space-y-1.5 text-slate-400 text-xs">
              <div className="flex justify-between">
                <span>Title:</span>
                <span className="text-slate-200 font-medium">
                  {shareData.title || 'Tactical Animation'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Orientation:</span>
                <span className="text-slate-200 font-medium capitalize">
                  {shareData.orientation}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Target Resolution:</span>
                <span className="font-mono text-slate-200">
                  {shareData.orientation === 'vertical'
                    ? '1080 × 1920'
                    : '1920 × 1080'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Target Bitrate:</span>
                <span className="font-mono text-emerald-400">
                  {activePreset.bitrateMbps} Mbps (Bit-Perfect)
                </span>
              </div>
            </div>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/40 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-blue-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isIOS ? 'Apple HW Encoding...' : 'Rendering...'}
                </span>
                <span className="font-mono font-bold text-white text-sm">
                  {exportProgress}%
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full transition-all duration-150"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {exportError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
              Error: {exportError}
            </div>
          )}

          {/* Export Completed */}
          {exportCompleted && exportedBlob && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">
                  Export Completed!
                </span>
                <span className="text-xs font-mono text-slate-400 ml-auto">
                  {(exportedBlob.size / 1_000_000).toFixed(1)} MB
                </span>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>
                  Save MP4 — Bit-Perfect {activePreset.bitrateMbps} Mbps
                </span>
              </button>

              {/* Bit-Perfect Sync Guide */}
              {isIOS && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                    <Info className="w-4 h-4" />
                    Bit-Perfect PC Sync (写真アプリの強制圧縮を回避)
                  </div>
                  <ol className="text-slate-300 space-y-1.5 pl-1 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 font-bold shrink-0">
                        1.
                      </span>
                      <span>
                        「Save MP4」をタップし、Safari の{' '}
                        <strong className="text-emerald-400">
                          「ダウンロード」
                        </strong>{' '}
                        を選択
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 font-bold shrink-0">
                        2.
                      </span>
                      <span>
                        Safariのダウンロード欄から{' '}
                        <FolderOpen className="w-3.5 h-3.5 inline text-blue-400" />{' '}
                        <strong className="text-white">
                          ファイル (Files.app) / iCloud Drive
                        </strong>{' '}
                        に保存
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 font-bold shrink-0">
                        3.
                      </span>
                      <span>
                        PC側の{' '}
                        <File className="w-3.5 h-3.5 inline text-blue-400" />{' '}
                        iCloud Drive または AirDrop で最高画質 24Mbps MP4
                        を無劣化回収
                      </span>
                    </li>
                  </ol>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    写真アプリ (Photos.app)
                    は保存時に自動でHEVC強制再エンコードするため、ファイルアプリ経由が推奨です。
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Action Button */}
          {!exportCompleted && (
            <button
              type="button"
              onClick={handleExportClick}
              disabled={isExporting}
              className="w-full py-4 px-4 bg-gradient-to-r from-emerald-600 via-blue-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Encoding... ({exportProgress}%)</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>
                    {isIOS
                      ? `Export with A14 Bionic (${activePreset.bitrateMbps}Mbps)`
                      : 'Start Export'}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
