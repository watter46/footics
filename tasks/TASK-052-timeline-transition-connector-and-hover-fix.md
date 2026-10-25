# TASK-052: timeline-transition-connector-and-hover-fix

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-25
- **Target Files**:
  - `src/features/tactical-unified/panels/timeline/slide-card-actions.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-card.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/transition-connector.tsx` (NEW)
  - `src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx` (NEW)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. ポップオーバーの最前面表示 (`FloatingPortal`): `SlideTransitionPopover` および `BatchTransitionPopover` で `@floating-ui/react` の `FloatingPortal` を使用し、親要素の `overflow-x-auto` や `transform` に拘束されず、常に画面最前面に欠けなく表示されること。
- [x] 2. カードホバー操作の枠内オーバーレイ化: `SlideCardActions` の配置を `-top-2 -right-1`（枠外はみ出し）から `top-1 right-1`（カード枠内右上）に変更し、半透明背景付きでカード内に収め、タイムライン上端で見切れないこと。
- [x] 3. シーン間トランジションコネクタ (`TransitionConnector`): シーンカード間に小型コネクタ要素を配置し、到着先シーン（`slides[i]`）の移動時間（`transitionDurationMs / 1000`）を「── 1.0s ──▶」形式で表示し、クリックでそのシーンの `SlideTransitionPopover` を開くこと。Scene 1（先頭）の前にはコネクタを表示しないこと。
- [x] 4. DndKit 並び替えとドラッグの保護: コネクタやホバーボタンのクリック/ポインター操作が DndKit のドラッグ開始やカード選択と干渉しないよう `e.stopPropagation()` を徹底すること。
- [x] 5. カード内表示の整理: `SlideCard` 内の表示は静止時間（Pause）と描画数とし、移動時間はコネクタに分離して情報過多と重複を排除すること（カード右クリックメニュー「トランジション設定...」導線は維持）。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { FloatingPortal, flip, offset, shift, useFloating } from '@floating-ui/react';
import type { Slide } from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
export interface TransitionConnectorProps {
  targetSlide: Slide;
  targetIndex: number;
}
```

### 3.3 Implementation Notes & Gotchas
```ts
// 1. FloatingPortal & strategy: 'fixed':
//    useFloating({ strategy: 'fixed', ... }) と <FloatingPortal> の組み合わせで親 transform の影響を完全排除する。
// 2. DndKit干渉防止:
//    コネクタ要素の onPointerDown / onClick には必ず e.stopPropagation() を付与し、ドラッグイベントを発火させない。
// 3. SlideCard 内の秒数表示:
//    カード本体には静止時間（例: "静止 0.5s" または "Pause 0.5s"）を表示し、移動時間はコネクタ側に委譲する。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ポップオーバーの FloatingPortal 化 ＆ カードホバーの枠内オーバーレイ化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/timeline/slide-card-actions.tsx`
  - `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx`
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx`
  - `src/features/tactical-unified/panels/timeline/slide-card.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx`
- **契約 (Interface)**:
  ```ts
  // SlideTransitionPopover, BatchTransitionPopover は FloatingPortal でラップしてレンダリング
  // SlideCardActions は top-1 right-1 のカード内オーバーレイ配置
  ```
- **Testing Strategy**: `slide-transition-popover.test.tsx` で FloatingPortal 経由でのダイアログ表示と操作、`SlideCardActions` の配置クラス検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/timeline/slide-card.tsx` PASS
- **Worker Handoff Log**:
  - `SlideTransitionPopover` / `BatchTransitionPopover` を `FloatingPortal` (strategy: 'fixed') でラップ。
  - `SlideCard` は静止時間（Pause）表示に変更し、`SlideCardActions` を枠内オーバーレイ（`top-1 right-1`）に収容。

---

### Phase 2: シーン間トランジションコネクタ実装 ＆ タイムラインバー統合
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/timeline/transition-connector.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx`
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx`
- **契約 (Interface)**:
  ```ts
  export interface TransitionConnectorProps {
    targetSlide: Slide;
    targetIndex: number;
  }
  export function TransitionConnector(props: TransitionConnectorProps): React.JSX.Element;
  ```
- **Testing Strategy**: `transition-connector.test.tsx` で秒数表示（0.1s単位）とクリック時のポップオーバー開閉を検証。`timeline-bar.test.tsx` で複数スライド間のコネクタレンダリングを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/timeline/timeline-bar.tsx` PASS
- **Worker Handoff Log**:
  - `TransitionConnector` を export（props: `TransitionConnectorProps`）。ボタンの `onPointerDown`/`onClick` に `stopPropagation()` を適用して DndKit ドラッグ干渉を防止。
  - `TimelineBar` で `i > 0` 時のみ `SlideCard` の直前に `TransitionConnector` を配置。全16件のテストPASS確認済み。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-25 15:10
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  FloatingPortal によるポップオーバー最前面表示、枠内ホバーアクション化、シーン間トランジションコネクタの DndKit イベント隔離（stopPropagation）および pauseSec への表示分離が 6大設計原則に基づき高品質に実装・テストされています。

## 6. Rejections / Additional Tasks (不可逆修正欄)
