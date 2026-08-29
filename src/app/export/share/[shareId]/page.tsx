'use client';

import {
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  File,
  Film,
  FolderOpen,
  Info,
  Loader2,
  Monitor,
  Play,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Square,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AnimationPitch,
  type AnimationPitchRef,
} from '@/components/features/tactical-animation/animation-pitch';
import { useTacticalAnimation } from '@/hooks/use-tactical-animation';
import { useTacticalVideoExport } from '@/hooks/use-tactical-video-export';
import {
  type TacticalExportSharePayload,
  unpackPlayerPhotos,
} from '@/lib/tactical/export/share-payload';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';

function detectIOSDevice(): {
  isIOS: boolean;
  isIPhone12: boolean;
  safariVersion: number | null;
} {
  if (typeof navigator === 'undefined')
    return { isIOS: false, isIPhone12: false, safariVersion: null };
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isIPhone12 =
    isIOS &&
    typeof window !== 'undefined' &&
    window.screen.width === 390 &&
    window.screen.height === 844;
  const safariMatch = ua.match(/Version\/(\d+)/);
  return {
    isIOS,
    isIPhone12,
    safariVersion: safariMatch ? Number(safariMatch[1]) : null,
  };
}

const IOS_ENCODER_PRESETS = {
  iphone12: {
    label: 'iPhone 12 (A14 Bionic) — Optimized',
    codec: 'avc1.64002a',
    maxQueueSize: 30,
    bitrateMbps: 24,
    fps: 60,
    latencyMode: 'quality' as const,
    keyFrameIntervalSec: '2' as const,
  },
  iosGeneral: {
    label: 'iOS Safari — Safe',
    codec: 'avc1.4d002a',
    maxQueueSize: 20,
    bitrateMbps: 16,
    fps: 30,
    latencyMode: 'realtime' as const,
    keyFrameIntervalSec: '2' as const,
  },
} as const;

