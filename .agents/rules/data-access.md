---
description: "Footicsプロジェクトのローカルデータアクセス・非同期状態管理規約（Dexie.js v4, TanStack Query v5, Zustand v5）"
globs:
  - "src/lib/db/**"
  - "src/lib/query-keys.ts"
  - "src/stores/**"
  - "src/components/**"
  - "src/features/**"
  - "src/hooks/**"
  - "extension/**"
---
# データアクセス・状態管理規約 (Data Access Standards)

本プロジェクト（Footics）は IndexedDB（Dexie.js v4）を永続データの唯一の正（Single Source of Truth）とし、**Dexie.js + TanStack Query + Zustand の3層ハイブリッドアーキテクチャ** を採用しています。

---

## 1. 3層の状態責務モデル (Three-Tier State Responsibility)

データの二重管理（Split-brain）とキャッシュ不整合を防ぐため、すべての状態は以下の3層のいずれかに厳格に振り分けてください。

| 層 | 技術 | 担当するデータの種類 | 禁止事項 |
| :--- | :--- | :--- | :--- |
| **1. 永続化層 (SoT)** | **Dexie.js v4 (IndexedDB)** | 試合データ、イベント、選手マスタ、戦術プロジェクト、スクリーンショット等の永続データ | UI コンポーネント（`.tsx`）から `db.<tableName>.*` を直接呼び出すこと |
| **2. 非同期サーバー/DBキャッシュ層** | **TanStack Query v5 (`useQuery` / `useMutation`)** | IndexedDB や Route Handler から取得する非同期データのキャッシュ、ローディング状態、更新後の再検証（Invalidation） | `queryKey` に配列リテラルを直書きすること、コンポーネント内で直接 `invalidateQueries` を乱発すること |
| **3. インメモリ UI / 高頻度操作層** | **Zustand v5 (`createStore` / `create`)** | モーダル開閉、選択中タブ、および戦術ボードの **3周波数分離状態（Cold: `DocumentState` / Hot: `EphemeralSessionState` / Stream: `PlaybackClock`）** | 通常のマスタ・一覧データを Zustand に手動コピーすること、および 60fps ドラッグ中に Cold State（`DocumentState`）を直接更新すること |

---

## 2. データアクセスと TanStack Query 規約 (R5)

### 判定基準
1. **UI コンポーネントからの生 `db.*` 呼び出し禁止**:
   - コンポーネント（`src/features/**/components/**`）から `@/lib/db` の `db` インスタンスを直接 import してクエリを発行することを禁止します（`.dependency-cruiser.cjs` で機械遮断）。
   - 必ず `src/lib/db/` 配下のクエリ・リポジトリ関数（`queries.ts`, `tactical-projects-db.ts` 等）を経由し、`features/<domain>/hooks/use-*.ts` のカスタムフックでラップしてください。
2. **`queryKey` は `queryKeys` ファクトリ関数を必須化**:
   - `queryKey: ['matchData', matchId]` のような配列リテラルの直書きを禁止します。
   - 必ず `src/lib/query-keys.ts` にキー生成関数を定義して参照してください（キー不一致による Invalidation 漏れを防止）。
3. **Invalidation の `useMutation` 内カプセル化**:
   - データ更新後の `queryClient.invalidateQueries` は、UI コンポーネントの `onClick` 内に直書きせず、必ずカスタムフック内の `useMutation({ onSuccess })` に閉じ込めてください。
4. **生データキャッシュとオンメモリ導出の分離 (Raw Cache & In-Memory Derivation)**:
   - TanStack Query のキャッシュキー（`queryKey`）には動的な UI フィルタ条件を含めず、`matchId` などの親リソース単位の生データ取得（例: `eventKeys.byMatch(matchId)`）に留めてください。
   - フィルタリング、集約、ソートなどの加工処理は、コンポーネントやカスタムフック内の `useMemo` によるオンメモリ処理とし、UI フィルタ変更時の無駄な Dexie/IndexedDB 再クエリを根絶してください。
5. **複数テーブル更新のトランザクション化**:
   - 関連する複数のテーブルを更新する処理は、必ず `db.transaction('rw', [...], async () => { ... })` 内にまとめ、部分失敗によるデータ破損を防止してください。

