"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ArrowLeftRight, Clock } from 'lucide-react';
import { Pitch } from './Pitch';
import { PlayerMarker } from './PlayerMarker';
// import { getTacticalSettingsByMatch, putTacticalSetting } from '@/lib/db';
import { TacticalSetting } from '@/lib/schema';
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
  const [savedSettings, setSavedSettings] = useState<Record<number, TacticalSetting>>({});
  const [homeColor, setHomeColor] = useState("#3b82f6");
  const [awayColor, setAwayColor] = useState("#ef4444");

  const { minute, formattedTime } = useMemo(() => {
    const raw = timeStr.trim();
    if (!raw) return { minute: 0, formattedTime: "00:00" };
    const m = parseInt(raw, 10) || 0;
    return { minute: m, formattedTime: `${String(m).padStart(2, "0")}:00` };
  }, [timeStr]);

  // メモリ内管理のため、DBからのロードは行わない
  /*
  useEffect(() => {
    if (isOpen) {
      getTacticalSettingsByMatch(matchId).then((settings) => {
        const mapping: Record<number, TacticalSetting> = {};
        settings.forEach(s => mapping[s.playerId] = s);
        setSavedSettings(mapping);
      });
    }
  }, [isOpen, matchId]);
  */

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

  const handlePositionChange = useCallback(async (id: string, visualX: number, visualY: number, team: "home" | "away") => {
    const [_, playerIdStr] = id.split('-');
    const playerId = parseInt(playerIdStr);
    
    // 表示座標 (visualX/Y: 0-100) をホーム視点のデータ座標に変換
    const actualPos = toActualPos({ x: visualX, y: visualY }, isFlipped);

    const newSetting: TacticalSetting = {
      id, matchId, playerId, x: actualPos.x, y: actualPos.y, team, updatedAt: Date.now(),
    };
    // putTacticalSetting(newSetting); // メモリ内管理のため非表示
    setSavedSettings(prev => ({ ...prev, [playerId]: newSetting }));
  }, [matchId, isFlipped]);

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
                {/* Home Players */}
                {activePlayers.home.map((p: { playerId: number, name: string }, i: number) => {
                  const saved = savedSettings[p.playerId];
                  const actualX = saved ? saved.x : DEFAULT_442_POSITIONS.home[i]?.x || (10 + i * 4);
                  const actualY = saved ? saved.y : DEFAULT_442_POSITIONS.home[i]?.y || (10 + i * 8);
                  
                  // 表示座標への変換 (180度回転モデル)
                  const viewPos = toViewPos({ x: actualX, y: actualY }, isFlipped);

                  return (
                    <PlayerMarker 
                      key={`${p.playerId}-${minute}`}
                      id={`${matchId}-${p.playerId}`}
                      playerName={p.name}
                      initialX={viewPos.x}
                      initialY={viewPos.y}
                      color={homeColor}
                      onPositionChange={(id, x, y) => handlePositionChange(id, x, y, "home")}
                    />
                  );
                })}

                {/* Away Players */}
                {activePlayers.away.map((p: { playerId: number, name: string }, i: number) => {
                  const saved = savedSettings[p.playerId];
                  const actualX = saved ? saved.x : DEFAULT_442_POSITIONS.away[i]?.x || (90 - i * 4);
                  const actualY = saved ? saved.y : DEFAULT_442_POSITIONS.away[i]?.y || (10 + i * 8);

                  // 表示座標への変換 (180度回転モデル)
                  const viewPos = toViewPos({ x: actualX, y: actualY }, isFlipped);

                  return (
                    <PlayerMarker 
                      key={`${p.playerId}-${minute}`}
                      id={`${matchId}-${p.playerId}`}
                      playerName={p.name}
                      initialX={viewPos.x}
                      initialY={viewPos.y}
                      color={awayColor}
                      onPositionChange={(id, x, y) => handlePositionChange(id, x, y, "away")}
                    />
                  );
                })}
              </Pitch>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
