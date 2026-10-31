# TASK-124: tactical-json-import-resilience

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-01
- **Target Files**:
  - `src/lib/types/tactical/annotations.ts` (MODIFY)
  - `src/lib/types/tactical/project.ts` (MODIFY)
  - `src/lib/types/tactical/slide.ts` (MODIFY)
  - `src/lib/types/tactical/player.ts` (MODIFY)
  - `src/lib/db/tactical-projects-import.ts` (MODIFY)
  - `src/lib/db/__tests__/tactical-projects-import.test.ts` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `TextAnnotationSchema.content` の上限を 10,000 文字に緩和し、実戦的な長文戦術メモを許容する
- [x] 2. `TacticalProjectSchema.title` を 500 文字、`TacticalPhaseSchema.name` / `SlideSchema.label` / `ArrowAnnotationSchema.label` / `ZoneAnnotationSchema.label` を 200 文字、`PlayerBadgeSchema.label` を 100 文字に緩和する
- [x] 3. `transitionDurationMs` を 30,000ms、`pauseMs` を 10,000ms、`cameraDurationMs` を 60,000ms に緩和する
- [x] 4. `VisionConeSchema.angleRad` に `max(Math.PI * 2 + 0.1)` を設定し、浮動小数点計算の丸め誤差を許容する
- [x] 5. `importTacticalProjectFromJson` でパース前にサニタイズ（1万文字超のテキストや上限超の文字列を末尾切り詰め）を実施し、読み込みを必ず完遂させる
- [x] 6. スキーマ検証エラー時に `issues.map(i => `${i.path.join('.') || 'root'}: ${i.message}`).join(', ')` により原因フィールドパスを明示する
- [x] 7. インポート完了後のプロジェクトに `attachProjectSlidesGetter` を適用し、`project.slides` が正常に取得できることを保証する
- [x] 8. `src/lib/db/__tests__/tactical-projects-import.test.ts` で長文テキスト・上限切り詰め・詳細エラー表示・`slides` getter 取得をテストし PASS する

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { attachProjectSlidesGetter } from '@/lib/types/tactical/project';
import { type TacticalProject, TacticalProjectSchema } from '@/lib/types/tactical-unified';
import { saveTacticalProject } from './tactical-projects-db';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/types/tactical/annotations.ts
export const TextAnnotationSchema = z.object({
  content: z.string().max(10000), // 200 -> 10000
  fontSize: z.number().min(8).max(120).default(16),
  // ...
});

// src/lib/types/tactical/player.ts
export const VisionConeSchema = z.object({
  angleRad: z.number().min(0).max(Math.PI * 2 + 0.1), // 浮動小数点誤差許容
  // ...
});
```

### 3.3 Implementation Notes & Gotchas
```ts
// サニタイズ関数 sanitizeTacticalProjectForImport(raw: unknown): unknown
// raw がオブジェクトかつ phases 配列を持つ場合、各 phase の slides[].texts[].content が 10000 文字を超えていたら slice(0, 10000) する。
// title は 500 文字で slice(0, 500) する。
// インポート処理の最後に attachProjectSlidesGetter(importedProject) を呼び出して slides getter を付与する。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 戦術ボード Zod スキーマの上限値緩和
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical/annotations.ts`
  - `src/lib/types/tactical/project.ts`
  - `src/lib/types/tactical/slide.ts`
  - `src/lib/types/tactical/player.ts`
- **契約 (Interface)**:
  - `TextAnnotationSchema.content`: `max(10000)`
  - `TacticalProjectSchema.title`: `max(500)`
  - `TacticalPhaseSchema.name`: `max(200)`
  - `SlideSchema.label`: `max(200)`
  - `ArrowAnnotationSchema.label`: `max(200)`
  - `ZoneAnnotationSchema.label`: `max(200)`
  - `PlayerBadgeSchema.label`: `max(100)`
  - `transitionDurationMs`: `max(30000)`
  - `pauseMs`: `max(10000)`
  - `cameraDurationMs`: `max(60000)`
  - `VisionConeSchema.angleRad`: `max(Math.PI * 2 + 0.1)`
- **Testing Strategy**: `src/lib/types/__tests__/tactical-unified.test.ts`
- **Tasks**:
  - [x] 1. スキーマの上限値を緩和
  - [x] 2. `bun run ai:check src/lib/types/tactical/annotations.ts src/lib/types/tactical/project.ts src/lib/types/tactical/slide.ts src/lib/types/tactical/player.ts` PASS 確認
- **Worker Handoff Log**:
  - annotations/project/slide/player の文字数・時間・角度上限を緩和。既存テストおよび ai:check PASS。

---

### Phase 2: インポート処理のサニタイズ・エラー詳細化・単体テスト
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/db/tactical-projects-import.ts`
  - `src/lib/db/__tests__/tactical-projects-import.test.ts` (NEW)
- **契約 (Interface)**:
  ```ts
  export function sanitizeTacticalProjectForImport(raw: unknown): unknown;
  export async function importTacticalProjectFromJson(file: File, assignNewId?: boolean): Promise<TacticalProject>;
  export async function importMultipleTacticalProjects(files: FileList | File[]): Promise<{ imported: TacticalProject[]; errors: string[] }>;
  ```
- **Testing Strategy**:
  - `src/lib/db/__tests__/tactical-projects-import.test.ts`:
    - 200文字超〜1万文字以内のテキストを含む JSON が正常にインポートできること
    - 1万文字を超えるテキストが安全に 10,000 文字に切り詰められてインポート成功すること
    - 不正な JSON 構造（必須項目欠落）でパス付きのエラーメッセージが返ること
    - インポートされたオブジェクトで `project.slides` が正常に取得できること
- **Tasks**:
  - [x] 1. TDD テスト作成（RED）: `rtk vitest run src/lib/db/__tests__/tactical-projects-import.test.ts`
  - [x] 2. 実装: `sanitizeTacticalProjectForImport` を実装し、インポート処理に組み込み、エラーメッセージを詳細化し、`attachProjectSlidesGetter` を適用
  - [x] 3. スコープ検証: `bun run ai:check src/lib/db/tactical-projects-import.ts src/lib/db/__tests__/tactical-projects-import.test.ts` PASS 確認
- **Worker Handoff Log**:
  - `sanitizeTacticalProjectForImport` を実装し、長文テキスト/ラベル切り詰めおよび時間・角度クランプを完備。Zod パースエラー時のフィールドパス詳細化と `attachProjectSlidesGetter` を適用。単体テスト全 8 件 PASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-01 07:51
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  テキスト・ラベル・時間・角度の上限緩和、インポート前の安全なサニタイズ（切り詰め・クランプ）、詳細エラーパス生成、および attachProjectSlidesGetter の付与が規律正しく実装され、包括的なテストで検証されていることを確認。4大定性監査オールクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
