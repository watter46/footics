import { TacticalSetting } from "@/lib/schema";

/**
 * 選手名を短縮形式に変換する
 * 例: "Enzo Fernandez" -> "E. Fernandez"
 */
export function shortenName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  const last = parts[parts.length - 1];
  const initial = parts[0].charAt(0);
  return `${initial}. ${last}`;
}

/**
 * 4-4-2 の標準的な XY 座標マッピング
 * 常に「ホーム視点（Normal）」を基準とした 0-100 の絶対座標系
 */
export const DEFAULT_442_POSITIONS: Record<"home" | "away", { x: number; y: number }[]> = {
  home: [
    { x: 5, y: 50 },   // GK
    { x: 20, y: 15 },  // LB
    { x: 20, y: 38 },  // CB1
    { x: 20, y: 62 },  // CB2
    { x: 20, y: 85 },  // RB
    { x: 38, y: 15 },  // LM
    { x: 38, y: 38 },  // CM1
    { x: 38, y: 62 },  // CM2
    { x: 38, y: 85 },  // RM
    { x: 48, y: 35 },  // FW1
    { x: 48, y: 65 },  // FW2
  ],
  away: [
    { x: 95, y: 50 },  // GK
    { x: 80, y: 85 },  // RB
    { x: 80, y: 62 },  // CB1
    { x: 80, y: 38 },  // CB2
    { x: 80, y: 15 },  // LB
    { x: 62, y: 85 },  // RM
    { x: 62, y: 62 },  // CM1
    { x: 62, y: 38 },  // CM2
    { x: 62, y: 15 },  // LM
    { x: 52, y: 65 },  // FW1
    { x: 52, y: 35 },  // FW2
  ],
};

/**
 * 特定の分における出場選手を特定する (National Data)
 */
export function getActivePlayersNational(matchData: any, minute: number) {
  const { homeStarters, awayStarters, homeBench, awayBench } = matchData.lineups;
  
  const getTeamActive = (starters: any[], bench: any[]) => {
    const activeIds = new Set(starters.map((p: any) => p.playerId));
    
    // 交代履歴をスキャン (timeline)
    matchData.timeline.forEach((period: any) => {
      const eventMinute = period[0];
      if (eventMinute > minute) return;
      
      const homeEvents = period[1] || [];
      const awayEvents = period[2] || [];
      const events = [...homeEvents, ...awayEvents];
      
      events.forEach((ev: any) => {
        const eventType = ev[2];
        const player1Id = ev[6];
        const player2Id = ev[7];

        if (eventType === "subst") {
          // National形式では ev[6] が退く選手、ev[7] が入る選手
          if (activeIds.has(player1Id)) {
            activeIds.delete(player1Id);
            activeIds.add(player2Id);
          }
        }
      });
    });
    
    return Array.from(activeIds);
  };

  const homeActiveIds = getTeamActive(homeStarters, homeBench);
  const awayActiveIds = getTeamActive(awayStarters, awayBench);
  
  return { homeActiveIds, awayActiveIds };
}

/**
 * 特定の分における出場選手を特定する (Club Data)
 */
export function getActivePlayersClub(matchCentreData: any, minute: number) {
  const getTeamActive = (team: any) => {
    const starters = team.players.filter((p: any) => p.isFirstEleven).map((p: any) => p.playerId);
    const activeIds = new Set<number>(starters);
    
    // 交代履歴をスキャン (incidentEvents)
    team.incidentEvents.forEach((ev: any) => {
      if (ev.minute > minute) return;
      
      if (ev.type.displayName === "SubstitutionOff") {
        activeIds.delete(ev.playerId);
      } else if (ev.type.displayName === "SubstitutionOn") {
        activeIds.add(ev.playerId);
      }
    });
    
    return Array.from(activeIds);
  };

  const homeActiveIds = getTeamActive(matchCentreData.home);
  const awayActiveIds = getTeamActive(matchCentreData.away);
  
  return { homeActiveIds, awayActiveIds };
}

/**
 * ホーム視点（Normal）の座標を、現在の表示モードに合わせて変換する
 * isFlipped が真なら 180度回転 (100 - x, 100 - y) を適用
 */
export function toViewPos(actual: { x: number; y: number }, isFlipped: boolean): { x: number; y: number } {
  if (!isFlipped) return actual;
  return { 
    x: 100 - actual.x, 
    y: 100 - actual.y 
  };
}

/**
 * 表示上の座標（マウス位置等）を、保存用のホーム視点（Normal）データに変換する
 * 計算式は toViewPos と同じ（180度回転は可逆的なため）
 */
export function toActualPos(view: { x: number; y: number }, isFlipped: boolean): { x: number; y: number } {
  return toViewPos(view, isFlipped);
}
