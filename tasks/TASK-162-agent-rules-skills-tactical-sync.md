# TASK-162: エージェント層のルール・スキル・ベースラインの最新tactical仕様同期

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-06
- **Target Files**:
  - `.agents/guardrails-baseline.json` (MODIFY)
  - `.agents/rules/component-architecture.md` (MODIFY)
  - `.agents/rules/coding-standards.md` (MODIFY)
  - `.agents/skills/react-konva/SKILL.md` (MODIFY)
  - `.agents/skills/cross-platform-component-design/SKILL.md` (MODIFY)
  - `.agents/skills/zustand/SKILL.md` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `.agents/guardrails-baseline.json` から、TASK-161 等で既に削除されたファイル（`tacticalSingleton` 4件、`pascalCaseComponents` 3件）が除去され、`bun test ./.agents` および `bun run ai:check` が PASS すること。
- [x] 2. `.agents/rules/component-architecture.md` の Level 2 代表ファイルから削除済みの `AnnotationLayer.tsx` が除去されて `PitchGroundLayer.tsx`, `BillboardObjectLayer.tsx` に更新され、`tacticalSingleton` 凍結ファイル数表記（`57ファイル`）および 4層単一座標系（`16:9` スクリーン `0〜100`）の記述が同期されていること。
- [x] 3. `.agents/rules/coding-standards.md` Section 9（Konva.js 利用時の制約）が、`16:9` スクリーン単一座標系（`0〜100`）および正規幾何ファイル（`src/lib/tactical/pitch-geometry.ts`, `src/features/tactical-unified/core/utils/canvas-screen-coordinates.ts`, `src/features/tactical-unified/core/utils/geometry.ts`）に更新されていること。
- [x] 4. `.agents/skills/react-konva/SKILL.md` Section 4・Section 6 が、TASK-154〜161 で確立した「4層単一座標系アーキテクチャ（第1層 `16:9` スクリーン `0〜100`、第2層 `calculatePitchRect` / `getScreenOuterPitchRect` / `getScreenPitchBounds` サブピッチ＋3D投影、第3層 `TacticalPhase.boundaryBox` クロップ、第4層 `getFormationActualPos` / `transformCoord`）」および純粋プレビューレンダラー（`renderDrawingPreviewNode`）に更新されていること。
- [x] 5. `.agents/skills/cross-platform-component-design/SKILL.md` Section 3 の `React.forwardRef` サンプルコードが、React 19 標準の `ref?: React.Ref<CanvasCoreHandle>` prop 形式に修正され、`coding-standards.md` R2（Biome `noReactForwardRef: "error"`）との自己矛盾が解消されていること。
- [x] 6. `.agents/skills/zustand/SKILL.md` が、`CanvasStoreProvider`（`useCanvasStore`）による Store Provider パターンと、フェーズ単位セレクタ（`selectActivePhaseAspectRatio`, `selectActivePhaseBoundaryBox`）および R4 シングルトン直接参照遮断ルールと整合するよう更新されていること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **現時点の実装仕様を「唯一の真実」として記述すること**: 旧3段階座標系や削除済みファイル（`AnnotationLayer.tsx`, `BallLayer.tsx`, `PlayerLayer.tsx`, `pitch-stage-mapping.ts`, `utils/geometry.ts`, `tactical-geometry-helpers.ts`）を推奨パターンとして残してはならない（後続タスクで Worker が存在しないファイルを import したり旧座標系で実装するのを防ぐため）。
  2. **ガードレール検査の完全維持**: `.agents/guardrails-baseline.json` から現存する正当な凍結ファイルまで誤って削除してはならない（`code-guardrails` 検査がエラーになるのを防ぐため）。
  3. **React 19 `ref` prop 規約の一貫性**: すべてのルール・スキル文書において `React.forwardRef` を推奨コードとして使用してはならない（Biome `noReactForwardRef: "error"` との矛盾を防ぐため）。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `.agents/scripts/lib/code-guardrails.ts` & `.agents/scripts/__tests__/code-guardrails.test.ts` — `.agents/guardrails-baseline.json` を読み込んでガードレール検証を実行するスクリプト・テストが正常に PASS すること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 `.agents/guardrails-baseline.json` から削除すべきエントリ一覧
```json
// 1. "tacticalSingleton" 配列から以下の4行を削除:
    "src/features/tactical-unified/adapters/adapter-clipboard-helpers.ts",
    "src/features/tactical-unified/hooks/konva-video-export-helper.ts",
    "src/features/tactical-unified/hooks/use-konva-export.ts",
    "src/features/tactical-unified/hooks/use-konva-video-export.ts",

// 2. "pascalCaseComponents" 配列から以下の3行を削除:
    "src/features/tactical-unified/core/components/AnnotationLayer.tsx",
    "src/features/tactical-unified/core/components/BallLayer.tsx",
    "src/features/tactical-unified/core/components/PlayerLayer.tsx",
```

