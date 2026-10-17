---
description: "Footicsプロジェクトのローカルデータアクセス規約（Dexie.js v4, Zustand, Local-first 2026）"
globs:
  - "src/lib/db/**"
  - "src/stores/**"
  - "src/components/**"
  - "src/features/**"
---
# データアクセス規約 (Data Access Standards)

本プロジェクト（Footics）は IndexedDB を単一の Source of Truth (SoT) とし、Dexie.js v4 と Zustand を組み合わせた **2026年最新の Local-first アーキテクチャ** を採用しています。
エージェントがデータ永続化や状態管理のコードを編集する際は、本規約に従い、パフォーマンスと保守性を担保してください。

## 1. Single Source of Truth (SoT) の原則

データ状態の「Split-brain（二重管理）」を防ぐため、以下の役割分担を厳守してください。

- **IndexedDB (Dexie.js)**: 永続化されるビジネスデータ（試合データ、選手、プロジェクト）の**唯一の真のデータソース**。
- **Zustand**: モーダル開閉、現在のアクティブタブ、UIテーマなどの **「一時的なUIステート (ephemeral UI state)」** に限定します。DBのデータをZustand内にミラーリング（丸ごとコピーして保持）することは原則禁止です。

## 2. データの取得とリアクティビティ

- **`useLiveQuery` の使用**: Zustand にデータを詰め替えるのではなく、Dexie 公式の `useLiveQuery` フックを使用してコンポーネントをリアクティブに更新してください。これによりボイラープレートを排除し、UI を常にDBと同期させます。
- **派生状態の保存禁止**: 計算可能な値（例：得点合計、フィルタリング結果）をDBに保存してはいけません。コンポーネントやセレクタで都度計算してください。

## 3. Repository パターンとトランザクション

- **直接アクセスの禁止**: UI コンポーネントやカスタムフックから Dexie の生 API (`db.table.put()` 等) を直接呼び出すことを禁じます。
- **抽象化レイヤー**: データアクセスは必ず `src/lib/db/repositories/` 配下に抽象化された Repository クラス（または関数）を経由してください。
- **Atomicity**: 複数の関連する更新（例：イベント追加とメモ更新）は、必ず `db.transaction('rw', ...)` ブロック内にまとめ、部分的な失敗を防いでください。

## 4. 高頻度更新に対する例外処理 (Tactical Board パターン & Store Provider)

戦術ボードの選手移動（ドラッグ操作）など、**60fps で発生する超高頻度の状態更新** に関しては、毎回 IndexedDB に書き込むとブラウザのパフォーマンスが崩壊します。このエッジケースに限り、以下の**ハイブリッド同期モデル**を許可します。

1. **Zustand での一時管理**: ドラッグ中の現在座標などは例外的に Zustand (インメモリ) で管理し、UI を Optimistic（楽観的）かつ高速に更新します。
2. **Store Provider による初期値注入 (Flicker ゼロ保証)**:
   - Web と Extension で共用する機能や独立したキャンバスセッションでは、グローバル単一のストアインスタンスを使わず、**Store Provider パターン（Vanilla Store Factory + React Context）** を採用してください。
   - レベル 3（Feature View）で IndexedDB からロードしたデータをマウント時の `initialState`（Props）として確定注入し、初回レンダリングから正しい状態で描画することで、初期チラつき（Flicker）を完全に根絶します。
3. **デバウンス永続化**: Zustand の変更を subscribe し、操作終了時またはデバウンス（例: 500ms）をかけて Repository を経由し IndexedDB に書き戻します。

## 5. スキーマとバリデーション (Contract-First)

- **Zod による堅牢化**: IndexedDB は型を持たないため、Repository の入出力境界で必ず Zod スキーマを通した検証（`.parse()` / `.safeParse()`）を行ってください。
- **マイグレーション**: ローカルファーストアプリでは「DBのリセット」はユーザーのデータ喪失を意味します。スキーマを変更する場合は必ず `src/lib/db/schema.ts` で Dexie のバージョンを上げ、非破壊的な（Additive な）マイグレーションを `.upgrade()` ブロックに記述してください。

