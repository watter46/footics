'use client';

/**
 * use-tactical-animation.ts
 * Tactical Unified Canvas — 60fps/120fps Animation Engine Hook
 *
 * Responsibilities:
 *   - スライド全体の補間アニメーションループ (requestAnimationFrame)
 *   - ゾーン頂点モーフィング (Polygon / Rect / Ellipse)
 *   - 選手・ボール・矢印・テキストのダイレクト Konva ノード更新 (O(1) キャッシュ)
 *   - タイムライン再生制御 (Play / Pause / Stop / Reset / Loop)
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  calculateUnifiedTotalDuration,
  getInterpolatedUnifiedSlideFrame,
} from '@/lib/tactical/unified-interpolation';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import type { CanvasNodesRegistry } from '../canvas/canvas-registry';

interface UseTacticalAnimationOptions {
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  loop?: boolean;
}

export function useTacticalAnimation(options?: UseTacticalAnimationOptions) {
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const setActiveSlide = useTacticalUnifiedStore((s) => s.setActiveSlide);
  const setIsPlaying = useTacticalUnifiedStore((s) => s.setIsPlaying);

  const animationFrameRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const currentPlaybackTimeRef = useRef<number>(0);
  const lastActiveSlideIndexRef = useRef<number>(0);

  // 合計再生時間
  const totalDurationMs = calculateUnifiedTotalDuration(slides);

  /**
   * 指定時間 (timeMs) のフレーム状態を Konva ノードにダイレクト適用
   */
  const applyFrameToCanvas = useCallback(
    (
      timeMs: number,
      registry: CanvasNodesRegistry | undefined,
      stageWidth: number,
      stageHeight: number,
      synchronous = false,
    ) => {
      if (!registry) return;

      const currentSlides = useTacticalUnifiedStore.getState().project.slides;
      if (currentSlides.length === 0) return;

      const frame = getInterpolatedUnifiedSlideFrame(currentSlides, timeMs);

      // スライドインデックスが切り替わった場合、Store のアクティブスライドを同期
      if (frame.currentSlideIndex !== lastActiveSlideIndexRef.current) {
        lastActiveSlideIndexRef.current = frame.currentSlideIndex;
        const targetSlide = currentSlides[frame.currentSlideIndex];
        if (
          targetSlide &&
          targetSlide.id !== useTacticalUnifiedStore.getState().activeSlideId
        ) {
          setActiveSlide(targetSlide.id);
        }
      }

      // 1. 選手ノード (Player Nodes) のダイレクト更新
      Object.entries(frame.players).forEach(([playerId, pState]) => {
        const playerGroup =
          registry.playerNodes.get(playerId) ||
          (pState.id ? registry.playerNodes.get(pState.id) : undefined);
        if (playerGroup) {
          const pxX = (pState.x / 100) * stageWidth;
          const pxY = (pState.y / 100) * stageHeight;
          playerGroup.position({ x: pxX, y: pxY });
          playerGroup.opacity(pState.opacity);
          playerGroup.visible(pState.visible);
        }
      });

      // 2. ボールノード (Ball Node) のダイレクト更新
      if (registry.ballNode) {
        const ballPxX = (frame.ball.x / 100) * stageWidth;
        const ballPxY = (frame.ball.y / 100) * stageHeight;
        registry.ballNode.position({ x: ballPxX, y: ballPxY });
        registry.ballNode.opacity(frame.ball.opacity);
        registry.ballNode.visible(frame.ball.visible);
      }

      // 3. ゾーンノード (Zone Nodes: Vertex Morphing) のダイレクト更新
      Object.entries(frame.zones).forEach(([zoneId, zState]) => {
        const zoneShape = registry.zoneNodes.get(zoneId);
        if (zoneShape) {
          const opacity = zState.opacity ?? 0.25;
          const alphaHex = Math.round(opacity * 255)
            .toString(16)
            .padStart(2, '0');
          const fillRGBA = (zState.color || '#22c55e') + alphaHex;
          const strokeColor = zState.strokeColor ?? zState.color ?? '#22c55e';

          zoneShape.visible(zState.visible);
          zoneShape.opacity(1); // アルファは fillRGBA で制御

          if (zState.shapeType === 'polygon' && 'points' in zoneShape) {
            // Polygon Line ノードの頂点更新 (頂点モーフィング反映)
            const pxPoints = zState.points.flatMap((pt) => [
              (pt.x / 100) * stageWidth,
              (pt.y / 100) * stageHeight,
            ]);
            (zoneShape as any).points(pxPoints);
            (zoneShape as any).fill(fillRGBA);
            (zoneShape as any).stroke(strokeColor);
            (zoneShape as any).strokeWidth(zState.strokeWidth);
          } else if (zState.shapeType === 'rect') {
            // Rect ノード
            const normX = zState.x ?? zState.points[0]?.x ?? 20;
            const normY = zState.y ?? zState.points[0]?.y ?? 20;
            const normW = zState.width ?? 30;
            const normH = zState.height ?? 20;
            const pxX = (normX / 100) * stageWidth;
            const pxY = (normY / 100) * stageHeight;
            const pxW = (normW / 100) * stageWidth;
            const pxH = (normH / 100) * stageHeight;

            zoneShape.position({ x: pxX, y: pxY });
            (zoneShape as any).width(pxW);
            (zoneShape as any).height(pxH);
            (zoneShape as any).rotation(zState.rotation || 0);
            (zoneShape as any).fill(fillRGBA);
            (zoneShape as any).stroke(strokeColor);
            (zoneShape as any).strokeWidth(zState.strokeWidth);
          } else if (zState.shapeType === 'ellipse') {
            // Ellipse ノード
            const normX = zState.x ?? zState.points[0]?.x ?? 20;
            const normY = zState.y ?? zState.points[0]?.y ?? 20;
            const normW = zState.width ?? 30;
            const normH = zState.height ?? 20;
            const pxW = (normW / 100) * stageWidth;
            const pxH = (normH / 100) * stageHeight;
            const cx = (normX / 100) * stageWidth + pxW / 2;
            const cy = (normY / 100) * stageHeight + pxH / 2;

            zoneShape.position({ x: cx, y: cy });
            (zoneShape as any).radiusX(pxW / 2);
            (zoneShape as any).radiusY(pxH / 2);
            (zoneShape as any).rotation(zState.rotation || 0);
            (zoneShape as any).fill(fillRGBA);
            (zoneShape as any).stroke(strokeColor);
            (zoneShape as any).strokeWidth(zState.strokeWidth);
          }
        }
      });

      // 4. 矢印ノード (Arrow Nodes) のダイレクト更新
      Object.entries(frame.arrows).forEach(([arrowId, aState]) => {
        const arrowEntry = registry.arrowNodes.get(arrowId);
        if (arrowEntry?.node) {
          const rawP0 = aState.points[0] ?? { x: 20, y: 50 };
          const rawP1 = aState.points[1] ?? { x: 40, y: 50 };
          const sPxX = (rawP0.x / 100) * stageWidth;
          const sPxY = (rawP0.y / 100) * stageHeight;
          const ePxX = (rawP1.x / 100) * stageWidth;
          const ePxY = (rawP1.y / 100) * stageHeight;

          let renderPts = [sPxX, sPxY, ePxX, ePxY];
          if (aState.curveType === 'curved' && aState.controlPoint) {
            const cpPxX = (aState.controlPoint.x / 100) * stageWidth;
            const cpPxY = (aState.controlPoint.y / 100) * stageHeight;
            renderPts = [sPxX, sPxY, cpPxX, cpPxY, ePxX, ePxY];
          }

          arrowEntry.node.points(renderPts);
          arrowEntry.node.stroke(aState.color);
          arrowEntry.node.fill(aState.color);
          arrowEntry.node.strokeWidth(aState.strokeWidth);
          arrowEntry.node.opacity(aState.opacity);
          arrowEntry.node.visible(aState.visible);
        }
      });

      // 5. テキストノード (Text Nodes) のダイレクト更新
      Object.entries(frame.texts).forEach(([textId, tState]) => {
        const textNode = registry.textNodes.get(textId);
        if (textNode) {
          const pxX = (tState.x / 100) * stageWidth;
          const pxY = (tState.y / 100) * stageHeight;
          textNode.position({ x: pxX, y: pxY });
          textNode.text(tState.content);
          textNode.fontSize(tState.fontSize);
          textNode.fill(tState.color);
          textNode.opacity(tState.opacity);
          textNode.visible(tState.visible);
        }
      });

      // レイヤーの再描画 (エクスポート時は同期 draw()、リアルタイム再生時は batchDraw())
      if (synchronous) {
        registry.backgroundLayer?.draw();
        registry.annotationLayer?.draw();
        registry.playerLayer?.draw();
        registry.ballLayer?.draw();
        registry.stage?.draw();
      } else {
        registry.playerLayer?.batchDraw();
        registry.ballLayer?.batchDraw();
        registry.annotationLayer?.batchDraw();
      }
    },
    [setActiveSlide],
  );

  /**
   * アニメーション開始
   */
  const playAnimation = useCallback(
    (onComplete?: () => void) => {
      const currentSlides = useTacticalUnifiedStore.getState().project.slides;
      if (currentSlides.length <= 1) {
        onComplete?.();
        return;
      }

      setIsPlaying(true);
      startTimestampRef.current = null;

      const registry = options?.nodesRegistryRef?.current;
      const stage = registry?.stage;
      const stageWidth = stage ? stage.width() : 800;
      const stageHeight = stage ? stage.height() : 450;

      const totalDuration = calculateUnifiedTotalDuration(currentSlides);

      const animate = (timestamp: number) => {
        if (!startTimestampRef.current) {
          startTimestampRef.current =
            timestamp - currentPlaybackTimeRef.current;
        }

        const elapsed = timestamp - startTimestampRef.current;
        currentPlaybackTimeRef.current = elapsed;

        if (elapsed >= totalDuration) {
          // 再生終了
          currentPlaybackTimeRef.current = 0;
          startTimestampRef.current = null;

          if (options?.loop) {
            // ループ再生
            applyFrameToCanvas(0, registry, stageWidth, stageHeight);
            animationFrameRef.current = requestAnimationFrame(animate);
            return;
          }

          // 停止
          setIsPlaying(false);
          applyFrameToCanvas(totalDuration, registry, stageWidth, stageHeight);
          onComplete?.();
          return;
        }

        applyFrameToCanvas(elapsed, registry, stageWidth, stageHeight);
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [
      applyFrameToCanvas,
      setIsPlaying,
      options?.loop,
      options?.nodesRegistryRef,
    ],
  );

  /**
   * アニメーション一時停止 (Pause)
   */
  const pauseAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimestampRef.current = null;
    setIsPlaying(false);
  }, [setIsPlaying]);

  /**
   * アニメーション完全停止 (Stop & Reset to Slide 0)
   */
  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimestampRef.current = null;
    currentPlaybackTimeRef.current = 0;
    lastActiveSlideIndexRef.current = 0;
    setIsPlaying(false);

    const registry = options?.nodesRegistryRef?.current;
    const stage = registry?.stage;
    const stageWidth = stage ? stage.width() : 800;
    const stageHeight = stage ? stage.height() : 450;

    const currentSlides = useTacticalUnifiedStore.getState().project.slides;
    if (currentSlides.length > 0) {
      setActiveSlide(currentSlides[0].id);
      applyFrameToCanvas(0, registry, stageWidth, stageHeight);
    }
  }, [
    applyFrameToCanvas,
    setIsPlaying,
    setActiveSlide,
    options?.nodesRegistryRef,
  ]);

  /**
   * 任意時間 (ms) へのシーク (Seek)
   */
  const seekTo = useCallback(
    (timeMs: number) => {
      currentPlaybackTimeRef.current = Math.max(
        0,
        Math.min(totalDurationMs, timeMs),
      );
      startTimestampRef.current = null;

      const registry = options?.nodesRegistryRef?.current;
      const stage = registry?.stage;
      const stageWidth = stage ? stage.width() : 800;
      const stageHeight = stage ? stage.height() : 450;

      applyFrameToCanvas(
        currentPlaybackTimeRef.current,
        registry,
        stageWidth,
        stageHeight,
      );
    },
    [applyFrameToCanvas, totalDurationMs, options?.nodesRegistryRef],
  );

  // コンポーネント破棄時にアニメーションタイマーをクリア
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    playAnimation,
    pauseAnimation,
    stopAnimation,
    seekTo,
    applyFrameToCanvas,
    totalDurationMs,
    currentPlaybackTime: currentPlaybackTimeRef.current,
  };
}