### 3.2 `.agents/skills/cross-platform-component-design/SKILL.md` Section 3 の React 19 `ref` prop 置換パターン
```tsx
// 1. Ref インターフェースの定義
export interface CanvasCoreHandle {
  exportPng: (opts?: ExportOptions) => Promise<string>;
  copyToClipboard: (opts?: ExportOptions) => Promise<void>;
  undo: () => void;
  redo: () => void;
}

export interface CanvasStageProps {
  ref?: React.Ref<CanvasCoreHandle>;
}

// 2. コンポーネント側での実装（React 19 ref prop — forwardRef は使用禁止）
export function CanvasStageContainer({ ref, ...props }: CanvasStageProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const { undo, redo } = useCanvasActions();

  useImperativeHandle(ref, () => ({
    exportPng: async (opts) => {
      const stage = stageRef.current;
      if (!stage) throw new Error('Stage not ready');
      return stage.toDataURL({ pixelRatio: opts?.pixelRatio ?? 2 });
    },
    copyToClipboard: async (opts) => {
      // クリップボードコピー処理
    },
    undo,
    redo,
  }));

  return <Stage ref={stageRef} {...props} />;
}
```

### 3.3 4層単一座標系と正規ユーティリティの契約（`coding-standards.md` / `react-konva/SKILL.md` 用）
```ts
// 1. ピッチ矩形・スクリーン内境界計算（src/lib/tactical/pitch-geometry.ts）
import {
  calculatePitchRect,
  getScreenOuterPitchRect,
  getScreenPitchBounds,
} from '@/lib/tactical/pitch-geometry';

// 2. 3Dパース投影・スクリーン座標変換（src/features/tactical-unified/core/utils/canvas-screen-coordinates.ts）
import {
  DEFAULT_PITCH_PERSPECTIVE,
  screenToWorld,
  worldToScreen,
} from '@/features/tactical-unified/core/utils/canvas-screen-coordinates';

// 3. 幾何判定・境界線ピクセル矩形・ポインタ正規化（src/features/tactical-unified/core/utils/geometry.ts）
import {
  distToSegment,
  isPointInPolygon,
  pointerToNormalizedCoord,
  resolveBoundaryBoxPixelRect,
} from '@/features/tactical-unified/core/utils/geometry';
```

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: ガードレールベースラインと Rules（component-architecture / coding-standards）の同期
- **Worker Model**: `flash`
- **対象ファイル**:
  - `.agents/guardrails-baseline.json`
  - `.agents/rules/component-architecture.md`
  - `.agents/rules/coding-standards.md`
- **契約 (Exact Contract & Formula)**:
  1. `.agents/guardrails-baseline.json`:
     - `tacticalSingleton` から `"src/features/tactical-unified/adapters/adapter-clipboard-helpers.ts"`, `"src/features/tactical-unified/hooks/konva-video-export-helper.ts"`, `"src/features/tactical-unified/hooks/use-konva-export.ts"`, `"src/features/tactical-unified/hooks/use-konva-video-export.ts"` の 4 行を削除する（残り 57 件）。
     - `pascalCaseComponents` から `"src/features/tactical-unified/core/components/AnnotationLayer.tsx"`, `"src/features/tactical-unified/core/components/BallLayer.tsx"`, `"src/features/tactical-unified/core/components/PlayerLayer.tsx"` の 3 行を削除する。
  2. `.agents/rules/component-architecture.md`:
     - L21（Level 2 Domain UI Block の代表ファイル）の `` `CanvasStageContainer.tsx`, `CoreDrawingToolbar.tsx`, `AnnotationLayer.tsx`, `MemoOverlayView.tsx` `` を `` `CanvasStageContainer.tsx`, `CoreDrawingToolbar.tsx`, `PitchGroundLayer.tsx`, `BillboardObjectLayer.tsx`, `MemoOverlayView.tsx` `` に変更する。
     - L93（`tactical-unified` Web パネル・フック群の凍結ファイル数表記）の `43ファイル` / `既存の 43 ファイル` を `57ファイル` / `既存の 57 ファイル` に更新する。
     - L135-136（Section 5.4）を以下の内容に更新する:
       `4. **16:9 スクリーン単一座標系（0〜100）と投影座標（Screen Space）の分離**: 永続化データは常に第1層 16:9 スクリーン全体の単一座標（0〜100）で管理し、サブピッチ矩形計算（src/lib/tactical/pitch-geometry.ts）、3D・スクリーン投影（src/features/tactical-unified/core/utils/canvas-screen-coordinates.ts）、境界線・幾何変換（src/features/tactical-unified/core/utils/geometry.ts）を経由してください。`
  3. `.agents/rules/coding-standards.md`:
     - L209（Section 9 の仮想キャンバス座標系項目）を以下の内容に更新する:
       `- **4層単一座標系（16:9 スクリーン 0〜100）**: 全画面の第1層スクリーン外枠は 16:9 固定とし、永続化データは常に 16:9 スクリーン全体の単一論理座標（0〜100）で管理します（選手・ボールは [0, 100] クランプ、矢印・ゾーン・テキストは範囲外配置可）。ピッチ枠計算は src/lib/tactical/pitch-geometry.ts（calculatePitchRect / getScreenOuterPitchRect / getScreenPitchBounds）、3D・スクリーン投影は src/features/tactical-unified/core/utils/canvas-screen-coordinates.ts（worldToScreen / screenToWorld）、幾何判定・境界線変換は src/features/tactical-unified/core/utils/geometry.ts（resolveBoundaryBoxPixelRect / pointerToNormalizedCoord / isPointInPolygon / distToSegment）に一本化してください。`
