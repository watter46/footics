'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  detectIOSDevice,
  IOS_ENCODER_PRESETS,
  type IosEncoderPresetKey,
} from '@/features/tactical-unified/panels/export/ios-export-presets';
import { hasActiveDirectorCameraTrack } from '@/lib/tactical/engine/director-camera';
import type { TacticalExportSharePayload } from '@/lib/tactical/export/share-payload';
import { exportMultiSlideMp4Video } from '@/lib/tactical/export/tactical-video-exporter';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { AspectRatio } from '@/lib/types/tactical/primitives';

export interface UseSharePageExportOptions {
  shareId?: string;
}

export function useSharePageExport(options?: UseSharePageExportOptions) {
  const params = useParams();
  const shareId = options?.shareId ?? (params?.shareId as string);

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
  const [canShare, setCanShare] = useState(false);

  const [iosInfo] = useState(() =>
    typeof window === 'undefined'
      ? { isIOS: false, isIPhone12: false }
      : detectIOSDevice(),
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
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errBody.error || `HTTP error ${res.status}`);
        }
        const json = (await res.json()) as { data: TacticalExportSharePayload };
        if (isMounted) setShareData(json.data);
      } catch (err) {
        if (isMounted)
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
    if (
      typeof navigator !== 'undefined' &&
      'share' in navigator &&
      'canShare' in navigator &&
      exportedBlob
    ) {
      try {
        const testFile = new File(
          [exportedBlob],
          `footics-tactical-${shareId}.mp4`,
          { type: 'video/mp4' },
        );
        setCanShare(navigator.canShare({ files: [testFile] }));
      } catch {
        setCanShare(false);
      }
    } else {
      setCanShare(false);
    }
  }, [exportedBlob, shareId]);

  const effectiveAspectRatio: AspectRatio =
    shareData?.aspectRatio ||
    (shareData?.orientation === 'vertical' ? '9:16' : '16:9');
  const stageWidth = 1920;
  const stageHeight = 1080;
  const slides: DomainSlide[] = shareData?.scenes
    ? shareData.scenes.map((s) => s as DomainSlide)
    : [];
  const [presetKey, setPresetKey] = useState<IosEncoderPresetKey>('24mbps');
  const activePreset = IOS_ENCODER_PRESETS[presetKey];

  const handleExportClick = async () => {
    if (slides.length === 0) {
      toast.error('エクスポート対象のシーンがありません。');
      return;
    }
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    setExportCompleted(false);
    setExportedBlob(null);

    try {
      const isDirectorActive = hasActiveDirectorCameraTrack(
        shareData?.directorCamera,
      );
      const isSingleSlide = slides.length <= 1;
      const effectivePitchTransform = isDirectorActive
        ? null
        : isSingleSlide
          ? (shareData?.pitchTransform ?? null)
          : null;

      const blob = await exportMultiSlideMp4Video({
        slides,
        fps: activePreset.fps,
        scale: 1,
        quality: 'high',
        bitrate: activePreset.bitrateMbps * 1_000_000,
        h264Profile: 'high',
        keyFrameIntervalSec: activePreset.keyFrameIntervalSec,
        latencyMode: activePreset.latencyMode,
        maxQueueSize: activePreset.maxQueueSize,
        transparent: false,
        boundaryBox: shareData?.boundaryBox ?? null,
        pitchTransform: effectivePitchTransform,
        directorCamera: shareData?.directorCamera ?? null,
        screenBackground: shareData?.screenBackground ?? undefined,
        pitchAppearance: shareData?.pitchAppearance,
        stageWidth: 1920,
        stageHeight: 1080,
        aspectRatio: effectiveAspectRatio,
        photos: shareData?.photos,
        teamVisibility: shareData?.teamVisibility ?? 'both',
        onProgress: (p) => setExportProgress(p.percent),
      });
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
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `footics-tactical-${shareId}.mp4`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleWebShare = async () => {
    if (!exportedBlob || typeof navigator === 'undefined' || !navigator.share)
      return;
    try {
      const file = new File(
        [exportedBlob],
        `footics-tactical-${shareId || 'export'}.mp4`,
        { type: 'video/mp4' },
      );
      await navigator.share({
        files: [file],
        title: shareData?.title || 'Tactical Animation',
      });
      toast.success('ファイルを共有しました');
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Share failed:', err);
        toast.error('共有に失敗しました');
      }
    }
  };

  return {
    shareId,
    isLoading,
    loadError,
    shareData,
    isExporting,
    exportProgress,
    exportError,
    exportCompleted,
    exportedBlob,
    canShare,
    iosInfo,
    effectiveAspectRatio,
    stageWidth,
    stageHeight,
    slides,
    presetKey,
    setPresetKey,
    activePreset,
    handleExportClick,
    handleDownload,
    handleWebShare,
  };
}