export default function StandaloneExportSharePage() {
  const params = useParams();
  const shareId = params?.shareId as string;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<TacticalExportSharePayload | null>(
    null,
  );
  const [photosMap, setPhotosMap] = useState<Record<string, ImageBitmap>>({});
  const [selectedFps, setSelectedFps] = useState<number>(60);
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

  const pitchRef = useRef<AnimationPitchRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pitchDimensions, setPitchDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 380, height: 580 });

  const { startExport, isExporting, exportProgress, exportError } =
    useTacticalVideoExport();
  const { playAnimation, stopAnimation } = useTacticalAnimation();

  const scenes = useTacticalAnimationStore((s) => s.scenes);
  const orientation = useTacticalAnimationStore((s) => s.orientation);
  const isPlaying = useTacticalAnimationStore((s) => s.isPlaying);
  const setActiveSceneIndex = useTacticalAnimationStore(
    (s) => s.setActiveSceneIndex,
  );

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
        if (!res.ok)
          throw new Error(
            (await res.json().catch(() => ({}))).error ||
              `HTTP error ${res.status}`,
          );
        const payload = (await res.json()).data as TacticalExportSharePayload;
        if (!isMounted) return;

        setShareData(payload);
        setSelectedFps(payload.exportFps || 60);

        const enrichedScenes = payload.scenes.map((scene) => {
          const updatedPlayers = { ...scene.players };
          Object.keys(updatedPlayers).forEach((pId) => {
            if (payload.photos?.[pId])
              updatedPlayers[pId] = {
                ...updatedPlayers[pId],
                options: {
                  ...updatedPlayers[pId].options,
                  photoUrl: payload.photos[pId],
                },
              };
          });
          return { ...scene, players: updatedPlayers };
        });

        useTacticalAnimationStore.setState({
          scenes: enrichedScenes,
          orientation: payload.orientation,
          teamVisibility: payload.teamVisibility || 'both',
          exportFps: payload.exportFps === 60 ? 60 : 30,
          activeSceneIndex: 0,
        });
        if (payload.photos && Object.keys(payload.photos).length > 0) {
          const bitmaps = await unpackPlayerPhotos(payload.photos);
          if (isMounted) setPhotosMap(bitmaps);
        }
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

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const availWidth = Math.max(100, clientWidth - 16);
      const availHeight = Math.max(100, clientHeight - 16);
      const targetRatio = orientation === 'vertical' ? 68 / 105 : 105 / 68;
      let h = availHeight;
      let w = h * targetRatio;
      if (w > availWidth) {
        w = availWidth;
        h = w / targetRatio;
      }
      setPitchDimensions({ width: Math.floor(w), height: Math.floor(h) });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [orientation]);

  useEffect(() => {
    const handleCompleted = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        blob: Blob;
        filename: string;
      };
      if (detail?.blob) {
        setExportedBlob(detail.blob);
        setExportCompleted(true);
      }
    };
    window.addEventListener('tactical:export-completed', handleCompleted);
    return () =>
      window.removeEventListener('tactical:export-completed', handleCompleted);
  }, []);

  const handlePlayToggle = () => {
    const stage = pitchRef.current?.getStage();
    if (isPlaying) {
      stopAnimation(stage);
    } else {
      setActiveSceneIndex(0);
      requestAnimationFrame(() => {
        if (stage) playAnimation(stage);
      });
    }
  };

  const handleExportClick = () => {
    if (scenes.length <= 1)
      return toast.error('Export requires 2 or more scenes.');
    const preset = IOS_ENCODER_PRESETS[selectedPreset];
    setExportCompleted(false);
    setExportedBlob(null);
    startExport({
      backgroundColor: '#020617',
      fps: preset.fps,
      bitrate: preset.bitrateMbps * 1_000_000,
      photos: photosMap,
    });
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

  if (isLoading)
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

  if (loadError || !shareData)
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
              {loadError || 'URL is invalid or has expired (24h limit).'}
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
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Smartphone className="w-2.5 h-2.5" />
              {iosInfo.isIPhone12 ? 'iPhone 12 A14 Mode' : 'iOS Mode'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>24h link</span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/animation-test')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-700 shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open in Editor</span>
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col bg-slate-950 p-4 sm:p-6 min-h-0 relative">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-200">Preview</h2>
              <span className="text-xs text-slate-500 font-mono">
                ({scenes.length} scenes)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {orientation === 'vertical' ? (
                  <Smartphone className="w-3 h-3 text-blue-400" />
                ) : (
                  <Monitor className="w-3 h-3 text-indigo-400" />
                )}{' '}
                {orientation === 'vertical' ? 'Vertical' : 'Landscape'}
              </span>
              <button
                type="button"
                onClick={handlePlayToggle}
                disabled={isExporting}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-md ${isPlaying ? 'bg-rose-600 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
              >
                {isPlaying ? (
                  <>
                    <Square className="w-3 h-3 fill-white" /> Stop
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-white" /> Preview
                  </>
                )}
              </button>
            </div>
          </div>
          <div
            ref={containerRef}
            className="flex-1 min-h-0 flex items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800/80 p-2 overflow-hidden"
          >
            <div
              style={{
                width: pitchDimensions.width,
                height: pitchDimensions.height,
              }}
              className="relative shadow-2xl rounded-xl overflow-hidden"
            >
              <AnimationPitch
                ref={pitchRef}
                width={pitchDimensions.width}
                height={pitchDimensions.height}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[26rem] bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 flex flex-col gap-4 shrink-0 overflow-y-auto">
          <div
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs ${isIOS ? 'bg-emerald-500/8 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-semibold block">
                {isIOS
                  ? iosInfo.isIPhone12
                    ? 'iPhone 12 (A14 Bionic) Detected'
                    : 'iOS Safari Detected'
                  : 'PC Browser Mode'}
              </span>
              <span className="text-[10px] opacity-70">
                {isIOS
                  ? 'Apple Hardware Encoder activated'
                  : 'Scan QR code on iPhone for HW acceleration'}
              </span>
            </div>
          </div>
          {isIOS && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
                Encoder Preset
              </p>
              <div className="space-y-1.5">
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
                      'w-full flex items-start gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed',
                      selectedPreset === key
                        ? 'border-emerald-500 bg-emerald-600/15 text-white shadow-sm ring-1 ring-emerald-500/30'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white',
                    ].join(' ')}
                  >
                    <Sparkles
                      size={15}
                      className={`mt-0.5 shrink-0 ${selectedPreset === key ? 'text-emerald-400' : 'text-white/40'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white">
                        {preset.label}
                      </p>
                      <p className="text-[10px] text-white/40 mt-0.5 font-mono">
                        {preset.codec} · {preset.fps}fps · {preset.bitrateMbps}
                        Mbps · Queue:{preset.maxQueueSize}
                      </p>
                    </div>
                    {selectedPreset === key && (
                      <CheckCircle2
                        size={14}
                        className="text-emerald-400 mt-0.5 shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span>Output Specs</span>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                H.264 / MP4
              </span>
            </div>
            <div className="space-y-1 text-slate-400 text-[11px]">
              <div className="flex justify-between">
                <span>Resolution:</span>
                <span className="font-mono text-slate-200">
                  {orientation === 'vertical'
                    ? '1080 × 1664 (Full HD)'
                    : '1664 × 1080 (Full HD)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>FPS / Bitrate:</span>
                <span className="font-mono text-slate-200">
                  {isIOS ? activePreset.fps : selectedFps}fps ·{' '}
                  {isIOS ? activePreset.bitrateMbps : '16'}Mbps
                </span>
              </div>
              <div className="flex justify-between">
                <span>Codec:</span>
                <span className="font-mono text-emerald-400 text-[10px]">
                  {isIOS ? activePreset.codec : 'avc1.4d002a'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GPU Queue Limit:</span>
                <span className="font-mono text-slate-200">
                  {isIOS
                    ? `${activePreset.maxQueueSize} frames (iOS memory safe)`
                    : '60 frames'}
                </span>
              </div>
            </div>
          </div>
          {isExporting && (
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 space-y-2 animate-in fade-in">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {isIOS ? 'Apple HW Encoding...' : 'Rendering...'}
                </span>
                <span className="font-mono font-bold text-white">
                  {exportProgress}%
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full transition-all duration-150"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 text-center">
                {isIOS
                  ? `A14 Bionic Media Engine · maxQueue:${activePreset.maxQueueSize} · UMA zero-copy`
                  : 'GPU WebCodecs hardware accelerated encode'}
              </div>
            </div>
          )}
          {exportError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
              Error: {exportError}
            </div>
          )}
          {exportCompleted && exportedBlob && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">
                  Export Completed!
                </span>
                <span className="text-[10px] font-mono text-slate-400 ml-auto">
                  {(exportedBlob.size / 1_000_000).toFixed(1)} MB
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>
                  Save MP4 — Bit-Perfect {isIOS ? activePreset.bitrateMbps : 16}{' '}
                  Mbps
                </span>
              </button>
              {isIOS && (
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-700 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <Info className="w-3.5 h-3.5" />
                    Bit-Perfect PC Sync — Avoid Camera Roll compression
                  </div>
                  <ol className="text-[11px] text-slate-300 space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 font-bold shrink-0">
                        1.
                      </span>
                      <span>
                        Tap <strong className="text-white">"Save MP4"</strong> →
                        Safari prompts{' '}
                        <strong className="text-emerald-400">"Download"</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 font-bold shrink-0">
                        2.
                      </span>
                      <span>
                        Safari downloads bar: tap{' '}
                        <FolderOpen className="w-3 h-3 inline text-blue-400" />{' '}
                        → saved to{' '}
                        <strong className="text-white">
                          Files.app / iCloud Drive
                        </strong>{' '}
                        (no Camera Roll HEVC re-compression)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 font-bold shrink-0">
                        3.
                      </span>
                      <span>
                        On PC: open{' '}
                        <File className="w-3 h-3 inline text-blue-400" />{' '}
                        <strong className="text-white">iCloud Drive</strong> or{' '}
                        <strong className="text-white">AirDrop</strong> to get
                        the{' '}
                        <strong className="text-emerald-400">
                          lossless {activePreset.bitrateMbps}Mbps MP4
                        </strong>{' '}
                        — zero re-compression.
                      </span>
                    </li>
                  </ol>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Photos.app auto-converts to HEVC. Always use Files.app for
                    lossless sync.
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setExportCompleted(false);
                  setExportedBlob(null);
                }}
                className="w-full py-2 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-xl transition-colors"
              >
                Re-Export
              </button>
            </div>
          )}
          {!exportCompleted && (
            <div className="mt-auto pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleExportClick}
                disabled={isPlaying || isExporting || scenes.length <= 1}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-blue-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Encoding... ({exportProgress}%)</span>
                  </>
                ) : (
                  <>
                    {isIOS ? (
                      <Smartphone className="w-4 h-4" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>
                      {isIOS
                        ? `Export with A14 Bionic — ${activePreset.bitrateMbps}Mbps`
                        : 'Export MP4 Video'}
                    </span>
                  </>
                )}
              </button>
              {scenes.length <= 1 && (
                <p className="text-center text-[10px] text-slate-500 mt-2">
                  Export requires 2+ scenes
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
