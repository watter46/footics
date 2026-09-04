'use client';

import { useRef, useState } from 'react';
import {
  type BenchmarkProgress,
  runAutoBenchmark,
} from '@/lib/tactical/export/auto-benchmark-engine';
import type {
  AspectRatio,
  BoundaryBox,
  Slide,
} from '@/lib/types/tactical-unified';

interface BenchmarkOptions {
  slides: Slide[];
  format: 'mp4' | 'webm';
  aspectRatio?: AspectRatio;
  boundaryBox?: BoundaryBox;
  isExporting: boolean;
  onError: (msg: string) => void;
}

export function useExportBenchmark({
  slides,
  format,
  aspectRatio,
  boundaryBox,
  isExporting,
  onError,
}: BenchmarkOptions) {
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] =
    useState<BenchmarkProgress | null>(null);
  const [benchmarkReport, setBenchmarkReport] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const isBenchmarkCancelledRef = useRef(false);

  const runBenchmark = async (mode: 'full' | 'quick' = 'full') => {
    if (slides.length === 0 || isBenchmarking || isExporting) return;
    setIsBenchmarking(true);
    setBenchmarkReport(null);
    isBenchmarkCancelledRef.current = false;

    try {
      const { markdownReport } = await runAutoBenchmark({
        slides,
        fps: 60,
        scale: 2,
        format,
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
        onError((err as Error).message || 'Auto benchmark failed');
      }
    } finally {
      setIsBenchmarking(false);
      setBenchmarkProgress(null);
    }
  };

  const copyReport = () => {
    if (!benchmarkReport) return;
    navigator.clipboard.writeText(benchmarkReport);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const cancelBenchmark = () => {
    isBenchmarkCancelledRef.current = true;
  };

  const clearReport = () => setBenchmarkReport(null);

  return {
    isBenchmarking,
    benchmarkProgress,
    benchmarkReport,
    copiedReport,
    runBenchmark,
    copyReport,
    cancelBenchmark,
    clearReport,
  };
}
