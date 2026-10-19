# TASK-016: UI サブコンポーネント群内部の dispatchEvent 全廃 & コールバック統一

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `src/features/memo-overlay/components/parts/PhaseMemoInput.tsx` (MODIFY)
  - `src/features/memo-overlay/components/parts/PhaseLabelSelection.tsx` (MODIFY)
  - `src/features/memo-overlay/components/parts/PhaseTimeInput.tsx` (MODIFY)
  - `src/features/memo-overlay/components/parts/MatchMemoUnit.tsx` (MODIFY)
  - `src/features/memo-overlay/components/parts/MemoOverlayEventContent.tsx` (MODIFY)
  - `src/features/memo-overlay/components/MemoOverlayView.tsx` (MODIFY)
  - `src/features/memo-overlay/components/__tests__/memo-overlay-view-refactor.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `PhaseMemoInput.tsx`, `PhaseLabelSelection.tsx`, `PhaseTimeInput.tsx`, `MatchMemoUnit.tsx` 内部で呼び出されている `window.dispatchEvent(new CustomEvent('footics-action', ...))` を完全に全廃（0件化）すること。
- [x] 2. 各パーツが直接 `onClose`, `onSave`, `onNextPhase`, `onPrevPhase`, `onNavigateSuggestion` などの明示的コールバック（Props）を受け取り、キーイベントやクリック時に直接呼び出す構造にすること。
- [x] 3. `MemoOverlayEventContent.tsx` および `MemoOverlayView.tsx` がこれらのコールバックを適切に各サブコンポーネントへ透過受け渡しすること。
- [x] 4. `PhaseTimeInput.tsx` の行数を 250行以下（現状 299行）にスリム化すること。
- [x] 5. 既存のテスト `memo-overlay-view-refactor.test.tsx` および関連テスト全件が PASS すること。
- [x] 6. `bun run ai:check src/features/memo-overlay` で exit code 0 を確認すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Updated Component Props Interfaces
```ts
// PhaseMemoInput.tsx
export interface PhaseMemoInputProps {
  memo: string;
  onMemoChange: (val: string) => void;
  onClose?: () => void;
  onSave?: () => void;
  onPrevPhase?: () => void;
}

// PhaseLabelSelection.tsx
export interface PhaseLabelSelectionProps {
  labelInput: string;
  suggestions: FlattenedEvent[];
  suggestionIndex: number;
  isListMode: boolean;
  isInvalidLabel: boolean;
  phase: number;
  validationError: string | null;
  onLabelInputChange: (val: string) => void;
  onAddLabel: (label: string) => void;
  onClose?: () => void;
  onNextPhase?: () => void;
  onPrevPhase?: () => void;
  onNavigateSuggestion?: (direction: 1 | -1) => void;
}

// PhaseTimeInput.tsx
export interface PhaseTimeInputProps {
  timeStr: string;
  displayTime: string;
  isEmptyTime: boolean;
  period: number;
  error: string | undefined;
  onTimeChange: (val: string) => void;
  onPeriodChange: (val: number) => void;
  onClose?: () => void;
  onNextPhase?: () => void;
}

// MatchMemoUnit.tsx
export interface MatchMemoUnitProps {
  memo: string;
  isSaving: boolean;
  hasMatchId: boolean;
  readOnly?: boolean;
  onMemoChange: (val: string) => void;
  onSave: () => void;
  onClose?: () => void;
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: サブコンポーネントの Props 拡張 & dispatchEvent 撤廃 (TDD)
- **Worker Model**: `inherit`
- **対象ファイル**:
  - `src/features/memo-overlay/components/parts/PhaseMemoInput.tsx`
  - `src/features/memo-overlay/components/parts/PhaseLabelSelection.tsx`
  - `src/features/memo-overlay/components/parts/PhaseTimeInput.tsx`
  - `src/features/memo-overlay/components/parts/MatchMemoUnit.tsx`
  - `src/features/memo-overlay/components/parts/MemoOverlayEventContent.tsx`
  - `src/features/memo-overlay/components/MemoOverlayView.tsx`
- **契約 (Interface)**: 上記 Context Snippets の Props 定義に準拠
- **Testing Strategy**:
  - `src/features/memo-overlay/components/__tests__/memo-overlay-view-refactor.test.tsx` に各コンポーネントのコールバック呼出テストを追加
  - `bun run ai:check src/features/memo-overlay` で exit code 0 を確認
- **Tasks**:
  - [x] 1. サブコンポーネント群から `window.dispatchEvent` を全廃し、明示的コールバック呼び出しに置換
  - [x] 2. `MemoOverlayEventContent.tsx` と `MemoOverlayView.tsx` からコールバックを接続
  - [x] 3. `PhaseTimeInput.tsx` を 250行以下に整理
  - [x] 4. `bun run ai:check src/features/memo-overlay` で exit code 0 を確認
- **Worker Handoff Log**:
  - `PhaseMemoInput.tsx`, `PhaseLabelSelection.tsx`, `PhaseTimeInput.tsx`, `MatchMemoUnit.tsx` から `window.dispatchEvent` を全廃し、Props (`onClose`, `onSave`, `onNextPhase`, `onPrevPhase`, `onNavigateSuggestion`) 直接呼出に完全移行。
  - `PhaseTimeInput.tsx` を 237 行にスリム化（<= 250行クリア）。
  - `MemoOverlayEventContent.tsx`, `MemoOverlayView.tsx` 経由で各コールバックを透過的に配線。
  - `memo-overlay-view-refactor.test.tsx` に各フェーズのキー操作（Escape, Enter, Shift+Tab, Ctrl+Enter, ArrowDown）によるコールバック呼出のテストを追加。
  - `bun run ai:check src/features/memo-overlay` にて Biome / TypeScript / Vitest (33 tests) 全件 PASS (exit code 0)。

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `inherit`
- **Reviewed At**: 2026-10-19T16:37:00+09:00
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: 4つのサブコンポーネントから `window.dispatchEvent` が完全に根絶されているか
  - [x] 境界と副作用: Level 2 コンポーネントが純粋な Props/Callback 駆動になっているか
  - [x] 設計負債防止: 行数上限（Component <= 300, Hook <= 150）をクリアしているか
  - [x] サイレント破壊防止: 既存のショートカット挙動や画面表示が壊れていないか
- **Summary**:
  - **要件網羅性**: `PhaseMemoInput.tsx`, `PhaseLabelSelection.tsx`, `PhaseTimeInput.tsx`, `MatchMemoUnit.tsx` から `window.dispatchEvent` が完全に根絶され、明示的 Props コールバック呼び出しに統一されたことを確認。
  - **境界と副作用**: `MemoOverlayView` -> `MemoOverlayEventContent` -> 各サブパーツへ props が過不足なく透過配線され、Level 2 UI パーツが純粋な Props/Callback 駆動へ移行完了。
  - **設計負債防止**: `PhaseTimeInput.tsx` は 237行（<= 250行基準クリア）。全コンポーネントが 300行上限を大幅に下回る。
  - **サイレント破壊防止**: Escape, Enter, Shift+Tab, Ctrl+Enter, ArrowUp/ArrowDown, Alt+1-5 等のキーボード操作、IME 変換ガード、イベント伝播抑制（`stopPropagation`）がすべて維持され、テストにて正常動作を検証済み。

## 6. Rejections / Additional Tasks (不可逆修正欄)
なし。完璧なリファクタリング。
