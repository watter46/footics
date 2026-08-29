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
import {
  executeOffThreadVideoExport,
  type VideoExportWorkerRequest,
  type WorkerSegmentProfile,
} from './video-export-worker';

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

    const request: VideoExportWorkerRequest = {
      id: `bench_${i}_${Date.now()}`,
      type: 'START_EXPORT',
      format,
      fps,
      scale,
      quality: 'high',
      bitrate: 24_000_000,
      h264Profile: 'high',
      keyFrameIntervalSec: pattern.keyFrameIntervalSec,
      latencyMode: pattern.latencyMode,
      maxQueueSize: pattern.maxQueueSize,
      transparent: format === 'webm',
      totalDurationMs,
      boundaryBox,
      stageWidth,
      stageHeight,
      slides,
      aspectRatio,
      isMainThread: true,
    };

    const out = await executeOffThreadVideoExport(
      request,
      (renderProgress) => {
        const itemP = renderProgress.percent;
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
      checkCancelled,
    );

    if (out.profile) {
      results.push({
        pattern,
        totalMs: out.profile.totalMs,
        fpsSpeed: out.profile.totalFrames / (out.profile.totalMs / 1000),
        profile: out.profile,
        dimensions: `${stageWidth}x${stageHeight}`,
        codec: format === 'mp4' ? 'avc1.64002a' : 'vp09.00.10.08',
      });
    }

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

/**
 * Formats results into a clean Markdown table with rankings and summaries.
 */
export function generateBenchmarkMarkdownReport(params: {
  slidesCount: number;
  totalDurationMs: number;
  fps: number;
  results: BenchmarkResultItem[];
}): string {
  const { slidesCount, totalDurationMs, fps, results } = params;
  if (results.length === 0) return '# 📊 Benchmark Results: No data collected';

  const best = results[0];
  const worst = results[results.length - 1];
  const totalFrames = best.profile.totalFrames;
  const durationSec = (totalDurationMs / 1000).toFixed(1);
  const dateStr = new Date().toLocaleString();

  const diffSec = ((worst.totalMs - best.totalMs) / 1000).toFixed(2);
  const boostPercent = (
    ((worst.totalMs - best.totalMs) / worst.totalMs) *
    100
  ).toFixed(1);

  let md = `# 🚀 Footics 動画エクスポート 自動ベンチマーク結果レポート\n\n`;
  md += `- **スライド枚数**: ${slidesCount} 枚\n`;
  md += `- **動画仕様**: ${durationSec} 秒 (${totalFrames} フレーム @ ${fps}fps) / 1080p FHD (Scale=2) / 24Mbps High\n`;
  md += `- **計測日時**: ${dateStr}\n`;
  md += `- **テストパターン数**: ${results.length} パターン\n\n`;

  md += `## 🏆 総合ランキング (処理速度順)\n\n`;
  md += `| 順位 | GOP間隔 | Latency Mode | Buffer | 全体所要時間 | 実効FPS | 区画A (描画) | 区画B (Frame) | 区画C (GPU Flush) | 待機回数 |\n`;
  md += `| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  results.forEach((item, index) => {
    const medal =
      index === 0
        ? '🥇 1'
        : index === 1
          ? '🥈 2'
          : index === 2
            ? '🥉 3'
            : `${index + 1}`;
    const isTop = index === 0;
    const timeStr = `${(item.totalMs / 1000).toFixed(2)}s`;
    const fpsStr = `${item.fpsSpeed.toFixed(1)} fps`;
    const drawStr = `${item.profile.zoneADrawMs.toFixed(1)}ms`;
    const frameStr = `${item.profile.zoneBFrameMs.toFixed(1)}ms`;
    const flushStr = `${item.profile.flushMs.toFixed(1)}ms`;
    const waitTimes = item.profile.waitedTimes;

    const gop = isTop
      ? `**${item.pattern.keyFrameIntervalSec}s**`
      : `${item.pattern.keyFrameIntervalSec}s`;
    const lat = isTop
      ? `**${item.pattern.latencyMode}**`
      : `${item.pattern.latencyMode}`;
    const buf = isTop
      ? `**${item.pattern.maxQueueSize}**`
      : `${item.pattern.maxQueueSize}`;
    const total = isTop ? `**${timeStr}**` : timeStr;
    const fpsVal = isTop ? `**${fpsStr}**` : fpsStr;

    md += `| ${medal} | ${gop} | ${lat} | ${buf} | ${total} | ${fpsVal} | ${drawStr} | ${frameStr} | ${flushStr} | ${waitTimes}回 |\n`;
  });

  md += `\n---\n\n`;
  md += `## 💡 最適化サマリー & 分析結果\n\n`;
  md += `1. **最速構成 (Champion)**:\n`;
  md += `   - **GOP**: \`${best.pattern.keyFrameIntervalSec}s (${best.pattern.keyFrameIntervalSec * fps}f)\`\n`;
  md += `   - **Latency Mode**: \`${best.pattern.latencyMode}\`\n`;
  md += `   - **GPU Buffer**: \`${best.pattern.maxQueueSize}\`\n`;
  md += `   - **最速タイム**: **${(best.totalMs / 1000).toFixed(2)} 秒** (${best.fpsSpeed.toFixed(1)} fps)\n\n`;

  md += `2. **短縮効果 (vs 最遅設定)**:\n`;
  md += `   - 最遅設定 (${(worst.totalMs / 1000).toFixed(2)}s) に対し、**${diffSec} 秒 (${boostPercent}%) 高速化**。\n`;
  md += `   - 主な短縮要因: **GPU Flush (未消化キュー滞留) の短縮 (${(worst.profile.flushMs / 1000).toFixed(2)}s → ${(best.profile.flushMs / 1000).toFixed(2)}s)**\n\n`;

  md += `3. **CPU vs GPU ボトルネック状況**:\n`;
  const cpuMs = best.profile.zoneADrawMs + best.profile.zoneBFrameMs;
  const cpuPct = ((cpuMs / best.totalMs) * 100).toFixed(1);
  const gpuPct = (100 - Number(cpuPct)).toFixed(1);
  md += `   - **CPU描画+Frame生成**: ${cpuMs.toFixed(1)}ms (${cpuPct}%) → 完全余裕 (平均 ${(cpuMs / totalFrames).toFixed(2)}ms/f)\n`;
  md += `   - **GPUエンコード**: ${(best.totalMs - cpuMs).toFixed(1)}ms (${gpuPct}%)\n`;

  return md;
}
