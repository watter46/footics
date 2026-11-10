# TASK-176: Fix Tactical Markers, Ripple Effects, and Scene Shortcuts

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-10
- **Target Files**:
  - `src/lib/types/tactical/player.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-marker-circle.tsx` (MODIFY)
  - `src/lib/tactical/export/renderers/player-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/player-ring-renderer.ts` (NEW)
  - `src/features/tactical-unified/hooks/animation-ripple-updater.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/player-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/player-info-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 選手写真マーカー（`insideContent === 'photo'`）は画像のロード完了前であっても、非選択時の枠線が幅ゼロ・透明で描画され、初期表示で白枠が出ないこと。
- [x] 2. `MarkerStyleSchema` に `transparentBackground?: boolean`（デフォルト `false`）が追加され、`true` のときはボード（Konva）およびエクスポート（Canvas2D）で背景塗り（円の fill）が透明になること。
- [x] 3. ボード画面の波紋アニメーション更新において、固定選手色ではなく設定された波紋カラー（`ringData.color`）が最優先でストローク色に反映されること。
- [x] 4. 動画エクスポート時、スライド内に `markerEffect`（ripple 等）が存在する場合、静止フレーム（`interpolated.isPaused`）での描画スキップ（`shouldSkipRender`）が無効化され、波紋が途中で止まらず毎フレーム描画されること。
- [x] 5. `PlayerHud` から背番号 input が削除され横幅がコンパクト化されていること。
- [x] 6. `PlayerInfoPopover` 内に「背番号」「選手名」「ラベル表示切替（Name / Num / None）」「背景塗り切替（塗りあり / 背景なし）」が統合され、個別選手から確実にラベルおよび背景透明度を変更できること。
- [x] 7. `FormationPanel` の Bottom Label 一括切替処理が `updatePlayers` によるアトミック更新に改善され、全体 none 実行後のチーム切替時にも状態が正しく同期されること。
- [x] 8. 描画ツールショートカットは `V`（Select）のみを残して全廃され、他の文字キーで意図せず描画ツールが切り替わらないこと。
- [x] 9. ショートカットキー `D`（前のシーン）、`F`（次のシーン）、`R`（初めから再生）がボード画面・レイアウト画面（Director モード）の双方で動作し、フォーム入力中（input/textarea）は誤爆しないこと。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **Konva 属性の決定論的設定**: Konva の Shape に `undefined` や `null` を渡すと直前値のキャッシュが残留するため、枠線非表示は明示的に `strokeWidth={0}` かつ `stroke="transparent"`、背景非表示は `fill="transparent"` を渡す。
  2. **ボード画面とレイアウト画面のストア一元性**: ボード画面と Director（レイアウト）画面は単一の Zustand ストア（`activeSlideId`, `slides`, `playbackSeekTimeMs`）を共有する。シーン移動ショートカットは `setActiveSlide` + `setPlaybackIndices` + `seekTo(startTimeMs)` をアトミックに実行し、どちらの画面でも同一のシーン遷移を保証する。
  3. **4層コンポーネントモデル & ホスト非依存**: 変更対象コンポーネント（Level 2: Canvas Primitive / HUD / Popover, Level 3: Right Panel / Export Engine）はすべて純粋な React コンポーネントおよびフックであり、直接グローバルストアやブラウザ API を無秩序に叩かず、Store Provider API 経由で状態操作を行う。
  4. **入力フォーム保護**: `useHotkeys` の `{ enableOnFormTags: false }` および `isInputFocused()` ガードにより、テキスト入力中の `D`, `F`, `R`, `V` 押下で意図しないシーン切替やツール切替が発生することを絶対に防ぐ。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` — `PlayerMarkerCircle` への props 整合
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` — レイアウト画面でのシーン移動同期
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` — タイムラインスライド選択ロジックとの整合性
  - `src/lib/tactical/export/renderers/player-renderer.ts` — 動画エクスポート時とボード描画の視覚的同一性

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { z } from 'zod';
import { getSlideSnapTime } from '@/features/tactical-unified/hooks/tactical-playback-controls';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreApi } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { isInputFocused } from '@/lib/shortcuts';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/types/tactical/player.ts
export const MarkerStyleSchema = z.object({
  markerType: z.enum(['circle', 'ring', 'ring-fade']).optional().default('circle'),
  insideContent: z.enum(['number', 'photo', 'none']).default('number'),
  photoUrl: z.string().url().optional(),
  bottomLabel: z.enum(['name', 'number', 'none']).default('name'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  strokeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
  strokeWidth: z.number().min(0).max(5).default(2),
  sizeScale: z.number().min(0.4).max(2.0).default(1.0),
  numberSizeScale: z.number().min(0.6).max(1.8).default(1.0),
  labelSizeScale: z.number().min(0.6).max(1.8).default(1.0),
  glowBlur: z.number().min(0).max(100).default(50).optional(),
  glowOpacity: z.number().min(0).max(1).default(1.0).optional(),
  markerEffect: MarkerEffectConfigSchema.optional(),
  transparentBackground: z.boolean().default(false).optional(), // NEW
});
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// スライド選択とシークの整合パターン (timeline-bar.tsx)
setActiveSlide(slideId);
const targetIndex = slides.findIndex((s) => s.id === slideId);
if (targetIndex !== -1) {
  setPlaybackIndices(targetIndex, null);
  const startTimeMs = getSlideSnapTime(slides, targetIndex);
  seekTo(startTimeMs);
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Marker Rendering & Ripple Color Fixes
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical/player.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-marker-circle.tsx` (MODIFY)
  - `src/lib/tactical/export/renderers/player-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-ripple-updater.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `src/lib/types/tactical/player.ts`:
     - `MarkerStyleSchema` に `transparentBackground: z.boolean().default(false).optional()` を追加。
  2. `src/features/tactical-unified/objects/player/components/player-marker-circle.tsx`:
     - `fill`: `player.style.transparentBackground ? 'transparent' : player.style.color`
     - `stroke`: `isSelected ? '#60a5fa' : player.style.insideContent === 'photo' ? 'transparent' : (player.style.strokeColor ?? '#ffffff')`
     - `strokeWidth`: `isSelected ? 3 : player.style.insideContent === 'photo' ? 0 : (player.style.strokeWidth ?? 2)`
     - ※ `loadedImage` の有無に関係なく、写真マーカー時は最初から枠線 0 / transparent とし、白枠初期描画を完全排除。
  3. `src/lib/tactical/export/renderers/player-renderer.ts`:
     - `p.style.transparentBackground === true` の場合、背景円の `ctx.fill()` をスキップ。
     - `p.style.insideContent === 'photo'` の場合、非選択時は `ctx.stroke()` をスキップ。
  4. `src/features/tactical-unified/hooks/animation-ripple-updater.ts`:
     - `const color = pState.style?.color ?? '#38bdf8';` を廃止。
     - `ringNode.stroke(ringData.color || pState.style?.color || '#38bdf8')` として指定波紋色を最優先で適用。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/objects/player/components/__tests__/player-marker-circle.test.tsx` (または `player-marker-item.test.tsx`), `src/features/tactical-unified/hooks/__tests__/animation-ripple-updater.test.ts`
  - 入力: `player.style = { insideContent: 'photo', transparentBackground: true }`, `loadedImage = null`
  - 期待値: Circle の `strokeWidth` は `0`、`stroke` は `'transparent'`、`fill` は `'transparent'`
  - 入力: `ringData = { radius: 25, opacity: 0.8, color: '#ff0000' }`, `pState.style.color = '#0000ff'`
  - 期待値: `ringNode.stroke()` に `'#ff0000'` が渡されること
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check [対象ファイル]` で既存テスト確認 ➔ 修正 ➔ PASS
- **Worker Handoff Log**:
  - `MarkerStyleSchema` に `transparentBackground` を追加し、`PlayerMarkerCircle` と `renderPlayers` で背景透明化・写真時未ロード白枠防止（枠線透明・幅0）を実装。
  - 波紋更新で `ringData.color` 最優先適用、`player-renderer.ts` の Ring 描画を 300行制限対応として `player-ring-renderer.ts`（`renderPlayerRingMarker`）へ抽出。全チェック合格。

---

### Phase 2: Video Export Ripple Fix & HUD / Popover / Formation Panel
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/player-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/player-info-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `src/lib/tactical/export/video-mediabunny-export.ts`:
     - 波紋エフェクト存在判定:
       ```ts
       const hasDynamicMarkerEffect = slides.some((s) =>
         s.players.some((p) => p.style?.markerEffect && p.style.markerEffect.type !== 'none'),
       );
       const shouldSkipRender =
         frameIdx > 0 &&
         interpolated.isPaused &&
         !hasDynamicMarkerEffect &&
         isTransformIdentical &&
         lastRenderedSlideIdx === interpolated.currentSlideIndex;
       ```
     - これにより動的エフェクトがあるスライドでは静止時間中でも毎フレーム再描画され、波紋が途中で止まらない。
  2. `src/features/tactical-unified/core/components/hud/player-hud.tsx`:
     - `player.shirtNo` のインライン `<input>` および隣接する縦線 divider を削除。
     - HUD 横幅をコンパクトに保ち、背番号編集は Popover へ一本化。
  3. `src/features/tactical-unified/core/components/hud/player-info-popover.tsx`:
     - 「背番号」「選手名」に加えて、以下のトグル UI を追加:
       - **Bottom Label トグル**: `Name` / `Num` / `None`
         - `updateMarker(player.id, { style: { ...player.style, bottomLabel: mode } })`
       - **背景塗り切替**: `塗りあり` / `背景なし (透明)`
         - `updateMarker(player.id, { style: { ...player.style, transparentBackground: !current } })`
  4. `src/features/tactical-unified/panels/right-panel/formation-panel.tsx`:
     - `handleBottomLabelChange` での個別ループ呼出を廃止:
       ```ts
       const targetPlayers =
         activeTeam === 'both'
           ? activeSlide.players
           : activeSlide.players.filter((p) => p.team === activeTeam);
       updatePlayers(
         activeSlideId,
         targetPlayers.map((p) => ({
           id: p.id,
           patch: { style: { ...p.style, bottomLabel: label } },
         })),
       );
       ```
     - チーム切替（Home/Away/Both）時でも `currentBottomLabel` が選択チームの代表値または none に同期されるよう保証。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/core/components/hud/__tests__/player-hud.test.tsx`, `src/features/tactical-unified/core/components/hud/__tests__/player-info-popover.test.tsx`, `src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx`
  - 入力: `PlayerHud` を描画
  - 期待値: 背番号のインライン input が存在しないこと (`queryByRole('textbox', { name: '背番号' }) === null`)
  - 入力: `PlayerInfoPopover` を開き、「None」ラベルボタンをクリック
  - 期待値: `updateMarker` が `{ style: expect.objectContaining({ bottomLabel: 'none' }) }` で呼ばれること
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check [対象ファイル]` で検証 ➔ 実装 ➔ PASS
- **Worker Handoff Log**:
  - `video-mediabunny-export.ts` で `hasDynamicMarkerEffect` による動的波紋描画のフレームスキップ無効化を適用。
  - `PlayerHud` のインライン背番号を撤廃し `PlayerInfoPopover` に背番号・BottomLabel切替（Name/Num/None）・背景透明切替を統合。`FormationPanel` の BottomLabel 変更を `updatePlayers` によるアトミック更新へリファクタリング。全検証合格。

---

### Phase 3: Tool Shortcuts Cleanup & Scene Navigation (D/F/R)
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts`:
     - `DRAWING_TOOLS_CORE` 内で `shortcutKey` を持つのは `select` (`'v'`) のみとする。
     - `line` (`'l'`), `route_line` (`'r'`), `arrow` (`'a'`), `arrow_dash` (`'d'`), `arrow_wavy` (`'w'`)、および `zone_circle` (`'z'`), `eraser` (`'e'`), `player_3d_ring` (`'m'`), `player_3d_ring_fade` (`'o'`) から `shortcutKey` を削除。
     - `getToolShortcutMap()` の戻り値は `{ v: 'select' }` のみとなる。
  2. `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`:
     - 新規ショートカット登録:
       - **`d`**: 前のシーンへ
         ```ts
         useHotkeys('d', (e) => {
           if (isInputFocused()) return;
           if (e.ctrlKey || e.metaKey || e.altKey) return;
           e.preventDefault();
           const store = storeApi.getState();
           const slides = selectActivePhaseSlides(store);
           const currentIndex = slides.findIndex((s) => s.id === store.activeSlideId);
           if (currentIndex > 0) {
             const target = slides[currentIndex - 1];
             store.setActiveSlide(target.id);
             store.setPlaybackIndices(currentIndex - 1, null);
             const snapTime = getSlideSnapTime(slides, currentIndex - 1);
             store.seekTo(snapTime);
           }
         }, { enableOnFormTags: false });
         ```
       - **`f`**: 次のシーンへ
         ```ts
         useHotkeys('f', (e) => {
           if (isInputFocused()) return;
           if (e.ctrlKey || e.metaKey || e.altKey) return;
           e.preventDefault();
           const store = storeApi.getState();
           const slides = selectActivePhaseSlides(store);
           const currentIndex = slides.findIndex((s) => s.id === store.activeSlideId);
           if (currentIndex >= 0 && currentIndex < slides.length - 1) {
             const target = slides[currentIndex + 1];
             store.setActiveSlide(target.id);
             store.setPlaybackIndices(currentIndex + 1, null);
             const snapTime = getSlideSnapTime(slides, currentIndex + 1);
             store.seekTo(snapTime);
           }
         }, { enableOnFormTags: false });
         ```
       - **`r`**: 初めから再生
         ```ts
         useHotkeys('r', (e) => {
           if (isInputFocused()) return;
           if (e.ctrlKey || e.metaKey || e.altKey) return;
           e.preventDefault();
           const store = storeApi.getState();
           const slides = selectActivePhaseSlides(store);
           if (slides.length > 0) {
             store.setActiveSlide(slides[0].id);
             store.setPlaybackIndices(0, null);
             store.seekTo(0);
             store.setIsPlaying(true);
           }
         }, { enableOnFormTags: false });
         ```
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts`, `src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx`
  - 入力: `getToolShortcutMap()`
  - 期待値: `{ v: 'select' }` のみを含み、`d`, `r`, `w` を含まないこと
  - 入力: 3つのスライド（A, B, C）が存在し、B（インデックス 1）がアクティブな状態で `d` キー押下イベントを発火
  - 期待値: `store.activeSlideId` が A の ID になり、`playbackSlideIndex` が 0 になること
  - 入力: B がアクティブな状態で `f` キー押下イベントを発火
  - 期待値: `store.activeSlideId` が C の ID になること
  - 入力: C がアクティブな状態で `r` キー押下イベントを発火
  - 期待値: `store.activeSlideId` が A の ID になり、`playbackSeekTimeMs` が 0、`isPlaying` が true になること
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check [対象ファイル]` で検証 ➔ 実装 ➔ PASS
- **Worker Handoff Log**:
  - `drawing-tool-plugin.ts` で `select` ('v') 以外の描画ツールショートカットを廃止（`getToolShortcutMap` は `{ v: 'select' }` のみ返却）。
  - `use-keyboard-shortcuts.ts` に `d`（前のシーン）、`f`（次のシーン）、`r`（先頭シーンへシーク0で再生開始）ショートカットを追加（修飾キー除外およびフォームフォーカス保護ガード付き）。全34テスト・型検査・Biome合格。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-10 11:56
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 白枠解消、背景透明、波紋色、エクスポート波紋停止、HUD背番号削除、個別ラベル・背景切替、一括更新、D/F/Rショートカット
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の決定論的Konva描画、ボード/レイアウト共通状態、入力フォーム保護
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Store Provider API経由での操作、Level 2純粋性
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン整理、SLAP/Shell Purity遵守、既存ホットキー（Mod+D等）との非干渉
- **Summary**: 全9項目の要件および4大定性監査（Invariants保護、決定論的Konva描画、ホスト境界、SLAP分割）を完全に満たしています。テストケースもConcrete Valuesに基づき網羅されており問題ありません。

## 6. Rejections / Additional Tasks (不可逆修正欄)
