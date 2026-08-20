import type Konva from 'konva';
import { useCallback, useRef } from 'react';
import { applyEasing } from '@/lib/tactical/easing';
import { calculateBezierPoint } from '@/lib/tactical/trajectory';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';

function lerp(start: number, end: number, t: number) {
  return start * (1 - t) + end * t;
}

export function useTacticalAnimation() {
  const setIsPlaying = useTacticalAnimationStore((s) => s.setIsPlaying);
  const setActiveSceneIndex = useTacticalAnimationStore(
    (s) => s.setActiveSceneIndex,
  );
  const animationFrameRef = useRef<number | null>(null);

  const playAnimation = useCallback(
    (stage: Konva.Stage | null, onComplete?: () => void) => {
      if (!stage) return;

      const scenes = useTacticalAnimationStore.getState().scenes;
      if (scenes.length <= 1) {
        if (onComplete) onComplete();
        return;
      }

      setIsPlaying(true);
      let startTimestamp: number | null = null;
      let currentSceneIdx = 0;
      const mainLayer = stage.getLayers()[0];
      const width = stage.width();
      const height = stage.height();

      const getPixelPos = (relX: number, relY: number) => ({
        x: (relX / 100) * width,
        y: (relY / 100) * height,
      });

      // 1. パフォーマンス最適化: アニメーション開始時に全ノードの参照を O(1) キャッシュ
      const nodeCache = new Map<string, Konva.Node>();
      const allPlayerIds = new Set<string>();
      scenes.forEach((sc) => {
        Object.keys(sc.players).forEach((id) => {
          allPlayerIds.add(id);
        });
      });

      allPlayerIds.forEach((id) => {
        const node = stage.findOne(`#marker-${id}`);
        if (node) nodeCache.set(id, node);
      });
      const ballNode = stage.findOne('#marker-ball');

      // 再生開始時に初期シーン (Scene 0) の座標へリセット
      const firstScene = scenes[0];
      if (firstScene) {
        Object.values(firstScene.players).forEach((p) => {
          const node = nodeCache.get(p.playerId);
          if (node) {
            node.visible(p.area === 'pitch');
            node.opacity(1);
            node.position({
              x: (p.x / 100) * width,
              y: (p.y / 100) * height,
            });
          }
        });
        if (ballNode) {
          ballNode.position({
            x: (firstScene.ballPos.x / 100) * width,
            y: (firstScene.ballPos.y / 100) * height,
          });
        }
        if (mainLayer) mainLayer.batchDraw();
      }

      const animate = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;

        const currentScenes = useTacticalAnimationStore.getState().scenes;
        const currentScene = currentScenes[currentSceneIdx];
        const nextScene = currentScenes[currentSceneIdx + 1];

        if (!nextScene) {
          setIsPlaying(false);
          setActiveSceneIndex(currentScenes.length - 1);
          if (mainLayer) mainLayer.batchDraw();
          if (onComplete) onComplete();
          return;
        }

        const durationMs = Math.max(100, currentScene.durationMs || 1500);
        const pauseMs = Math.max(0, currentScene.pauseMs || 0);
        const totalDuration = durationMs + pauseMs;

        if (elapsed >= totalDuration) {
          currentSceneIdx++;
          setActiveSceneIndex(currentSceneIdx);
          startTimestamp = timestamp;
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        // 補間割合 0.0 ~ 1.0 (Pause中は 1.0 に固定)
        let t = elapsed / durationMs;
        if (t > 1) t = 1;

        const ease = applyEasing(t, currentScene.easing);

        // 選手の座標更新 (O(1) ノード参照で高速化)
        allPlayerIds.forEach((playerId) => {
          const startP = currentScene.players[playerId];
          const endP = nextScene.players[playerId];
          const node = nodeCache.get(playerId);

          if (!node) return;

          if (startP && endP) {
            if (startP.area === 'pitch' && endP.area === 'pitch') {
              node.visible(true);
              const interpolatedPos = calculateBezierPoint(
                { x: startP.x, y: startP.y },
                { x: endP.x, y: endP.y },
                ease,
                endP.trajectory,
              );
              const pxPos = getPixelPos(interpolatedPos.x, interpolatedPos.y);
              node.position({ x: pxPos.x, y: pxPos.y });
            } else if (startP.area === 'pitch' && endP.area === 'bench') {
              node.opacity(1 - ease);
              if (ease >= 1) node.visible(false);
            } else if (startP.area === 'bench' && endP.area === 'pitch') {
              node.visible(true);
              node.opacity(ease);
              const pxPos = getPixelPos(endP.x, endP.y);
              node.position({ x: pxPos.x, y: pxPos.y });
            }
          }
        });

        // ボールの座標更新
        const ballStart = currentScene.ballPos;
        const ballEnd = nextScene.ballPos;
        if (ballStart && ballEnd && ballNode) {
          const ballX = lerp(ballStart.x, ballEnd.x, ease);
          const ballY = lerp(ballStart.y, ballEnd.y, ease);
          const pxPos = getPixelPos(ballX, ballY);
          ballNode.position({ x: pxPos.x, y: pxPos.y });
        }

        if (mainLayer) {
          mainLayer.batchDraw();
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [setIsPlaying, setActiveSceneIndex],
  );

  const stopAnimation = useCallback(
    (stage?: Konva.Stage | null) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsPlaying(false);

      if (stage) {
        const activeIdx = useTacticalAnimationStore.getState().activeSceneIndex;
        const activeScene =
          useTacticalAnimationStore.getState().scenes[activeIdx];
        const mainLayer = stage.getLayers()[0];
        if (activeScene && mainLayer) {
          const width = stage.width();
          const height = stage.height();

          Object.values(activeScene.players).forEach((p) => {
            const node = stage.findOne(`#marker-${p.playerId}`);
            if (node) {
              node.visible(p.area === 'pitch');
              node.opacity(1);
              node.position({
                x: (p.x / 100) * width,
                y: (p.y / 100) * height,
              });
            }
          });

          const ballNode = stage.findOne('#marker-ball');
          if (ballNode) {
            ballNode.position({
              x: (activeScene.ballPos.x / 100) * width,
              y: (activeScene.ballPos.y / 100) * height,
            });
          }

          mainLayer.batchDraw();
        }
      }
    },
    [setIsPlaying],
  );

  return { playAnimation, stopAnimation };
}
