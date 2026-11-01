/**
 * DB非依存の純粋関数。
 * 選手オブジェクトから一意な写真解決キー（playerId または id）を抽出する。
 */
export function getPlayerPhotoKey(p: {
  playerId?: string | number;
  id?: string | number;
}): string {
  return String(p.playerId ?? p.id ?? '');
}
