# TASK-160: ベンチ配置メンバーのマーカー写真表示

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-06
- **Target Files**:
  - `src/features/tactical-unified/core/hooks/player-photo-context.tsx` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/tactical-player-photo-provider.tsx` (NEW)
  - `src/features/tactical-unified/objects/player/components/__tests__/tactical-player-photo-provider.test.tsx` (NEW)
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/squad-bench-canvas.test.tsx` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **ベンチマーカー写真表示**: `insideContent === 'photo'` が設定されたベンチ選手（`area === 'bench'`）が、右パネルの `SquadBenchCanvas` 内で選手の顔写真（Konva Image）として正常に描画されること。
- [x] 2. **ピッチ↔ベンチ移動時の Zero-Flicker**: ピッチ上の選手とベンチ上の選手で同一の `PlayerPhotoMap` キャッシュを共有し、移動時に画像の再取得や背番号へのチラつきが発生しないこと。
- [x] 3. **写真非設定・未解決時のフォールバック**: 写真設定が無い選手や画像読込失敗時、またはプロバイダー外で単体マウントされた場合、エラーなく従来の背番号テキスト表示にフォールバックすること。
- [x] 4. **Shell Purity と層規約**: `TacticalUnifiedPage`（Level 4）に写真解決ロジックを直書きせず、`TacticalPlayerPhotoProvider`（Level 3）に委譲すること。また `core/` はホスト・DB 非依存を維持すること。
- [x] 5. **既存互換性（Invariants 保護）**: `FullTacticalCanvas` は親コンテキストに写真マップが存在する場合はそれを優先利用し、単体マウント時（テスト等）のみ自前解決にフォールバックすること。既存の `FullTacticalCanvas` テストが全て PASS すること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **`core/` からの DB・resolver 非依存**: `src/features/tactical-unified/core` は純粋描画層（Level 2）であり、IndexedDB や `player-photo-resolver` を直接 import してはならない。写真の提供は Context 経由で行う（TASK-139 の不変条件）。
  2. **Single Source of Truth & Zero-Flicker**: アクティブフェーズの全選手（ピッチ＋ベンチ）の写真は単一の `usePlayerPhotoRegistry` で管理され、ピッチ↔ベンチ間の移動でインスタンスの二重化やチラつきを起こしてはならない。
  3. **FullTacticalCanvas の単体動作可能性**: `FullTacticalCanvas` を親プロバイダーなしでマウントしてもクラッシュせず、単体テストが従来どおり動作すること。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/tactical-unified-page.tsx` — ページ全体を `TacticalPlayerPhotoProvider` でラップ
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` — 親コンテキストの有無に応じたフォールバック
  - `src/features/tactical-unified/panels/right-panel/squad-bench-canvas.tsx` — ベンチマーカーが親の `PlayerPhotoContext` を通じて画像を受領

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// core/hooks/player-photo-context.tsx
import { createContext, useContext } from 'react';
import type { PlayerPhotoMap } from '@/features/tactical-unified/core';

// tactical-player-photo-provider.tsx
import { useMemo, type ReactNode } from 'react';
import { PlayerPhotoProvider } from '@/features/tactical-unified/core';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```

### 3.2 Key Interfaces & Types
```ts
// core/hooks/player-photo-context.tsx
export type PlayerPhotoMap = ReadonlyMap<string, HTMLImageElement>;
export function usePlayerPhotoContext(): PlayerPhotoMap | null;

// tactical-player-photo-provider.tsx
export interface TacticalPlayerPhotoProviderProps {
  children: ReactNode;
}
export function TacticalPlayerPhotoProvider({ children }: TacticalPlayerPhotoProviderProps): React.JSX.Element;
```

### 3.3 Reference Pattern (既存の FullTacticalCanvas の写真取得パターン)
```ts
// src/features/tactical-unified/views/FullTacticalCanvas.tsx (L58-64)
const activeSlides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
const allPhasePlayers = useMemo(
  () => activeSlides.flatMap((s) => s.players ?? []),
  [activeSlides],
);
const playerPhotos = usePlayerPhotoRegistry(allPhasePlayers);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 共通写真プロバイダー基盤の実装 (Level 3 Provider & Context Hook)
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/hooks/player-photo-context.tsx` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/tactical-player-photo-provider.tsx` (NEW)
  - `src/features/tactical-unified/objects/player/components/__tests__/tactical-player-photo-provider.test.tsx` (NEW)
- **契約 (Exact Contract & Formula)**:
  1. `core/hooks/player-photo-context.tsx`:
     ```ts
     export function usePlayerPhotoContext(): PlayerPhotoMap | null {
       return useContext(PlayerPhotoContext);
     }
     ```
  2. `core/index.ts`:
     `usePlayerPhotoContext` を export に追加。
  3. `tactical-player-photo-provider.tsx`:
     - `useTacticalUnifiedStoreContext(selectActivePhaseSlides)` から `activeSlides` を取得。
     - `allPhasePlayers = useMemo(() => activeSlides.flatMap((s) => s.players ?? []), [activeSlides])`
     - `photos = usePlayerPhotoRegistry(allPhasePlayers)`
     - `<PlayerPhotoProvider photos={photos}>{children}</PlayerPhotoProvider>` を返却。
