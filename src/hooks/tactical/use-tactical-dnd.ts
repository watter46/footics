import {
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback } from 'react';
import { toActualPos } from '@/lib/tactical';
import { useTacticalStore } from '@/stores/tactical-store';

export function useTacticalDnd() {
  const savedSettings = useTacticalStore((s) => s.savedSettings);
  const isFlipped = useTacticalStore((s) => s.isFlipped);
  const benchTeam = useTacticalStore((s) => s.benchTeam);
  const setActiveId = useTacticalStore((s) => s.setActiveId);
  const setBallPos = useTacticalStore((s) => s.setBallPos);
  const setBenchTeam = useTacticalStore((s) => s.setBenchTeam);
  const updatePlayer = useTacticalStore((s) => s.updatePlayer);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveId(event.active.id as string);
    },
    [setActiveId],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || !active.rect.current.initial || !over.rect) return;

      const id = active.id as string;
      const dropArea = over.id as 'pitch' | 'bench';
      const overRect = over.rect;
      const activeRect = active.rect.current.initial;

      // 1. バリデーション (受け入れチェック)
      const activeData = active.data.current;
      const overData = over.data.current;
      if (activeData && overData?.accepts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!overData.accepts.includes(activeData.type as any)) return;
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
          const actualBall = toActualPos({ x: newX, y: newY }, isFlipped);
          setBallPos(actualBall);
        }
        return;
      }

      // Player drop
      const [, idValue] = id.split('-');
      const playerId = idValue ? parseInt(idValue, 10) : null;
      if (playerId !== null && savedSettings[playerId]) {
        const p = savedSettings[playerId];
        let finalX = newX;
        let finalY = newY;

        if (dropArea === 'bench') {
          // ベンチにドロップした際、その選手のチームにベンチ表示を切り替える
          if (p.team !== benchTeam) {
            setBenchTeam(p.team);
          }
        } else if (dropArea === 'pitch') {
          // ピッチにドロップした際は反転設定を考慮した実座標に変換
          const actual = toActualPos({ x: newX, y: newY }, isFlipped);
          finalX = actual.x;
          finalY = actual.y;
        }

        updatePlayer(playerId, { area: dropArea, x: finalX, y: finalY });
      }
    },
    [
      isFlipped,
      savedSettings,
      benchTeam,
      setBallPos,
      setBenchTeam,
      updatePlayer,
      setActiveId,
    ],
  );

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
  };
}
