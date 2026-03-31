"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ArrowLeftRight, Clock } from 'lucide-react';
import { Pitch } from './Pitch';
import { PlayerMarker } from './PlayerMarker';
import { getTacticalSnapshot, putTacticalSnapshot } from '@/lib/db';
import { TacticalSnapshot } from '@/lib/schema';
import { 
  getActivePlayersNational, 
  getActivePlayersClub, 
  DEFAULT_442_POSITIONS, 
  toViewPos,
  toActualPos
} from '@/lib/data/tactical-utils';
import { Card } from '@/components/ui/card';

interface TacticalBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  metadata: any;
  matchData?: any; // National match data if available
}

export const TacticalBoardModal: React.FC<TacticalBoardModalProps> = ({
  isOpen,
  onClose,
  matchId,
  metadata,
  matchData,
}) => {
  const [timeStr, setTimeStr] = useState("0");
  const [isFlipped, setIsFlipped] = useState(false);
  const minute = useMemo(() => {
    const raw = timeStr.trim();
    return parseInt(raw, 10) || 0;
  }, [timeStr]);

  const formattedTime = useMemo(() => {
    return `${String(minute).padStart(2, "0")}:00`;
  }, [minute]);

  // 永続化データ (構造化スナップショット方式)
  const [savedSettings, setSavedSettings] = useState<Record<number, { playerId: number, x: number, y: number, team: "home" | "away" }>>({});
  const [ballPos, setBallPos] = useState({ x: 50, y: 50 });
  const [homeColor, setHomeColor] = useState("#3b82f6");
  const [awayColor, setAwayColor] = useState("#ef4444");


  const activePlayers = useMemo<{ 
    home: { playerId: number, name: string, team: "home" | "away" }[], 
    away: { playerId: number, name: string, team: "home" | "away" }[] 
  }>(() => {
    if (!metadata) return { home: [], away: [] };
    let homeIds: number[] = [];
    let awayIds: number[] = [];

    if (metadata.matchType === 'national' && matchData) {
      const { homeActiveIds, awayActiveIds } = getActivePlayersNational(matchData, minute);
      homeIds = homeActiveIds;
      awayIds = awayActiveIds;
    } else if (metadata.matchCentreData) {
      const { homeActiveIds, awayActiveIds } = getActivePlayersClub(metadata.matchCentreData, minute);
      homeIds = homeActiveIds;
      awayIds = awayActiveIds;
    } else {
      homeIds = metadata.teams?.home?.players?.filter((p: any) => p.isFirstEleven).map((p: any) => p.playerId) || [];
      awayIds = metadata.teams?.away?.players?.filter((p: any) => p.isFirstEleven).map((p: any) => p.playerId) || [];
    }

    const getNames = (ids: number[], team: "home" | "away") => {
      const players = metadata.teams[team]?.players || [];
      return ids.map(id => {
        const p = players.find((p: any) => p.playerId === id);
        return { playerId: id, name: p?.name || `Player ${id}`, team };
      });
    };

    return {
      home: getNames(homeIds, "home"),
      away: getNames(awayIds, "away")
    };
  }, [metadata, matchData, minute]);

  // 永続化データのロード (構造化スナップショット方式)
  useEffect(() => {
    if (isOpen && matchId) {
      getTacticalSnapshot(matchId).then((snapshot) => {
        if (snapshot && snapshot.tactics?.[0]) {
          const tactic = snapshot.tactics[0];
          const mapping: Record<number, { playerId: number, x: number, y: number, team: "home" | "away" }> = {};
          tactic.players.forEach(p => {
            mapping[p.playerId] = p;
          });
          setSavedSettings(mapping);
          setBallPos(tactic.assets.ball);
          setIsFlipped(snapshot.isInverted);
        } else {
          // [最適化] スナップショットがない場合、全選手（スタメン＋控え）とボールの初期位置を生成
          const initialMapping: Record<number, { playerId: number, x: number, y: number, team: "home" | "away" }> = {};
          
          const setupTeam = (team: "home" | "away") => {
            const players = metadata?.teams[team]?.players || [];
            players.forEach((p: any, i: number) => {
              let x, y;
              if (i < 11) {
                // スタメンは 4-4-2
                x = DEFAULT_442_POSITIONS[team][i]?.x || (team === "home" ? 10 : 90);
                y = DEFAULT_442_POSITIONS[team][i]?.y || (10 + i * 8);
              } else {
                // 控えはサイドライン(外側)に整列
                x = team === "home" ? 5 : 95;
                y = 105 + (i - 11) * 6; // ピッチ下側に並べる
              }
              initialMapping[p.playerId] = { playerId: p.playerId, x, y, team };
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

  // 一括保存のデバウンス処理
  useEffect(() => {
    if (!isOpen || Object.keys(savedSettings).length === 0) return;

    const timer = setTimeout(() => {
      const players = Object.values(savedSettings);
      putTacticalSnapshot({
        matchId,
        isInverted: isFlipped,
        updatedAt: Date.now(),
        tactics: [{
          time: 0,
          players,
          assets: { ball: ballPos }
        }]
      });
      console.log("[footics] Tactical structured snapshot saved");
    }, 1000);

    return () => clearTimeout(timer);
  }, [savedSettings, ballPos, isFlipped, matchId, isOpen]);



  const handlePositionChange = useCallback((id: string, visualX: number, visualY: number, team: "home" | "away") => {
    const [_, playerIdStr] = id.split('-');
    const playerId = parseInt(playerIdStr);
    
    // 表示座標 (visualX/Y: 0-100) をホーム視点のデータ座標に変換
    const actualPos = toActualPos({ x: visualX, y: visualY }, isFlipped);

    // Stateのみ更新。保存は useEffect のデバウンスに任せる
    setSavedSettings(prev => ({ 
      ...prev, 
      [playerId]: { playerId, x: actualPos.x, y: actualPos.y, team } 
    }));
  }, [isFlipped]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-950/90 backdrop-blur-md overflow-hidden transition-opacity duration-300 animate-in fade-in">
      <div
        className="relative w-[98vw] h-[98vh] flex flex-col bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-slate-100">Tactical Board</h2>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span>{metadata.teams.home.name} vs {metadata.teams.away.name}</span>
                <span className="text-slate-700">|</span>
                <span className="text-amber-500/80">CTRL+B TO TOGGLE</span>
                <span className="text-slate-700">|</span>
                <span>{activePlayers.home.length + activePlayers.away.length} PLAYERS</span>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
              <div className="flex flex-col items-center px-3 border-r border-slate-700 min-w-[60px]">
                <div className="flex items-center gap-2 leading-none">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <input 
                    type="text" 
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                    className="w-10 bg-transparent text-slate-100 font-mono font-bold focus:outline-none text-center text-sm"
                    placeholder="Min"
                  />
                </div>
                <div className="text-[9px] text-amber-500 font-bold tracking-wider mt-0.5 leading-none">
                  {formattedTime}
                </div>
              </div>
              
              <button 
                onClick={() => setIsFlipped(!isFlipped)}
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold transition-all ${isFlipped ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                <ArrowLeftRight className="w-3 h-3" />
                {isFlipped ? "AWAY-HOME" : "HOME-AWAY"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Team Colors */}
            <div className="flex items-center gap-3 px-3 py-1 bg-slate-800/30 rounded-full border border-slate-700/50">
               <div className="flex items-center gap-2">
                  <input type="color" value={homeColor} onChange={e => setHomeColor(e.target.value)} className="w-3 h-3 bg-transparent border-none rounded-full cursor-pointer" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{metadata.teams.home.name}</span>
               </div>
               <div className="w-[1px] h-3 bg-slate-700"></div>
               <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{metadata.teams.away.name}</span>
                  <input type="color" value={awayColor} onChange={e => setAwayColor(e.target.value)} className="w-3 h-3 bg-transparent border-none rounded-full cursor-pointer" />
               </div>
            </div>

             <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-colors"
             >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pitch Area - Maximized */}
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden min-h-0 relative bg-slate-950/40 p-2">
          <div 
            className="relative w-full h-full flex items-center justify-center p-2"
            style={{
              maxHeight: 'calc(100% - 20px)',
              maxWidth: 'calc(100% - 20px)'
            }}
          >
            <div 
              className="relative"
              style={{
                width: 'min(100%, calc((100vh - 100px) * 1.54))',
                aspectRatio: '105/68'
              }}
            >
              <Pitch>
                {/* All Players from Saved Settings */}
                {Object.values(savedSettings).map((p) => {
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
                      onPositionChange={(id, x, y) => handlePositionChange(id, x, y, p.team)}
                    />
                  );
                })}

                {/* Ball */}
                {(() => {
                  const viewBall = toViewPos(ballPos, isFlipped);
                  return (
                    <PlayerMarker 
                      key="ball"
                      id="ball"
                      playerName="BALL"
                      initialX={viewBall.x}
                      initialY={viewBall.y}
                      color="#f97316" // Orange
                      onPositionChange={(_, x, y) => {
                        const actualBall = toActualPos({ x, y }, isFlipped);
                        setBallPos(actualBall);
                      }}
                    />
                  );
                })()}
              </Pitch>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
