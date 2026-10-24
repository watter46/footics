# TASK-044: Step 3 オブジェクトオプション（Floating UI / react-colorful / 選手情報変更）と3Dマーカー下部選手名表示

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/features/tactical-unified/core/components/hud/use-hud-position.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/ContextHud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/mini-color-picker.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/player-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-marker-label.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `ContextHud.tsx` から `stage.on('dragmove')` によるドラッグ追従DOM書き換えを廃止（ドラッグ開始 `isDragging === true` と同時に非表示）し、`ContextHud.tsx` / `use-hud-position.ts` の位置算出を `@floating-ui/react`（`useFloating`, `offset(12)`, `flip()`, `shift({ padding: 10 })` + Virtual Element）に置換すること（初期同期描画時は `target.x` 等をフォールバック適用して Zero-Flicker を担保）。
- [x] 2. `mini-color-picker.tsx` から `<input type="color">` 透明重ねハックと `window.addEventListener('mousedown')` を廃止し、`@floating-ui/react` ポップオーバー内で `react-colorful` の `HexColorPicker` と `HUD_COLOR_PALETTE` スウォッチが完結するUIに統一すること。
- [x] 3. `player-hud.tsx` から「ベンチへ退避」ボタンを廃止し、Web版（2Dサークル `!isRing`）では「削除」ボタンも非表示（Extension版 3Dリング `isRing` のみ削除ボタンを表示）にすること。また「選手情報変更」ボタン（ポップオーバー）を実装し、Web版（`!isRing`）は「背番号 (`shirtNo`)」と「選手名 (`name`)」、Extension版（`isRing`）は「選手名 (`name`)」を変更でき、`player-marker-label.tsx` で 3Dリングマーカーでも選手名が設定された際に下部に選手名ラベルを表示すること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// @floating-ui/react & react-colorful
import {
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { HexColorPicker } from 'react-colorful';
import { Lock, Minus, Plus, Trash2, Unlock, UserCog } from 'lucide-react';
```

### 3.2 Key Interfaces & Types
```ts
// src/features/tactical-unified/core/components/hud/use-hud-position.ts
export interface HudPosition {
  clampedX: number;
  clampedY: number;
  isBelow: boolean;
  targetX?: number;
  targetY?: number;
  targetHeight?: number;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```tsx
// 1. ContextHud.tsx: @floating-ui/react Virtual Element + Zero-Flicker 初期座標
const position = useHudPosition({
  selected,
  stageSize,
  pitchRect,
  nodesRegistryRef: nodesRegistryRef as any,
  resolveExtraTarget,
});

const { refs, x, y, placement } = useFloating({
  placement: position?.isBelow ? 'bottom' : 'top',
  strategy: 'absolute',
  middleware: [
    offset(12),
    flip({ boundary: 'clippingAncestors', padding: 10 }),
    shift({ padding: 10 }),
  ],
});

useEffect(() => {
  if (!position) return;
  const tx = position.targetX ?? position.clampedX;
  const ty = position.targetY ?? position.clampedY;
  const th = position.targetHeight ?? 30;
  refs.setReference({
    getBoundingClientRect() {
      return {
        width: 0,
        height: th,
        x: tx,
        y: ty - th / 2,
        top: ty - th / 2,
        bottom: ty + th / 2,
        left: tx,
        right: tx,
      };
    },
  });
}, [position, refs]);

if (isDragging || !selected || activeTool === 'eraser' || !isHudOpen || !position) {
  return null;
}

const resolvedLeft = x ? Math.round(x) : position.clampedX;
const resolvedTop = y ? Math.round(y) : position.clampedY;
const isBelow = placement.startsWith('bottom') || (!x && position.isBelow);

// 2. mini-color-picker.tsx: @floating-ui/react + HexColorPicker
const [isOpen, setIsOpen] = useState(false);
const { refs, floatingStyles, context } = useFloating({
  open: isOpen,
  onOpenChange: setIsOpen,
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 8 })],
});
const click = useClick(context);
const dismiss = useDismiss(context);
const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
// ポップオーバー内に HUD_COLOR_PALETTE スウォッチ + <HexColorPicker color={normalizedValue} onChange={(c) => { setCustomColor(c); onChange(c); }} /> を配置

// 3. player-marker-label.tsx: 3Dリングマーカーでも displayName があれば下部ラベルを表示
export function PlayerMarkerLabel({
  player,
  radius,
  displayName,
  labelScale,
}: PlayerMarkerLabelProps) {
  const isRingWithName =
    player.style.markerType === 'ring' &&
    player.style.bottomLabel !== 'number' &&
    Boolean(displayName);

  if ((player.style.bottomLabel === 'name' || isRingWithName) && displayName) {
    return (
      <Text
        x={-radius * 2}
        y={radius + 3}
        width={radius * 4}
        text={displayName}
        fontSize={radius * 0.65 * labelScale}
        fill="#ffffff"
        stroke="#020617"
        strokeWidth={2}
        fillAfterStrokeEnabled={true}
        align="center"
        fontStyle="bold"
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }
  ...
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ContextHud の @floating-ui/react 化と MiniColorPicker の react-colorful 統一
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/hud/use-hud-position.ts`, `src/features/tactical-unified/core/components/ContextHud.tsx`, `src/features/tactical-unified/core/components/hud/mini-color-picker.tsx`, `src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx`, `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`
- **契約 (Interface)**:
  - Level 2 Domain UI Block: `ContextHud.tsx` から `stage.on('dragmove')` リスナーを撤去し、`@floating-ui/react` の `useFloating` (`offset`, `flip`, `shift`) + Virtual Element で位置を制御する（初期描画の Zero-Flicker フォールバックとして `position.clampedX` / `position.clampedY` を維持）。
  - `mini-color-picker.tsx` から `<input type="color">` と `window.addEventListener('mousedown')` を撤去し、`useFloating` (`useClick`, `useDismiss`) ポップオーバー + `HexColorPicker` (`react-colorful`) + `HUD_COLOR_PALETTE` に置換する。
- **Testing Strategy**: `context-hud-extra.test.tsx` で `isDragging === true` 時に `ContextHud` が `null` になること及びターゲット座標解決を検証。`hud-and-editor.test.tsx` で `MiniColorPicker` クリック時に `<input type="color">` ではなく `HexColorPicker` を含むカラーパレットダイアログが開き色変更できることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/hud/use-hud-position.ts src/features/tactical-unified/core/components/ContextHud.tsx src/features/tactical-unified/core/components/hud/mini-color-picker.tsx src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx` PASS
- **Worker Handoff Log**:
  - ContextHud は `setReference` の無限再レンダリング防止のため依存配列を primitive 座標に限定。MiniColorPicker は `useFloating` + `HexColorPicker` で透明 input を完全撤去。

### Phase 2: 選手マーカーオプション（選手情報変更・ベンチ移動廃止・Web/Extension出し分け）と3Dマーカー名前表示
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/hud/player-hud.tsx`, `src/features/tactical-unified/objects/player/components/player-marker-label.tsx`, `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`, `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx`
- **契約 (Interface)**:
  - Level 2 Domain UI Block (`player-hud.tsx`):
    - 「ベンチへ退避」ボタン（`ArrowDownToLine`）を完全削除。
    - 「削除」ボタン（`Trash2`, `title="削除 (Delete)"`）は `isRing === true`（Extension 3Dマーカー）の時のみ描画し、`!isRing`（Web 2Dマーカー）では描画しない。
    - 「選手情報変更」ボタン（`title="選手情報変更"`, `aria-label="選手情報変更"`）を配置し、クリックで `@floating-ui/react` ポップオーバー（`role="dialog"`, `aria-label="選手情報変更フォーム"`）を開閉する。ポップオーバー内には `!isRing` 時は `aria-label="背番号"` と `aria-label="選手名"` の `<input>`、`isRing` 時は `aria-label="選手名"` の `<input>` を配置し、名前変更時は `updateMarker(player.id, { name, style: { ...player.style, bottomLabel: name ? 'name' : 'none' } })` を呼ぶ。
  - Level 1 Object Component (`player-marker-label.tsx`): `player.style.markerType === 'ring'` でも `displayName` が存在する場合はリング下部に `<Text text={displayName} />` を描画する。
- **Testing Strategy**: `hud-and-editor.test.tsx` で Web 2Dマーカー時にベンチ退避ボタンと削除ボタンが存在せず、選手情報変更ポップオーバーから背番号・選手名を更新できること、Extension 3Dマーカー時に選手情報変更ポップオーバーから選手名を更新でき削除ボタンが表示されることを検証。`player-marker-item.test.tsx` で `markerMode="3d-only"` かつ `name: "Saka"` の 3Dマーカー下部に `"Saka"` の Konva `Text` が描画されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/hud/player-hud.tsx src/features/tactical-unified/objects/player/components/player-marker-label.tsx src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` PASS
- **Worker Handoff Log**:
  - PlayerHud でベンチ退避ボタンを撤去し削除ボタンは isRing 時のみ表示。選手情報ポップオーバー（UserCog）から背番号(!isRingのみ)と選手名が更新可能となり、player-marker-label で 3Dリングマーカー時も選手名表示を担保。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-24 12:07
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  DOM直接操作や透明inputハックが完全に排除され、Floating UI / react-colorful / 選手情報変更ポップオーバーが4層モデル・Zero-Flickerに準拠して美しく統合されています。player-hud.tsx が261行と微増しているため、今後ポップオーバー部分のサブコンポーネント分離を推奨します。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
