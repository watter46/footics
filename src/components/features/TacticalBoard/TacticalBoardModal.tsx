"use client";

import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import { 
  DndContext, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import { 
  restrictToParentElement,
  snapCenterToCursor
} from '@dnd-kit/modifiers';
import { Pitch } from './Pitch';
import { BenchArea } from './BenchArea';
import { PlayerMarker } from './PlayerMarker';
import { getTacticalSnapshot, putTacticalSnapshot } from '@/lib/db';
import { 
  DEFAULT_442_POSITIONS, 
  toViewPos,
  toActualPos
} from '@/lib/data/tactical-utils';
import { 
  FORMATION_POSITIONS, 
  FormationType, 
  getFormationActualPos,
  FormationMode
} from '@/lib/data/formations';
import { RotateCcw } from 'lucide-react';
import { useKeyboardShortcut } from '@/hooks/use-shortcut';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';


interface PlayerState {
  playerId: number;
  x: number;
  y: number;
  team: "home" | "away";
  area: 'pitch' | 'bench';
}

interface TacticalBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  metadata: any;
  matchData?: any;
}

export const TacticalBoardModal: React.FC<TacticalBoardModalProps> = ({
  isOpen,
  onClose,
  matchId,
  metadata,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [benchTeam, setBenchTeam] = useState<"home" | "away">("home");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formationMode, setFormationMode] = useState<FormationMode>('full');

  // 永続化データ
  const [savedSettings, setSavedSettings] = useState<Record<number, PlayerState>>({});
  const [ballPos, setBallPos] = useState({ x: 50, y: 50 });
  const [homeColor, setHomeColor] = useState("#3b82f6");
  const [awayColor, setAwayColor] = useState("#ef4444");

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    })
  );

  // データのロード
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
          setSavedSettings(mapping);
          setBallPos(tactic.assets.ball);
          setIsFlipped(snapshot.isInverted);
        } else {
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
                // Bench: Init Grid (3列グリッド)
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
          setSavedSettings(initialMapping);
          setBallPos({ x: 50, y: 50 });
          setIsFlipped(false);
        }
      });
    }
  }, [isOpen, matchId, metadata]);

  // 保存処理
  useEffect(() => {
    if (!isOpen || Object.keys(savedSettings).length === 0) return;
    const timer = setTimeout(() => {
      putTacticalSnapshot({
        matchId,
        isInverted: isFlipped,
        updatedAt: Date.now(),
        tactics: [{
          time: 0,
          players: Object.values(savedSettings),
          assets: { ball: ballPos }
        }]
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [savedSettings, ballPos, isFlipped, matchId, isOpen]);
  
  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const id = active.id as string;
    const activeData = active.data.current;
    const overData = over.data.current;

    // 1. バリデーション (グループ制限)
    // dnd-kit の data プロパティを使用して、移動許可を判定
    if (activeData && overData && overData.accepts) {
      if (!overData.accepts.includes(activeData.type)) {
        return; // 許可されていないエリアへのドロップ
      }
    }

    const dropArea = over.id as 'pitch' | 'bench';
    const overRect = over.rect; // Benchの場合は 600px inner div の rect
    const rect = active.rect.current.initial;
    if (!rect || !overRect) return;

    // Viewport座標から配置先コンテナ（Pitch or Bench Inner）内相対座標を算出
    // マーカーは CSS で translate(-50%, -50%) を持っているため、
    // ドラッグ中の中心座標 = 初期位置の中心 + 移動量(delta)
    const centerX = rect.left + event.delta.x + rect.width / 2;
    const centerY = rect.top + event.delta.y + rect.height / 2;

    // 2. 相対座標割合 (0-100) の算出
    let newX = ((centerX - overRect.left) / overRect.width) * 100;
    let newY = ((centerY - overRect.top) / overRect.height) * 100;

    // クランプ (不自然なはみ出しを防止)
    const radiusX = ((id === 'ball' ? 12 : 20) / overRect.width) * 100;
    const radiusY = ((id === 'ball' ? 12 : 20) / overRect.height) * 100;
    newX = Math.max(radiusX, Math.min(100 - radiusX, newX));
    newY = Math.max(radiusY, Math.min(100 - radiusY, newY));

    if (id === 'ball') {
      if (dropArea === 'pitch') {
        const actualBall = toActualPos({ x: newX, y: newY }, isFlipped);
        setBallPos(actualBall);
      }
      return;
    }

    const [_, idValue] = id.split('-');
    const playerId = idValue ? parseInt(idValue) : null;
    if (playerId !== null && savedSettings[playerId]) {
      const p = savedSettings[playerId];
      let finalX = newX;
      let finalY = newY;

      // 3. チーム自動切り替え (ベンチドロップ時)
      if (dropArea === 'bench') {
        if (p.team !== benchTeam) {
          setBenchTeam(p.team);
        }
      }

      // 4. ピッチ反転対応 (ピッチドロップ時)
      if (dropArea === 'pitch') {
        const actual = toActualPos({ x: newX, y: newY }, isFlipped);
        finalX = actual.x;
        finalY = actual.y;
      }

      setSavedSettings(prev => ({
        ...prev,
        [playerId]: { ...p, area: dropArea, x: finalX, y: finalY }
      }));
    }
  };

  /**
   * ベンチメンバーをきれいにグリッド整列させる
   */
  const handleAlignBench = () => {
    setSavedSettings(prev => {
      const next = { ...prev };
      const currentBenchPlayers = Object.values(next).filter(p => p.area === 'bench' && p.team === benchTeam);
      
      currentBenchPlayers.forEach((p, i) => {
        const x = 15 + (i % 3) * 35;
        const y = 10 + Math.floor(i / 3) * 15;
        next[p.playerId] = { ...p, x, y };
      });
      
      return next;
    });
  };
  
  /**
   * 全てを初期状態にリセットする
   */
  const handleReset = () => {
    const initialMapping: Record<number, PlayerState> = {};
    const setupTeam = (team: "home" | "away") => {
      const players = metadata?.teams[team]?.players || [];
      players.forEach((p: any, i: number) => {
        let x, y, area: 'pitch' | 'bench';
        if (i < 11) {
          area = 'pitch';
          // DEFAULT_442_POSITIONS を使用
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
    setSavedSettings(initialMapping);
    setBallPos({ x: 50, y: 50 });
  };

  /**
   * 特定チームのフォーメーションを変更する
   */
  const handleApplyFormation = (team: "home" | "away", formationType: FormationType) => {
    const positions = FORMATION_POSITIONS[formationType];
    if (!positions) return;

    setSavedSettings(prev => {
      const next = { ...prev };
      const teamPlayers = Object.values(next).filter(p => p.team === team);
      
      // 登録順（または現在のピッチ優先）に11人選出
      // ここでは仕様通り「登録順（ID順）」の先頭11人をピッチに配置
      const sorted = [...teamPlayers].sort((a, b) => a.playerId - b.playerId);
      
      sorted.forEach((p, i) => {
        if (i < 11) {
          const pos = positions[i];
          const actual = getFormationActualPos(pos, team, formationMode);
          next[p.playerId] = { ...p, area: 'pitch', x: actual.x, y: actual.y };
        } else {
          // 12人目以降はベンチへ
          const subIdx = i - 11;
          next[p.playerId] = { 
            ...p, 
            area: 'bench', 
            x: 15 + (subIdx % 3) * 35,
            y: 10 + Math.floor(subIdx / 3) * 15
          };
        }
      });

      return next;
    });
  };

  if (!isOpen) return null;

  const pitchPlayers = Object.values(savedSettings).filter(p => p.area === 'pitch');
  const benchPlayers = Object.values(savedSettings).filter(p => p.area === 'bench' && p.team === benchTeam);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md overflow-hidden">
      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
        modifiers={[snapCenterToCursor]}
      >
        <div className="relative w-[98vw] h-[98vh] flex flex-col bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden rounded-2xl">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-2 border-b border-slate-800 bg-slate-900/50 h-14 shrink-0">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-slate-100 mb-1 leading-none">Tactical Board</h2>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                  <span>{metadata.teams.home.name} vs {metadata.teams.away.name}</span>
                  <span className="text-slate-700">|</span>
                  <span>{Object.keys(savedSettings).length} Registered</span>
                </div>
              </div>
              
              <button 
                onClick={() => setIsFlipped(!isFlipped)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-none border ${isFlipped ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'}`}
              >
                <ArrowLeftRight className="w-3 h-3" />
                {isFlipped ? "AWAY VIEW" : "HOME VIEW"}
              </button>

              <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-none border bg-slate-800 border-slate-700 text-slate-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400"
              >
                <RotateCcw className="w-3 h-3" />
                RESET
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-3 py-1 bg-slate-800/30 rounded-full border border-slate-700/50 min-h-0">
                <div className="flex items-center gap-2">
                  <input type="color" value={homeColor} onChange={e => setHomeColor(e.target.value)} className="w-3 h-3 bg-transparent border-none rounded-full cursor-pointer" />
                  <span className="text-[9px] text-slate-300 font-bold uppercase">{metadata.teams.home.name}</span>
                </div>
                <div className="w-[1px] h-2 bg-slate-700"></div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-300 font-bold uppercase">{metadata.teams.away.name}</span>
                  <input type="color" value={awayColor} onChange={e => setAwayColor(e.target.value)} className="w-3 h-3 bg-transparent border-none rounded-full cursor-pointer" />
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-none">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Board Canvas: Seamless integration of Pitch & Bench */}
          <div className="flex-1 flex flex-row gap-4 p-4 bg-slate-950/20 overflow-hidden relative">
            
            {/* Pitch (Left 75%) with responsive sizing to fit window height/width */}
            <div className="flex-[3] flex items-center justify-center relative min-h-0 min-w-0">
              <div className="relative max-w-full max-h-full aspect-[105/68] w-full h-auto">
                <Pitch>
                  {pitchPlayers.map((p) => {
                    const playerMeta = metadata?.teams[p.team]?.players?.find((pm: any) => pm.playerId === p.playerId);
                    const viewPos = toViewPos({ x: p.x, y: p.y }, isFlipped);
                    return (
                      <PlayerMarker 
                        key={`${p.playerId}`}
                        id={`${matchId}-${p.playerId}`}
                        playerName={playerMeta?.name || `Player ${p.playerId}`}
                        initialX={viewPos.x}
                        initialY={viewPos.y}
                        color={p.team === "home" ? homeColor : awayColor}
                      />
                    );
                  })}
                  {(() => {
                    const viewBall = toViewPos(ballPos, isFlipped);
                    return (
                      <PlayerMarker key="ball" id="ball" playerName="BALL" initialX={viewBall.x} initialY={viewBall.y} color="#f97316" isBall />
                    );
                  })()}
                </Pitch>
              </div>
            </div>

            {/* Bench Area (Right 25%) */}
            <div className="flex-[1] min-w-0 h-full flex flex-col min-h-0">
              <BenchArea 
                teamName={metadata.teams[benchTeam].name}
                onTeamToggle={() => setBenchTeam(prev => prev === "home" ? "away" : "home")}
                onAlignGrid={handleAlignBench}
                formationMode={formationMode}
                onFormationModeChange={setFormationMode}
                onFormationChange={(type) => handleApplyFormation(benchTeam, type)}
              >
                {benchPlayers.map((p) => {
                  const playerMeta = metadata?.teams[p.team]?.players?.find((pm: any) => pm.playerId === p.playerId);
                  return (
                    <PlayerMarker 
                      key={p.playerId}
                      id={`${matchId}-${p.playerId}`}
                      playerName={playerMeta?.name || `Player ${p.playerId}`}
                      initialX={p.x}
                      initialY={p.y}
                      color={p.team === "home" ? homeColor : awayColor}
                    />
                  );
                })}
              </BenchArea>
            </div>
          </div>

          <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
            {activeId ? (
              activeId === 'ball' ? (
                <PlayerMarker id="ball" playerName="BALL" initialX={0} initialY={0} color="#f97316" isBall isOverlay />
              ) : (
                (() => {
                  const [_, pIdStr] = activeId.split('-');
                  const pId = parseInt(pIdStr);
                  const p = savedSettings[pId];
                  const playerMeta = metadata?.teams[p?.team || 'home']?.players?.find((pm: any) => pm.playerId === pId);
                  return (
                    <PlayerMarker id={activeId} playerName={playerMeta?.name || `Player ${pId}`} initialX={0} initialY={0} color={p?.team === "home" ? homeColor : awayColor} isOverlay />
                  );
                })()
              )
            ) : null}
          </DragOverlay>

        </div>
      </DndContext>
    </div>
  );
};
