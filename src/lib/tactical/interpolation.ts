import type { TacticalScene } from '@/stores/tactical-animation-store';
import { applyEasing } from './easing';
import { calculateBezierPoint } from './trajectory';

function lerp(start: number, end: number, t: number) {
  return start * (1 - t) + end * t;
}

export interface InterpolatedPlayerState {
  playerId: string;
  x: number;
  y: number;
  opacity: number;
  visible: boolean;
}

export interface InterpolatedFrameState {
  players: Record<string, InterpolatedPlayerState>;
  ballPos: { x: number; y: number };
  activeSceneIndex: number;
}

/**
 * シーン全体の総再生時間 (ms) を計算
 * シーン i から i+1 への移動時間は scenes[i].durationMs + scenes[i].pauseMs
 */
export function calculateTotalDuration(scenes: TacticalScene[]): number {
  if (scenes.length <= 1) return 0;
  return scenes.slice(0, -1).reduce((acc, scene) => {
    return acc + (scene.durationMs || 1500) + (scene.pauseMs || 0);
  }, 0);
}

/**
 * 指定時刻 (timeMs) における全選手・ボールの補間状態を計算
 */
export function getInterpolatedFrameState(
  scenes: TacticalScene[],
  timeMs: number,
): InterpolatedFrameState {
  if (scenes.length === 0) {
    return {
      players: {},
      ballPos: { x: 50, y: 50 },
      activeSceneIndex: 0,
    };
  }

  if (scenes.length === 1) {
    const firstScene = scenes[0];
    const players: Record<string, InterpolatedPlayerState> = {};
    Object.values(firstScene.players).forEach((p) => {
      players[p.playerId] = {
        playerId: p.playerId,
        x: p.x,
        y: p.y,
        opacity: 1,
        visible: p.area === 'pitch',
      };
    });
    return {
      players,
      ballPos: { ...firstScene.ballPos },
      activeSceneIndex: 0,
    };
  }

  let accumulatedTime = 0;
  let currentSceneIdx = 0;
  let nextSceneIdx = 1;
  let sceneElapsed = 0;
  let segmentScene = scenes[0];

  for (let i = 0; i < scenes.length - 1; i++) {
    const s = scenes[i];
    const duration = (s.durationMs || 1500) + (s.pauseMs || 0);
    if (timeMs <= accumulatedTime + duration || i === scenes.length - 2) {
      currentSceneIdx = i;
      nextSceneIdx = i + 1;
      sceneElapsed = Math.max(0, timeMs - accumulatedTime);
      segmentScene = s;
      break;
    }
    accumulatedTime += duration;
  }

  const currentScene = scenes[currentSceneIdx];
  const nextScene = scenes[nextSceneIdx];

  const durationMs = Math.max(100, segmentScene.durationMs || 1500);
  let t = sceneElapsed / durationMs;
  if (t > 1) t = 1;

  const ease = applyEasing(t, segmentScene.easing);

  const players: Record<string, InterpolatedPlayerState> = {};

  const allPlayerIds = new Set([
    ...Object.keys(currentScene.players),
    ...Object.keys(nextScene.players),
  ]);

  allPlayerIds.forEach((playerId) => {
    const startP = currentScene.players[playerId];
    const endP = nextScene.players[playerId];

    if (!startP && !endP) return;

    if (startP && !endP) {
      players[playerId] = {
        playerId,
        x: startP.x,
        y: startP.y,
        opacity: 1 - ease,
        visible: ease < 1 && startP.area === 'pitch',
      };
      return;
    }

    if (!startP && endP) {
      players[playerId] = {
        playerId,
        x: endP.x,
        y: endP.y,
        opacity: ease,
        visible: endP.area === 'pitch',
      };
      return;
    }

    if (startP && endP) {
      if (startP.area === 'pitch' && endP.area === 'pitch') {
        const trajectory = endP.trajectory || { type: 'straight' };
        const pos = calculateBezierPoint(
          { x: startP.x, y: startP.y },
          { x: endP.x, y: endP.y },
          ease,
          trajectory,
        );
        players[playerId] = {
          playerId,
          x: pos.x,
          y: pos.y,
          opacity: 1,
          visible: true,
        };
      } else if (startP.area === 'pitch' && endP.area === 'bench') {
        players[playerId] = {
          playerId,
          x: startP.x,
          y: startP.y,
          opacity: Math.max(0, 1 - ease),
          visible: ease < 1,
        };
      } else if (startP.area === 'bench' && endP.area === 'pitch') {
        players[playerId] = {
          playerId,
          x: endP.x,
          y: endP.y,
          opacity: Math.min(1, ease),
          visible: true,
        };
      } else {
        players[playerId] = {
          playerId,
          x: endP.x,
          y: endP.y,
          opacity: 0,
          visible: false,
        };
      }
    }
  });

  const ballStart = currentScene.ballPos;
  const ballEnd = nextScene.ballPos;
  const ballTrajectory = nextScene.ballTrajectory || { type: 'straight' };

  const ballPos = calculateBezierPoint(
    { x: ballStart.x, y: ballStart.y },
    { x: ballEnd.x, y: ballEnd.y },
    ease,
    ballTrajectory,
  );



  return {
    players,
    ballPos,
    activeSceneIndex: ease >= 1 ? nextSceneIdx : currentSceneIdx,
  };
}