- **Testing Strategy (Concrete Test Values)**:
  - `tactical-player-photo-provider.test.tsx`:
    - `useTacticalUnifiedStoreContext` と `usePlayerPhotoRegistry` をモック。
    - `selectActivePhaseSlides` からベンチ選手を含む `[{ players: [{ id: 'p1', name: 'Haaland', area: 'bench', style: { insideContent: 'photo' } }] }]` を返し、`usePlayerPhotoRegistry` に渡された選手配列に `p1` が含まれていることを検証。
    - 子コンポーネント内で `usePlayerPhotoContext()` を呼び出し、モックした `PlayerPhotoMap` が取得できることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/objects/player/components/__tests__/tactical-player-photo-provider.test.tsx`
  - [x] 2. `player-photo-context.tsx`, `core/index.ts`, `tactical-player-photo-provider.tsx` 実装
  - [x] 3. `bun run ai:check src/features/tactical-unified/core/hooks/player-photo-context.tsx src/features/tactical-unified/core/index.ts src/features/tactical-unified/objects/player/components/tactical-player-photo-provider.tsx src/features/tactical-unified/objects/player/components/__tests__/tactical-player-photo-provider.test.tsx` PASS
- **Worker Handoff Log**:
  - export: `usePlayerPhotoContext` (from `core`), `TacticalPlayerPhotoProvider` (from `objects/player/components/tactical-player-photo-provider`).
  - `TacticalPlayerPhotoProvider` は store 内の全 activeSlides から全選手（ベンチ含む）を集約して `PlayerPhotoProvider` に渡す。

---

### Phase 2: ページ・キャンバスへの配線とベンチ写真描画の検証
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/squad-bench-canvas.test.tsx` (NEW)
- **契約 (Exact Contract & Formula)**:
  1. `tactical-unified-page.tsx`:
     - `<TacticalUnifiedStoreProvider initialState={initialState}>` の子として `<TacticalPlayerPhotoProvider>` を配置し、Canvas と RightPanel を包む。
  2. `FullTacticalCanvas.tsx`:
     - 親コンテキスト判定:
       ```ts
       const parentPhotos = usePlayerPhotoContext();
       // 親プロバイダーが存在する場合は重複ロードを防ぐため空配列を渡す
       const fallbackPhotos = usePlayerPhotoRegistry(parentPhotos ? [] : allPhasePlayers);
       const playerPhotos = parentPhotos ?? fallbackPhotos;
       ```
     - 既存の `<PlayerPhotoProvider photos={playerPhotos}>` はそのまま維持（親がある場合は同じ参照が渡る）。
- **Testing Strategy (Concrete Test Values)**:
  - `squad-bench-canvas.test.tsx`:
    - `SquadBenchCanvas` を `PlayerPhotoProvider` でラップしてレンダリング。
    - ベンチ選手 `marker = { id: 'bench-1', name: 'De Bruyne', area: 'bench', x: 20, y: 20, style: { insideContent: 'photo' } }` を渡す。
    - `photos` Map に `bench-1`（または key）のダミー `HTMLImageElement` を設定した場合、マーカー内に Konva Image が描画されることを確認。
    - `PlayerPhotoProvider` が無い場合、背番号テキスト（例: '10'）が描画されエラーにならないことを確認。
  - `FullTacticalCanvas` 既存テストの回帰確認:
    - `bun run ai:check src/features/tactical-unified/views/__tests__/full-tactical-canvas.test.tsx` が PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/right-panel/__tests__/squad-bench-canvas.test.tsx`
  - [x] 2. `FullTacticalCanvas.tsx` および `tactical-unified-page.tsx` の配線
  - [x] 3. `bun run ai:check src/features/tactical-unified/tactical-unified-page.tsx src/features/tactical-unified/views/FullTacticalCanvas.tsx src/features/tactical-unified/panels/right-panel/__tests__/squad-bench-canvas.test.tsx src/features/tactical-unified/views/__tests__/full-tactical-canvas.test.tsx` PASS
- **Worker Handoff Log**:
  - `TacticalUnifiedPage` を `TacticalPlayerPhotoProvider` でラップし、Canvas とベンチパネルで単一の写真キャッシュを共有。
  - `FullTacticalCanvas` は親コンテキスト（`usePlayerPhotoContext`）が存在する場合重複解決をスキップし、単体マウント時のみフォールバック動作する。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-06 02:45
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: ベンチマーカー写真描画、Zero-Flicker、受入要件の全網羅
  - [x] 2. Invariants保護 & Consumer同期: `core/` の非依存性、`FullTacticalCanvas` の単体マウント互換、ピッチ↔ベンチ間の同一キャッシュ利用
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Store Provider経由のデータ取得、Shell Purity遵守、初期チラつきゼロ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP遵守、公開シグネチャ保護
- **Summary**:
  TacticalPlayerPhotoProviderによるSingle Source of Truth化でベンチ写真描画とZero-Flickerを達成。core層の非依存性、FullTacticalCanvasの単体互換フォールバック、Shell Purityの規約を完璧に遵守。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
