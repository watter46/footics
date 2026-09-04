'use client';

/**
 * export-preview-player.tsx
 * High-performance real-time canvas animation preview player for Export Modal.
 *
 * Features:
 *   - 60fps real-time interpolation preview (Players, Ball, Zones, Arrows, Texts)
 *   - Boundary Box Crop aware preview
 *   - Play / Pause, Timeline Seek bar, Loop toggle, Time display
 */

import { Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import type {
  AspectRatio,
  BoundaryBox,
  Slide,
} from '@/lib/types/tactical-unified';

interface ExportPreviewPlayerProps {
  slides: Slide[];
  aspectRatio: AspectRatio;
  boundaryBox?: BoundaryBox | null;
}

export function ExportPreviewPlayer({
  slides,
  aspectRatio,
  boundaryBox,
}: ExportPreviewPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeLabelRef = useRef<HTMLSpanElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);

  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const currentTimeRef = useRef<number>(0);

  const totalDurationMs = calculateUnifiedTotalDuration(slides) || 1000;

  const isBoundaryActive =
    boundaryBox?.enabled &&
    boundaryBox.width > 0 &&
    boundaryBox.height > 0 &&
    (boundaryBox.width < 100 ||
      boundaryBox.height < 100 ||
      boundaryBox.x > 0 ||
      boundaryBox.y > 0);

  // ── Canvas Frame Drawing ──
  const drawFrame = useCallback(
    (timeMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderTacticalFrameToCanvas(ctx, {
        slides,
        timeMs,
        width: canvas.width,
        height: canvas.height,
        aspectRatio,
        boundaryBox,
        transparent: false,
      });

      // Update UI elements directly without triggering React VDOM diffing
      if (timeLabelRef.current) {
        timeLabelRef.current.textContent = `${(timeMs / 1000).toFixed(1)}s`;
      }
      if (sliderRef.current) {
        sliderRef.current.value = String(Math.round(timeMs));
      }
    },
    [slides, boundaryBox, aspectRatio],
  );

  // ── Animation Loop ──
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    startTimeRef.current = null;

    const loop = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp - currentTimeRef.current;
      }

      const elapsed = timestamp - startTimeRef.current;
      currentTimeRef.current = elapsed % totalDurationMs;

      drawFrame(currentTimeRef.current);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, totalDurationMs, drawFrame]);

  // Initial draw
  useEffect(() => {
    drawFrame(currentTimeRef.current);
  }, [drawFrame]);

  const handleSeek = (time: number) => {
    currentTimeRef.current = time;
    startTimeRef.current = null;
    drawFrame(time);
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    handleSeek(0);
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-black/50 border border-white/10 p-3 overflow-hidden">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span className="font-semibold text-white/90">Animation Preview</span>
        <div className="flex items-center gap-1 font-mono text-[11px] text-white/50">
          <span ref={timeLabelRef}>0.0s</span>
          <span>/</span>
          <span>{(totalDurationMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        className={`relative w-full ${
          aspectRatio === '9:16'
            ? 'aspect-[9/16] max-h-[340px]'
            : 'aspect-video'
        } rounded-lg overflow-hidden border border-white/10 bg-[#020617] flex items-center justify-center`}
      >
        <canvas
          ref={canvasRef}
          width={aspectRatio === '9:16' ? 360 : 640}
          height={aspectRatio === '9:16' ? 640 : 360}
          className="w-full h-full object-contain"
        />

        {/* Boundary Crop Watermark/Badge */}
        {isBoundaryActive && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 border border-green-500/40 text-green-400 text-[10px] font-medium backdrop-blur-sm">
            Boundary Cropped
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={togglePlay}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          aria-label="Reset preview"
        >
          <RotateCcw size={14} />
        </button>

        {/* Timeline Slider */}
        <input
          ref={sliderRef}
          type="range"
          min={0}
          max={totalDurationMs}
          step={10}
          defaultValue={0}
          onChange={(e) => handleSeek(Number(e.target.value))}
          className="flex-1 h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
}
