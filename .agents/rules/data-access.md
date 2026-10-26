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
| **3. インメモリ UI / 高頻度操作層** | **Zustand v5 (`createStore` / `create`)** | モーダル開閉、選択中タブ、および **60fps で更新される戦術ボードのキャンバス状態・ドラッグ中座標** | 通常のマスタ・一覧データ（選手一覧・試合一覧等）を Zustand に手動コピーして保持すること |

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

## 3. 高頻度更新に対するハイブリッド同期モデル (Tactical Board)

戦術ボードの選手移動・描画操作など、**60fps で発生する高頻度の状態更新** に限り、以下のハイブリッド同期モデルを適用します。

1. **Zustand でのインメモリ管理**: ドラッグ中の座標やキャンバス上のオブジェクト編集は Zustand で管理し、UI を即時更新します。
2. **初期値確定注入による Flicker ゼロ保証**:
   - Level 3（Feature View）で IndexedDB からプロジェクトデータをロードし、初期状態を確定させてからキャンバスを描画します。
   - マウント後に非同期 `useEffect` で空キャンバスを後から上書きして初期チラつき（Flicker）を起こす実装を禁止します。
3. **デバウンス永続化**: 状態変更を購読（または自動保存フック `use-tactical-auto-save.ts` を使用）し、デバウンスをかけて `tactical-projects-db.ts` 経由で IndexedDB に書き戻します。

---

## 4. スキーマ・境界検証・マイグレーション規約 (Contract-First)

1. **Zod による入出力境界の堅牢化**:
   - IndexedDB のレコード読み書き（特に JSON エクスポート/インポート、拡張機能からのブリッジデータ、プロジェクトデータ `tactical-projects-db.ts`）では、必ず Zod スキーマ（`.parse()` / `.safeParse()`）による構造検証を行ってください。
2. **非破壊マイグレーション必須 (`schema.ts`)**:
   - Local-first アプリにおいて DB のリセットはユーザーデータの永久喪失を意味します。
   - `src/lib/db/schema.ts` を変更する場合は、必ず Dexie のバージョン番号をインクリメントし、`.upgrade()` ブロックによる非破壊マイグレーションを記述してください（`ai:check` Check B で機械強制）。
