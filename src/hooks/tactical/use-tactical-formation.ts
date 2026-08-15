import { useCallback } from 'react';
import {
  type FormationMode,
  type FormationType,
  getFormationActualPos,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { generateInitialMapping, getBenchPos } from '@/lib/tactical';
import { useTacticalStore } from '@/stores/tactical-store';
import type { Match } from '@/types';

export function useTacticalFormation(metadata: Match | null) {
  const savedSettings = useTacticalStore((s) => s.savedSettings);
  const benchTeam = useTacticalStore((s) => s.benchTeam);
  const setSavedSettings = useTacticalStore((s) => s.setSavedSettings);
  const setBallPos = useTacticalStore((s) => s.setBallPos);

  const handleAlignBench = useCallback(() => {
    const next = { ...savedSettings };
    const currentBenchPlayers = Object.values(next).filter(
      (p) => p.area === 'bench' && p.team === benchTeam,
    );

    currentBenchPlayers.forEach((p, i) => {
      const pos = getBenchPos(i);
      next[p.playerId] = { ...p, x: pos.x, y: pos.y };
    });

    setSavedSettings(next);
  }, [savedSettings, benchTeam, setSavedSettings]);

  const handleReset = useCallback(() => {
    const initialMapping = generateInitialMapping(metadata);
    setSavedSettings(initialMapping);
    setBallPos({ x: 50, y: 50 });
  }, [metadata, setSavedSettings, setBallPos]);

  const handleApplyFormation = useCallback(
    (
      team: 'home' | 'away',
      formationType: FormationType,
      formationMode: FormationMode,
    ) => {
      const positions = FORMATION_POSITIONS[formationType];
      if (!positions) return;

      const next = { ...savedSettings };
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

      setSavedSettings(next);
    },
    [savedSettings, setSavedSettings],
  );

  return {
    handleAlignBench,
    handleReset,
    handleApplyFormation,
  };
}
