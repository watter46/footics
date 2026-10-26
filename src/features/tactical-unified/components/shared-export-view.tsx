'use client';

import { Download, Film, Loader2, Share2, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { buildExportMVPMatrix } from '@/features/tactical-unified/core';
import { ExportPreviewPlayer } from '@/features/tactical-unified/panels/export/export-preview-player';
import {
  detectIOSDevice,
  IOS_ENCODER_PRESETS,
} from '@/features/tactical-unified/panels/export/ios-export-presets';
import type { TacticalExportSharePayload } from '@/lib/tactical/export/share-payload';
import { exportMultiSlideMp4Video } from '@/lib/tactical/export/tactical-video-exporter';
import { PITCH_BOUNDARY_CONFIGS } from '@/lib/tactical/pitch-geometry';
import type { AspectRatio, Slide } from '@/lib/types/tactical-unified';

export function SharedExportView({
  shareId,
}: {
  shareId: string;
}): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<TacticalExportSharePayload | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);

  const [ios] = useState(() =>
    typeof window === 'undefined'
      ? { isIOS: false, isIPhone12: false }
      : detectIOSDevice(),
  );
  const [key, setKey] = useState<'iphone12' | 'iosGeneral'>(
    ios.isIPhone12 ? 'iphone12' : 'iosGeneral',
  );
  const preset = IOS_ENCODER_PRESETS[key];

  useEffect(() => {
    if (!shareId) return;
    let ok = true;
    fetch(`/api/tactical-export/share?id=${encodeURIComponent(shareId)}`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
      )
      .then((j) => ok && setData(j.data as TacticalExportSharePayload))
      .catch(
        (e) => ok && setLoadError(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => ok && setLoading(false));
    return () => {
      ok = false;
    };
  }, [shareId]);

  const aspect: AspectRatio =
    data?.aspectRatio || (data?.orientation === 'vertical' ? '9:16' : '16:9');
  const boundary =
    PITCH_BOUNDARY_CONFIGS[aspect] ?? PITCH_BOUNDARY_CONFIGS['16:9'];
  const stageWidth = boundary.widthPx;
  const stageHeight = boundary.heightPx;
  const slides: Slide[] = data?.scenes
    ? data.scenes.map((s) => s as Slide)
    : [];

  const handleExportClick = async () => {
    if (slides.length === 0) {
      toast.error('エクスポート対象のシーンがありません。');
      return;
    }
    setIsExporting(true);
    setProgress(0);
    setBlob(null);

    try {
      const mvp = data?.pitchTransform
        ? (buildExportMVPMatrix(
            data.pitchTransform,
            stageWidth,
            stageHeight,
            aspect,
          ) as Float32Array)
        : null;

      const resBlob = await exportMultiSlideMp4Video({
        slides,
        ...preset,
        bitrate: preset.bitrateMbps * 1_000_000,
        boundaryBox: data?.boundaryBox ?? null,
        pitchTransform: data?.pitchTransform ?? null,
        mvpMatrix: mvp,
        stageWidth,
        stageHeight,
        aspectRatio: aspect,
        photos: data?.photos,
        onProgress: (p) => setProgress(p.percent),
      });
      setBlob(resBlob);
      toast.success('エクスポートが完了しました！');
    } catch {
      toast.error('エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = (share: boolean) => {
    if (!blob) return;
    if (share && typeof navigator !== 'undefined' && navigator.share) {
      const files = [
        new File([blob], `footics-${shareId}.mp4`, { type: 'video/mp4' }),
      ];
      navigator
        .share({ files, title: data?.title || 'Tactical Animation' })
        .catch(() => {});
      return;
    }
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `footics-${shareId}.mp4`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading || loadError || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center gap-3 text-white">
        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        ) : (
          <p className="text-sm text-slate-300">
            {loadError || 'Export URL is invalid or expired.'}
          </p>
        )}
        {!loading && (
          <Link
            href="/export"
            className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold"
          >
            Back to List
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none">
      <header className="h-14 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between px-4 sm:px-6">
        <Link
          href="/export"
          className="flex items-center gap-2 font-bold text-sm"
        >
          <Film className="w-4 h-4 text-blue-400" />
          Footics Export Studio
          {ios.isIOS && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {ios.isIPhone12 ? 'A14' : 'iOS'}
            </span>
          )}
        </Link>
        <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          24h
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-xl mx-auto w-full">
        <div className="w-full bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-2xl">
          <ExportPreviewPlayer
            slides={slides}
            aspectRatio={aspect}
            boundaryBox={data.boundaryBox}
            pitchTransform={data.pitchTransform}
            photos={data.photos}
          />

          {ios.isIOS && (
            <div className="flex gap-2">
              {(['iphone12', 'iosGeneral'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKey(k)}
                  disabled={isExporting}
                  className={`flex-1 p-2 rounded-xl border text-xs cursor-pointer ${
                    key === k
                      ? 'border-emerald-500 bg-emerald-600/15 text-white'
                      : 'border-white/10 text-white/60'
                  }`}
                >
                  {IOS_ENCODER_PRESETS[k].label} ({IOS_ENCODER_PRESETS[k].fps}
                  fps)
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
            <div>
              Title:{' '}
              <span className="text-slate-200 truncate">
                {data.title || 'Untitled'}
              </span>
            </div>
            <div>
              Scenes:{' '}
              <span className="text-blue-400 font-mono">
                {data.scenes.length}
              </span>
            </div>
            <div>
              Res:{' '}
              <span className="font-mono text-slate-200">
                {stageWidth}×{stageHeight}
              </span>
            </div>
            <div>
              Bitrate:{' '}
              <span className="font-mono text-emerald-400">
                {preset.bitrateMbps} Mbps
              </span>
            </div>
          </div>

          {isExporting && (
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 space-y-1.5 text-xs">
              <div className="flex justify-between text-blue-300 font-bold">
                <span>Rendering...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-blue-500 h-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {blob ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-emerald-300 font-bold px-1">
                <span>Completed</span>
                <span className="font-mono text-slate-400">
                  {(blob.size / 1e6).toFixed(1)} MB
                </span>
              </div>
              <div className="flex gap-2">
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save MP4
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleExportClick}
              disabled={isExporting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Smartphone className="w-4 h-4" />
              )}
              <span>
                {isExporting
                  ? `Encoding... (${progress}%)`
                  : `Export (${preset.bitrateMbps}Mbps)`}
              </span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