- **Testing Strategy (Concrete Test Values)**:
  - `bun test ./.agents/scripts/__tests__/code-guardrails.test.ts` を実行し、全テストが PASS すること。
  - `.agents/guardrails-baseline.json` の `tacticalSingleton` 配列長が `57` であり、削除済み 7 ファイルが含まれていないこと。
- **Tasks**:
  - [x] 1. `.agents/guardrails-baseline.json`, `.agents/rules/component-architecture.md`, `.agents/rules/coding-standards.md` を更新 ➔ `bun test ./.agents/scripts/__tests__/code-guardrails.test.ts` PASS
- **Worker Handoff Log**:
  - baseline から削除済み7件（tacticalSingleton 4件, pascalCaseComponents 3件）を除去（tacticalSingleton残り57件）。
  - component-architecture.md と coding-standards.md に PitchGroundLayer/BillboardObjectLayer、57ファイル凍結、4層単一座標系（16:9 スクリーン 0〜100）および正規幾何ファイルパスを同期完了。全194件のエージェントテスト PASS。

---

### Phase 2: Skills（react-konva / cross-platform-component-design / zustand）の最新化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `.agents/skills/react-konva/SKILL.md`
  - `.agents/skills/cross-platform-component-design/SKILL.md`
  - `.agents/skills/zustand/SKILL.md`
