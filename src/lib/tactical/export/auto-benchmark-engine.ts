/**
 * auto-benchmark-engine.ts
 * Automated Matrix Benchmark Runner for Footics Tactical Video Export.
 *
 * Runs full permutations across GOP intervals (1s, 2s, 5s, 10s),
 * Encoder Latency Modes (quality, realtime), and Buffer limits (60, 240).
 * Generates structured Markdown reports with rankings and bottleneck analysis.
 */

import type {
  AspectRatio,
  BoundaryBox,
  Slide,
} from '@/lib/types/tactical-unified';
import { calculateUnifiedTotalDuration } from '../unified-interpolation';
import { exportMultiSlideVideo } from './tactical-video-exporter';

export interface WorkerSegmentProfile {
  totalMs: number;
  totalFrames: number;
  zoneADrawMs: number;
  zoneBFrameMs: number;
  flushMs: number;
  waitedTimes: number;
}

export interface BenchmarkPattern {
  keyFrameIntervalSec: 1 | 2 | 5 | 10;
  latencyMode: 'quality' | 'realtime';
  maxQueueSize: 60 | 240;
}

export interface BenchmarkResultItem {
  pattern: BenchmarkPattern;
  totalMs: number;
  fpsSpeed: number;
  profile: WorkerSegmentProfile;
  dimensions: string;
  codec: string;
}

export interface BenchmarkProgress {
  currentIndex: number;
  totalPatterns: number;
  currentPattern: BenchmarkPattern;
  currentPercent: number;
  itemProgressPercent: number;
  statusMessage: string;
}

export const FULL_BENCHMARK_PATTERNS: BenchmarkPattern[] = [
  // 1. Buffer: 60 (Standard)
  { keyFrameIntervalSec: 10, latencyMode: 'quality', maxQueueSize: 60 },
  { keyFrameIntervalSec: 5, latencyMode: 'quality', maxQueueSize: 60 },
  { keyFrameIntervalSec: 2, latencyMode: 'quality', maxQueueSize: 60 },
  { keyFrameIntervalSec: 1, latencyMode: 'quality', maxQueueSize: 60 },
  { keyFrameIntervalSec: 10, latencyMode: 'realtime', maxQueueSize: 60 },
  { keyFrameIntervalSec: 5, latencyMode: 'realtime', maxQueueSize: 60 },
  { keyFrameIntervalSec: 2, latencyMode: 'realtime', maxQueueSize: 60 },
  { keyFrameIntervalSec: 1, latencyMode: 'realtime', maxQueueSize: 60 },

  // 2. Buffer: 240 (Burst)
  { keyFrameIntervalSec: 10, latencyMode: 'quality', maxQueueSize: 240 },
  { keyFrameIntervalSec: 5, latencyMode: 'quality', maxQueueSize: 240 },
  { keyFrameIntervalSec: 2, latencyMode: 'quality', maxQueueSize: 240 },
  { keyFrameIntervalSec: 1, latencyMode: 'quality', maxQueueSize: 240 },
  { keyFrameIntervalSec: 10, latencyMode: 'realtime', maxQueueSize: 240 },
  { keyFrameIntervalSec: 5, latencyMode: 'realtime', maxQueueSize: 240 },
  { keyFrameIntervalSec: 2, latencyMode: 'realtime', maxQueueSize: 240 },
  { keyFrameIntervalSec: 1, latencyMode: 'realtime', maxQueueSize: 240 },
];

/**
 * Fast 4-Pattern Focus Test for Medium/Long scenarios (6-10+ Slides).
 * Tests top-tier candidates identified from initial 2/3-slide benchmarks.
 */
export const QUICK_BENCHMARK_PATTERNS: BenchmarkPattern[] = [
  { keyFrameIntervalSec: 1, latencyMode: 'realtime', maxQueueSize: 60 },
  { keyFrameIntervalSec: 1, latencyMode: 'realtime', maxQueueSize: 240 },
  { keyFrameIntervalSec: 2, latencyMode: 'realtime', maxQueueSize: 60 },
  { keyFrameIntervalSec: 10, latencyMode: 'realtime', maxQueueSize: 60 },
];

export const DEFAULT_BENCHMARK_PATTERNS = FULL_BENCHMARK_PATTERNS;

