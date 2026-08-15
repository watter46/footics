import { useEffect } from 'react';
import { getTacticalSnapshot, putTacticalSnapshot } from '@/lib/db';
import { generateInitialMapping, getShirtNo } from '@/lib/tactical';
import { type PlayerState, useTacticalStore } from '@/stores/tactical-store';
import type { Match } from '@/types';

export function useTacticalPersistence(
  matchId: string,
  metadata: Match | null,
  isOpen: boolean,
) {
  const savedSettings = useTacticalStore((s) => s.savedSettings);
  const ballPos = useTacticalStore((s) => s.ballPos);
  const isFlipped = useTacticalStore((s) => s.isFlipped);
  const setSavedSettings = useTacticalStore((s) => s.setSavedSettings);
  const setBallPos = useTacticalStore((s) => s.setBallPos);
  const setIsFlipped = useTacticalStore((s) => s.setIsFlipped);

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
          setSavedSettings(initialMapping);
          setBallPos({ x: 50, y: 50 });
          setIsFlipped(false);
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pMeta = metadata?.teams[p.team]?.players?.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (pm: any) => pm.playerId === p.playerId,
            );
            mapping[p.playerId] = {
              ...p,
              shirtNo: getShirtNo(p) || getShirtNo(pMeta),
              area: p.area || (p.y > 100 ? 'bench' : 'pitch'),
            };
          });
          setSavedSettings(mapping);
          setBallPos(tactic.assets.ball);
          setIsFlipped(snapshot.isInverted);
        } else {
          // Initial Setup if no snapshot exists
          setupFallback();
        }
      });
    }
  }, [isOpen, matchId, metadata, setSavedSettings, setBallPos, setIsFlipped]);

  // Persist Data (Auto-save)
  useEffect(() => {
    if (!isOpen || Object.keys(savedSettings).length === 0) return;
    const timer = setTimeout(() => {
      putTacticalSnapshot({
        matchId,
        isInverted: isFlipped,
        updatedAt: Date.now(),
        tactics: [
          {
            time: 0,
            players: Object.values(savedSettings),
            assets: { ball: ballPos },
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
  }, [savedSettings, ballPos, isFlipped, matchId, isOpen]);
}
