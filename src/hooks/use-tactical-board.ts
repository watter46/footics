import {
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback, useEffect } from 'react';
import {
  type FormationMode,
  type FormationType,
  getFormationActualPos,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import {
  DEFAULT_442_POSITIONS,
  generateInitialMapping,
  getBenchPos,
  getShirtNo,
  toActualPos,
} from '@/lib/data/tactical-utils';
import { getTacticalSnapshot, putTacticalSnapshot } from '@/lib/db';
import type { Match } from '@/types';
import { type PlayerState, useTacticalStore } from './use-tactical-store';

export function useTacticalBoard(
  matchId: string,
  metadata: Match | null,
  isOpen: boolean,
) {
  const store = useTacticalStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
  );

  // Load Data
  useEffect(() => {
    if (isOpen && matchId) {
      getTacticalSnapshot(matchId).then((snapshot) => {
        const setupFallback = () => {
          const initialMapping = generateInitialMapping(metadata);
          if (Object.keys(initialMapping).length === 0) {
            console.log('[footics] Metadata players not ready, skipping setup');
            return;
          }
          store.setSavedSettings(initialMapping);
          store.setBallPos({ x: 50, y: 50 });
          store.setIsFlipped(false);
        };

        if (snapshot?.tactics?.[0]) {
          const tactic = snapshot.tactics[0];

          // 自己修復: スナップショットが空だが、メタデータには選手がいる場合、メタデータを優先
          const hasMetadataPlayers =
            (metadata?.teams?.home?.players?.length || 0) > 0;
          if (tactic.players.length === 0 && hasMetadataPlayers) {
            console.warn(
              '[footics] Empty snapshot found. Repairing from metadata...',
            );
            setupFallback();
            return;
          }

          const mapping: Record<number, PlayerState> = {};
          tactic.players.forEach((p) => {
            const pMeta = metadata?.teams[p.team]?.players?.find(
              (pm: any) => pm.playerId === p.playerId,
            );
            mapping[p.playerId] = {
              ...p,
              shirtNo: getShirtNo(p) || getShirtNo(pMeta),
              area: p.area || (p.y > 100 ? 'bench' : 'pitch'),
            };
          });
          store.setSavedSettings(mapping);
          store.setBallPos(tactic.assets.ball);
          store.setIsFlipped(snapshot.isInverted);
        } else {
          // Initial Setup if no snapshot exists
          setupFallback();
        }
      });
    }
  }, [
    isOpen,
    matchId,
    metadata,
    store.setSavedSettings,
    store.setBallPos,
    store.setIsFlipped,
  ]);

  // Persist Data (Auto-save)
  useEffect(() => {
    if (!isOpen || Object.keys(store.savedSettings).length === 0) return;
    const timer = setTimeout(() => {
      putTacticalSnapshot({
        matchId,
        isInverted: store.isFlipped,
        updatedAt: Date.now(),
        tactics: [
          {
            time: 0,
            players: Object.values(store.savedSettings),
            assets: { ball: store.ballPos },
          },
        ],
      });
      // Dispatch external action bridge event
      window.dispatchEvent(
        new CustomEvent('footics-action', {
          detail: { type: 'tactical-save', matchId },
        }),
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [store.savedSettings, store.ballPos, store.isFlipped, matchId, isOpen]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      store.setActiveId(event.active.id as string);
    },
    [store],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      store.setActiveId(null);

      if (!over || !active.rect.current.initial || !over.rect) return;

      const id = active.id as string;
      const dropArea = over.id as 'pitch' | 'bench';
      const overRect = over.rect;
      const activeRect = active.rect.current.initial;

      // 1. バリデーション (受け入れチェック)
      const activeData = active.data.current;
      const overData = over.data.current;
      if (activeData && overData?.accepts) {
        if (!overData.accepts.includes(activeData.type)) return;
      }

      // 2. 座標計算 (ドロップ先の中心座標を % 単位に変換)
      const centerX = activeRect.left + event.delta.x + activeRect.width / 2;
      const centerY = activeRect.top + event.delta.y + activeRect.height / 2;

      let newX = ((centerX - overRect.left) / overRect.width) * 100;
      let newY = ((centerY - overRect.top) / overRect.height) * 100;

      // 3. クランプ処理 (はみ出し防止)
      const radiusX = ((id === 'ball' ? 12 : 20) / overRect.width) * 100;
      const radiusY = ((id === 'ball' ? 12 : 20) / overRect.height) * 100;
      newX = Math.max(radiusX, Math.min(100 - radiusX, newX));
      newY = Math.max(radiusY, Math.min(100 - radiusY, newY));

      // 4. 実際のデータ更新
      if (id === 'ball') {
        if (dropArea === 'pitch') {
          const actualBall = toActualPos({ x: newX, y: newY }, store.isFlipped);
          store.setBallPos(actualBall);
        }
        return;
      }

      // Player drop
      const [_, idValue] = id.split('-');
      const playerId = idValue ? parseInt(idValue, 10) : null;
      if (playerId !== null && store.savedSettings[playerId]) {
        const p = store.savedSettings[playerId];
        let finalX = newX;
        let finalY = newY;

        if (dropArea === 'bench') {
          // ベンチにドロップした際、その選手のチームにベンチ表示を切り替える
          if (p.team !== store.benchTeam) {
            store.setBenchTeam(p.team);
          }
        } else if (dropArea === 'pitch') {
          // ピッチにドロップした際は反転設定を考慮した実座標に変換
          const actual = toActualPos({ x: newX, y: newY }, store.isFlipped);
          finalX = actual.x;
          finalY = actual.y;
        }

        store.updatePlayer(playerId, { area: dropArea, x: finalX, y: finalY });
      }
    },
    [store],
  );

  const handleAlignBench = useCallback(() => {
    const next = { ...store.savedSettings };
    const currentBenchPlayers = Object.values(next).filter(
      (p) => p.area === 'bench' && p.team === store.benchTeam,
    );

    currentBenchPlayers.forEach((p, i) => {
      const pos = getBenchPos(i);
      next[p.playerId] = { ...p, x: pos.x, y: pos.y };
    });

    store.setSavedSettings(next);
  }, [store.savedSettings, store.benchTeam, store.setSavedSettings]);

  const handleReset = useCallback(() => {
    const initialMapping = generateInitialMapping(metadata);
    store.setSavedSettings(initialMapping);
    store.setBallPos({ x: 50, y: 50 });
  }, [metadata, store.setSavedSettings, store.setBallPos]);

  const handleApplyFormation = useCallback(
    (
      team: 'home' | 'away',
      formationType: FormationType,
      formationMode: FormationMode,
    ) => {
      const positions = FORMATION_POSITIONS[formationType];
      if (!positions) return;

      const next = { ...store.savedSettings };
      const teamPlayers = Object.values(next).filter((p) => p.team === team);

      // 1. ピッチにいる選手を優先
      const currentPitchPlayers = teamPlayers
        .filter((p) => p.area === 'pitch')
        .sort((a, b) => a.playerId - b.playerId);
      const currentBenchPlayers = teamPlayers
        .filter((p) => p.area === 'bench')
        .sort((a, b) => a.playerId - b.playerId);

      const pitchSelection = currentPitchPlayers.slice(0, 11);
      const needed = 11 - pitchSelection.length;

      if (needed > 0) {
        pitchSelection.push(...currentBenchPlayers.slice(0, needed));
      }

      const selectedIds = new Set(pitchSelection.map((p) => p.playerId));
      const remainingPlayers = teamPlayers
        .filter((p) => !selectedIds.has(p.playerId))
        .sort((a, b) => a.playerId - b.playerId);

      // ピッチ選手への配置適用
      pitchSelection.forEach((p, i) => {
        const pos = positions[i];
        const actual = getFormationActualPos(pos, team, formationMode);
        next[p.playerId] = { ...p, area: 'pitch', x: actual.x, y: actual.y };
      });

      // ベンチ選手への配置適用（整列）
      remainingPlayers.forEach((p, i) => {
        const pos = getBenchPos(i);
        next[p.playerId] = {
          ...p,
          area: 'bench',
          x: pos.x,
          y: pos.y,
        };
      });

      store.setSavedSettings(next);
    },
    [store.savedSettings, store.setSavedSettings],
  );

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
    handleAlignBench,
    handleReset,
    handleApplyFormation,
  };
}
