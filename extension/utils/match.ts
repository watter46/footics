/**
 * Footics 拡張機能用 Match ID 抽出ユーティリティ
 */

/**
 * 現在のページから Match ID を抽出する
 * 1. <html> または <body> の data-match-id 属性
 * 2. URL パス (/match/[id])
 * 3. URL パス内の match_ で始まるセグメント
 */
export function detectMatchId(): string | undefined {
  const pathParts = window.location.pathname.split('/');

  // 1. Dataset から取得
  let matchId =
    document.documentElement.dataset.matchId || document.body.dataset.matchId;

  if (matchId) return matchId;

  // 2. URL パス (/match/[id]) から取得
  const matchIdx = pathParts.indexOf('match');
  if (matchIdx !== -1 && pathParts[matchIdx + 1]) {
    return pathParts[matchIdx + 1];
  }

  // 3. match_ で始まるセグメントを探す
  matchId = pathParts.find((p) => p.startsWith('match_'));

  return matchId;
}
