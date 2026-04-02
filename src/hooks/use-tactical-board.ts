import { useEffect, useCallback } from 'react';
import { 
  useSensor, 
  useSensors, 
  PointerSensor,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { useTacticalStore, PlayerState } from './use-tactical-store';
import { getTacticalSnapshot, putTacticalSnapshot } from '@/lib/db';
import { 
  DEFAULT_442_POSITIONS, 
  toActualPos 
} from '@/lib/data/tactical-utils';
import { 
  FORMATION_POSITIONS, 
  FormationType, 
  getFormationActualPos,
  FormationMode
} from '@/lib/data/formations';

export function useTacticalBoard(matchId: string, metadata: any, isOpen: boolean) {
  const store = useTacticalStore();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    })
  );

  // Load Data
  useEffect(() => {
    if (isOpen && matchId) {
      getTacticalSnapshot(matchId).then((snapshot) => {
        if (snapshot && snapshot.tactics?.[0]) {
          const tactic = snapshot.tactics[0];
          const mapping: Record<number, PlayerState> = {};
          tactic.players.forEach((p: any) => {
            mapping[p.playerId] = {
              ...p,
              area: p.area || (p.y > 100 ? 'bench' : 'pitch')
            };
          });
          store.setSavedSettings(mapping);
          store.setBallPos(tactic.assets.ball);
          store.setIsFlipped(snapshot.isInverted);
        } else {
          // Initial Setup if no snapshot exists
          const initialMapping: Record<number, PlayerState> = {};
          const setupTeam = (team: "home" | "away") => {
            const players = metadata?.teams[team]?.players || [];
            players.forEach((p: any, i: number) => {
              let x, y, area: 'pitch' | 'bench';
              if (i < 11) {
                area = 'pitch';
                x = DEFAULT_442_POSITIONS[team][i]?.x || (team === "home" ? 10 : 90);
                y = DEFAULT_442_POSITIONS[team][i]?.y || (10 + i * 8);
              } else {
                area = 'bench';
                const subIdx = i - 11;
                x = 15 + (subIdx % 3) * 35;
                y = 10 + Math.floor(subIdx / 3) * 15;
              }
              initialMapping[p.playerId] = { playerId: p.playerId, x, y, team, area };
            });
          };
          setupTeam("home");
          setupTeam("away");
          store.setSavedSettings(initialMapping);
          store.setBallPos({ x: 50, y: 50 });
          store.setIsFlipped(false);
        }
      });
    }
  }, [isOpen, matchId, metadata]);

  // Persist Data (Auto-save)
  useEffect(() => {
    if (!isOpen || Object.keys(store.savedSettings).length === 0) return;
    const timer = setTimeout(() => {
      putTacticalSnapshot({
        matchId,
        isInverted: store.isFlipped,
        updatedAt: Date.now(),
        tactics: [{
          time: 0,
          players: Object.values(store.savedSettings),
          assets: { ball: store.ballPos }
        }]
      });
      // Dispatch external action bridge event
      window.dispatchEvent(new CustomEvent('footics-action', { 
        detail: { type: 'tactical-save', matchId } 
      }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [store.savedSettings, store.ballPos, store.isFlipped, matchId, isOpen]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    store.setActiveId(event.active.id as string);
  }, [store]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    store.setActiveId(null);
    if (!over) return;

    const id = active.id as string;
    const activeData = active.data.current;
    const overData = over.data.current;

    // Validation (acceptance check)
    if (activeData && overData && overData.accepts) {
      if (!overData.accepts.includes(activeData.type)) {
        return; 
      }
    }

    const dropArea = over.id as 'pitch' | 'bench';
    const overRect = over.rect; 
    const rect = active.rect.current.initial;
    if (!rect || !overRect) return;

    const centerX = rect.left + event.delta.x + rect.width / 2;
    const centerY = rect.top + event.delta.y + rect.height / 2;

    let newX = ((centerX - overRect.left) / overRect.width) * 100;
    let newY = ((centerY - overRect.top) / overRect.height) * 100;

    const radiusX = ((id === 'ball' ? 12 : 20) / overRect.width) * 100;
    const radiusY = ((id === 'ball' ? 12 : 20) / overRect.height) * 100;
    newX = Math.max(radiusX, Math.min(100 - radiusX, newX));
    newY = Math.max(radiusY, Math.min(100 - radiusY, newY));

    if (id === 'ball') {
      if (dropArea === 'pitch') {
        const actualBall = toActualPos({ x: newX, y: newY }, store.isFlipped);
        store.setBallPos(actualBall);
      }
      return;
    }

    const [_, idValue] = id.split('-');
    const playerId = idValue ? parseInt(idValue) : null;
    if (playerId !== null && store.savedSettings[playerId]) {
      const p = store.savedSettings[playerId];
      let finalX = newX;
      let finalY = newY;

      if (dropArea === 'bench') {
        if (p.team !== store.benchTeam) {
          store.setBenchTeam(p.team);
        }
      }

      if (dropArea === 'pitch') {
        const actual = toActualPos({ x: newX, y: newY }, store.isFlipped);
        finalX = actual.x;
        finalY = actual.y;
      }

      store.updatePlayer(playerId, { area: dropArea, x: finalX, y: finalY });
    }
  }, [store]);

  const handleAlignBench = useCallback(() => {
    const next = { ...store.savedSettings };
    const currentBenchPlayers = Object.values(next).filter(p => p.area === 'bench' && p.team === store.benchTeam);
    
    currentBenchPlayers.forEach((p, i) => {
      const x = 15 + (i % 3) * 35;
      const y = 10 + Math.floor(i / 3) * 15;
      next[p.playerId] = { ...p, x, y };
    });
    
    store.setSavedSettings(next);
  }, [store]);

  const handleReset = useCallback(() => {
    const initialMapping: Record<number, PlayerState> = {};
    const setupTeam = (team: "home" | "away") => {
      const players = metadata?.teams[team]?.players || [];
      players.forEach((p: any, i: number) => {
        let x, y, area: 'pitch' | 'bench';
        if (i < 11) {
          area = 'pitch';
          x = DEFAULT_442_POSITIONS[team][i]?.x || (team === "home" ? 10 : 90);
          y = DEFAULT_442_POSITIONS[team][i]?.y || (10 + i * 8);
        } else {
          area = 'bench';
          const subIdx = i - 11;
          x = 15 + (subIdx % 3) * 35;
          y = 10 + Math.floor(subIdx / 3) * 15;
        }
        initialMapping[p.playerId] = { playerId: p.playerId, x, y, team, area };
      });
    };
    setupTeam("home");
    setupTeam("away");
    store.setSavedSettings(initialMapping);
    store.setBallPos({ x: 50, y: 50 });
  }, [metadata, store]);

  const handleApplyFormation = useCallback((team: "home" | "away", formationType: FormationType, formationMode: FormationMode) => {
    const positions = FORMATION_POSITIONS[formationType];
    if (!positions) return;

    const next = { ...store.savedSettings };
    const teamPlayers = Object.values(next).filter(p => p.team === team);
    const sorted = [...teamPlayers].sort((a, b) => a.playerId - b.playerId);
    
    sorted.forEach((p, i) => {
      if (i < 11) {
        const pos = positions[i];
        const actual = getFormationActualPos(pos, team, formationMode);
        next[p.playerId] = { ...p, area: 'pitch', x: actual.x, y: actual.y };
      } else {
        const subIdx = i - 11;
        next[p.playerId] = { 
          ...p, 
          area: 'bench', 
          x: 15 + (subIdx % 3) * 35,
          y: 10 + Math.floor(subIdx / 3) * 15
        };
      }
    });

    store.setSavedSettings(next);
  }, [store]);

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
    handleAlignBench,
    handleReset,
    handleApplyFormation,
  };
}