```tsx
// ❌ 禁止: コンポーネント内で db 直呼び出し・配列リテラル queryKey・手動 invalidate
import { db } from '@/lib/db';

export function PlayerEditor({ season, team }: Props) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['season-players', season, team],
    queryFn: () => db.players.where({ season, team }).toArray(),
  });

  const handleSave = async (player: PlayerRecord) => {
    await db.players.put(player);
    await queryClient.invalidateQueries({ queryKey: ['season-players'] });
  };
  return <div />;
}

// ✅ 推奨: クエリ関数 + queryKeys ファクトリ + useMutation カプセル化
// 1) src/lib/query-keys.ts
export const queryKeys = {
  players: {
    all: ['players'] as const,
    bySeasonTeam: (season: string, team: string) =>
      ['players', 'season', season, team] as const,
  },
};

// 2) src/features/teams/hooks/use-season-players.ts
export function useSeasonPlayers(season: string, team: string) {
  return useQuery({
    queryKey: queryKeys.players.bySeasonTeam(season, team),
    queryFn: () => fetchSeasonPlayers(season, team),
  });
}

export function useSavePlayer(season: string, team: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (player: PlayerRecord) => savePlayerRecord(player),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.players.bySeasonTeam(season, team),
      });
    },
  });
}
```

---

## 3. 3周波数状態分離に基づくハイブリッド同期モデル (Tactical Board)

戦術ボード（`src/features/tactical-unified/**`）では、60fps のドラッグ操作による Undo 履歴汚染・自動保存デバウンス暴発・全パネル再描画を防ぐため、`.agents/rules/tactical-domain-architecture.md` に基づく **3周波数状態分離モデル** を厳守します。

1. **Cold State (`DocumentState: TacticalProject`) — 確定操作のみ更新・永続化対象**:
   - `onDragEnd` やボタン押下などの確定操作時にのみ、`dispatch(command)` ➔ `applyTacticalCommand`（内部で `enforceSlideInvariants` 実行）を経由して更新します。
   - **Undo / Redo 履歴スタックおよび Dexie（`tactical-projects-db.ts`）へのデバウンス自動保存は、この `DocumentState` のみを監視対象**とします。
2. **Hot State (`EphemeralSessionState`) — 60fps ドラッグ・作図プレビュー専用（非永続）**:
   - `onDragMove`（60fps〜120Hz）のドラッグ差分、ラバーバンド選択枠、ポリゴン作図中の未確定頂点、ホバー対象、選択IDを保持します。
   - **Undo 履歴および Dexie 自動保存の対象外**とし、ドラッグ中の JSON シリアライズ負荷と不要な DB 書き込みを完全にゼロにします。
3. **Stream State (`PlaybackClock`) — アニメーション再生時刻（非永続）**:
   - GSAP Timeline が駆動する再生時刻 `currentTimeMs` のみを管理し、再生中に `DocumentState` を書き換えてはなりません。
4. **初期値確定注入による Flicker ゼロ保証**:
   - Level 3（Feature View）で IndexedDB からプロジェクトデータをロードし、`TacticalStoreProvider` に初期状態を確定注入してからキャンバスを描画します（マウント後の非同期 `useEffect` による空キャンバス上書きは禁止）。

---

## 4. スキーマ・境界検証・マイグレーション規約 (Contract-First)

1. **Zod による入出力境界の堅牢化**:
   - IndexedDB のレコード読み書き（特に JSON エクスポート/インポート、拡張機能からのブリッジデータ、プロジェクトデータ `tactical-projects-db.ts`）では、必ず Zod スキーマ（`.parse()` / `.safeParse()`）による構造検証を行ってください。
2. **非破壊マイグレーション必須 (`schema.ts`)**:
   - Local-first アプリにおいて DB のリセットはユーザーデータの永久喪失を意味します。
   - `src/lib/db/schema.ts` を変更する場合は、必ず Dexie のバージョン番号をインクリメントし、`.upgrade()` ブロックによる非破壊マイグレーションを記述してください（`ai:check` Check B で機械強制）。
