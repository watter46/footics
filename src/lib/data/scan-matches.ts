import type { MatchSummary } from "@/types";

/**
 * サーバーサイドのスキャン機能。
 * インポートデータ移行に伴い、現在は常に空配列を返します。
 */
export function scanMatchFiles(): MatchSummary[] {
  return [];
}