- **契約 (Exact Contract & Formula)**:
  1. `.agents/skills/react-konva/SKILL.md`:
     - Section 4（5層レイヤー分離）の 3 (`InteractionPreviewLayer`) に、作図中プレビュー図形は `DrawingPreviewLayer.tsx` の純粋レンダラー関数（`renderDrawingPreviewNode`, `PREVIEW_SHAPE_RENDERERS`）を呼び出して描画する構造であることを明記し、4 (`ViewportCropOverlay` / `BoundaryBoxOverlay`) に `TacticalPhase` 単位の `boundaryBox`（`16:9` スクリーン `0..100` 基準）を描画することを明記する。
     - Section 6 を旧「3段階の単一座標変換パイプライン」から「**4層単一座標系アーキテクチャと投影パイプライン (4-Layer Single Coordinate & Projection Pipeline)**」へ全面改訂し、以下の4層契約を明記する:
       1. **第1層: スクリーン外枠（`16:9` 固定・`X: 0〜100, Y: 0〜100` 単一論理座標）**: 全画面（ボード・レイアウト・エクスポート）の基準外枠は `16:9`（1920×1080）固定とし、ストアに保存される全座標は `16:9` スクリーン全体の `0〜100` とする。選手・ボールは `[0, 100]` にクランプされ、矢印・ゾーン・テキストは `pointerToNormalizedCoord(pos, vRect, { allowOverflow: true })` により `0〜100` 外への配置も許容する。
       2. **第2層: 中央配置サブピッチと3D投影（`pitch-geometry.ts` & `canvas-screen-coordinates.ts`）**: `16:9` スクリーン中央にアクティブフェーズの `aspectRatio`（`'16:9' | '4:5' | '9:16' | '1:1'`）のサブピッチ（`calculatePitchRect` / `getScreenOuterPitchRect` / `getScreenPitchBounds`）を内接配置する。3D視点投影およびスクリーン変換は `canvas-screen-coordinates.ts`（`worldToScreen` / `screenToWorld`, `DEFAULT_PITCH_PERSPECTIVE = 1200`）を通し、縦向きピッチの3D二重スケーリングを防止する。
       3. **第3層: フェーズ単位の境界線クロップ（`TacticalPhase.boundaryBox`）**: `aspectRatio` と `boundaryBox` は `TacticalPhase` 単位で独立保持し（`selectActivePhaseAspectRatio` / `selectActivePhaseBoundaryBox` で購読）、比率切替（`setAspectRatio`）は `boundaryBox` を一切書き換えない。レイアウト画面・エクスポート画面は第1層＋第2層を `16:9`（1920×1080）で正規描画した上で、`boundaryBox`（`resolveBoundaryBoxPixelRect`）の内側領域をクロップ出力する。
       4. **第4層: フォーメーション配置と比率変換（`getFormationActualPos` / `transformCoord`）**: Full/Half コートモードおよびピッチの向き（`'16:9'`=横: Home左/Away右、`'9:16' | '4:5' | '1:1'`=縦: Home下/Away上）に基づき、`getScreenPitchBounds(aspectRatio)` 基準で単一変換を行う。ベンチ配置選手も含め選手マーカー写真は `PlayerPhotoContext`（`player-photo-resolver.ts`）で解決する。
  2. `.agents/skills/cross-platform-component-design/SKILL.md`:
     - Section 3（L284-320: Imperative Ref API 契約）の説明文とコード例から `forwardRef` / `React.forwardRef` を完全撤去し、Context Snippets 3.2 の通り React 19 標準の `ref?: React.Ref<CanvasCoreHandle>` prop と `useImperativeHandle` を使った関数宣言（`export function CanvasStageContainer({ ref, ...props }: CanvasStageProps)`）に書き換える。
  3. `.agents/skills/zustand/SKILL.md`:
     - Section 1・Section 3・Section 5 を更新し、以下の現行アーキテクチャを明記する:
       - 共用キャンバスコア（`src/features/tactical-unified/core/`）では Vanilla Store Factory（`createCanvasStore`）+ `CanvasStoreProvider`（`useCanvasStore`）による Store Provider パターンが標準であり、`core/` 配下および新規ファイルでのシングルトン `useTacticalUnifiedStore` 直接参照はガードレール（R4）でエラー遮断されること。
       - Web ストア側では `TacticalPhase` 単位の `aspectRatio` / `boundaryBox` などを `tactical-unified-selectors.ts` の純粋セレクタ（`selectActivePhaseAspectRatio`, `selectActivePhaseBoundaryBox`, `selectActiveSlide` 等）経由で購読すること。
- **Testing Strategy (Concrete Test Values)**:
  - `rtk grep 'forwardRef' .agents/skills/` の結果が 0 件であること。
  - `bun test ./.agents` が exit code 0 で PASS すること。
- **Tasks**:
  - [x] 1. `.agents/skills/react-konva/SKILL.md`, `.agents/skills/cross-platform-component-design/SKILL.md`, `.agents/skills/zustand/SKILL.md` を更新 ➔ `bun test ./.agents` PASS
- **Worker Handoff Log**:
  - react-konva/SKILL.md: Section 4 に純粋描画 PreviewLayer（renderDrawingPreviewNode / PREVIEW_SHAPE_RENDERERS）および TacticalPhase 単位の boundaryBox を明記。Section 6 を 4層単一座標系アーキテクチャ（16:9 0..100、サブピッチ3D投影、フェーズ単位境界線クロップ、フォーメーション比率変換）に全面改訂。
  - cross-platform-component-design/SKILL.md: Section 3 の Imperative Ref 契約から forwardRef を完全撤去し React 19 ref prop 形式に更新（grep 0件達成）。
  - zustand/SKILL.md: Section 1/3/5 に CanvasStoreProvider / useCanvasStore の Store Provider 規約、R4 シングルトン遮断ルール、純粋セレクタ（selectActivePhaseAspectRatio 等）経由購読を明記。bun test ./.agents 全194テスト PASS。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-06 04:35
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  削除済みファイルのベースライン除去、4層単一座標系モデル（16:9 スクリーン 0〜100、サブピッチ3D投影、フェーズ単位境界線クロップ、フォーメーション比率変換）の記述同期、React 19 ref prop 規約準拠、Store Provider 規約および R4 ガードのルール・スキルへの明文化を完全確認。不変条件を遵守し全受入要件を満たしているため LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