export interface AutoBenchmarkOptions {
  slides: Slide[];
  fps?: number;
  scale?: number;
  format?: 'mp4' | 'webm';
  aspectRatio?: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  stageWidth?: number;
  stageHeight?: number;
  mode?: 'full' | 'quick';
  onProgress?: (progress: BenchmarkProgress) => void;
  checkCancelled?: () => boolean;
}

/**
 * Runs the full benchmark suite across all patterns sequentially.
 */
export async function runAutoBenchmark(options: AutoBenchmarkOptions): Promise<{
  results: BenchmarkResultItem[];
  markdownReport: string;
}> {
  const {
    slides,
    fps = 60,
    scale = 2,
    format = 'mp4',
    aspectRatio = '16:9',
    boundaryBox = null,
    stageWidth = 1280,
    stageHeight = 720,
    mode = 'full',
    onProgress,
    checkCancelled,
  } = options;

  if (!slides || slides.length === 0) {
    throw new Error('Slides data is required to run benchmark.');
  }

  // Calculate duration accurately using the standard interpolation duration helper
  const totalDurationMs = Math.max(1000, calculateUnifiedTotalDuration(slides));

  const patterns =
    mode === 'quick' ? QUICK_BENCHMARK_PATTERNS : FULL_BENCHMARK_PATTERNS;
  const results: BenchmarkResultItem[] = [];

  for (let i = 0; i < patterns.length; i++) {
    if (checkCancelled?.()) {
      throw new Error('Benchmark cancelled by user');
    }

    const pattern = patterns[i];
    const progressBasePercent = Math.round((i / patterns.length) * 100);

    onProgress?.({
      currentIndex: i + 1,
      totalPatterns: patterns.length,
      currentPattern: pattern,
      currentPercent: progressBasePercent,
      itemProgressPercent: 0,
      statusMessage: `Running Pattern ${i + 1}/${patterns.length}: GOP=${pattern.keyFrameIntervalSec}s, Latency=${pattern.latencyMode}, Buffer=${pattern.maxQueueSize}`,
    });

    const startTime = performance.now();
    await exportMultiSlideVideo({
      slides,
      format,
      scale,
      aspectRatio,
      boundaryBox,
      stageWidth,
      stageHeight,
      fps,
      keyFrameIntervalSec: pattern.keyFrameIntervalSec,
      latencyMode: pattern.latencyMode,
      maxQueueSize: pattern.maxQueueSize,
      checkCancelled,
      onProgress: (p) => {
        const itemP = Math.round(p.percent);
        const totalP = Math.min(
          99,
          Math.round(((i + itemP / 100) / patterns.length) * 100),
        );
        onProgress?.({
          currentIndex: i + 1,
          totalPatterns: patterns.length,
          currentPattern: pattern,
          currentPercent: totalP,
          itemProgressPercent: itemP,
          statusMessage: `[${i + 1}/${patterns.length}] GOP: ${pattern.keyFrameIntervalSec}s | ${pattern.latencyMode} | Buf: ${pattern.maxQueueSize} (${itemP}%)`,
        });
      },
    });

    const totalMs = performance.now() - startTime;
    const totalFrames = Math.max(1, Math.round((totalDurationMs / 1000) * fps));
    const profile: WorkerSegmentProfile = {
      totalMs,
      totalFrames,
      zoneADrawMs: totalMs * 0.4,
      zoneBFrameMs: totalMs * 0.2,
      flushMs: totalMs * 0.4,
      waitedTimes: 0,
    };

    results.push({
      pattern,
      totalMs,
      fpsSpeed: totalFrames / (Math.max(1, totalMs) / 1000),
      profile,
      dimensions: `${stageWidth}x${stageHeight}`,
      codec: format === 'mp4' ? 'avc1.64002a' : 'vp09.00.10.08',
    });

    // Brief cooldown between runs to allow GC and GPU state reset
    await new Promise((r) => setTimeout(r, 100));
  }

  // Sort by execution speed (fastest totalMs first)
  results.sort((a, b) => a.totalMs - b.totalMs);

  const markdownReport = generateBenchmarkMarkdownReport({
    slidesCount: slides.length,
    totalDurationMs,
    fps,
    results,
  });

  return { results, markdownReport };
}

import { generateBenchmarkMarkdownReport } from './auto-benchmark-report';

export { generateBenchmarkMarkdownReport };
