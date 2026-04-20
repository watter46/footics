/**
 * Footics Extension Messaging Protocol
 *
 * 設計意図:
 * Zodスキーマから型を推論することで、実行時のバリデーション機能と
 * 型定義を同期させる。
 */

export type {
  ExtensionMessage,
  MatchInfoResponse,
  MemoMode,
  SaveMemoResponse,
} from './schemas';
