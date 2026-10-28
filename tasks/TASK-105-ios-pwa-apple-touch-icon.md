# TASK-105: iOS ホーム画面追加用アイコン設定（PWA / Web Clip）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-29
- **Target Files**:
  - `public/apple-touch-icon.png` (ADD)
  - `public/logo.png` (ADD)
  - `public/favicon.ico` (ADD)
  - `src/app/layout.tsx` (MODIFY)
  - `src/app/manifest.ts` (MODIFY)
  - `src/app/__tests__/manifest-and-metadata.test.ts` (ADD)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **iOS Web Clip 用アイコン配置**:
  - `public/apple-touch-icon.png` (180x180) を配置。
  - `public/logo.png`, `public/favicon.ico` を配置。
- [x] 2. **Next.js Metadata 登録**:
  - `src/app/layout.tsx` の `metadata.icons` に `apple` および `icon` を登録。
- [x] 3. **Manifest アイコン整合性確保**:
  - `src/app/manifest.ts` に `/apple-touch-icon.png` を追加し、Next.js metadata と整合。
- [x] 4. **単体テストと検証**:
  - `src/app/__tests__/manifest-and-metadata.test.ts` で全テストが PASS すること。

## 3. Context Snippets (型定義・既存コード・設計原則)
```typescript
// layout.tsx
export const metadata: Metadata = {
  // ...
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};
```

## 4. Implementation Phases

### Phase 1: アイコン配置と metadata / manifest 設定
- **Worker Model**: `flash`
- **対象ファイル**:
  - `public/apple-touch-icon.png`
  - `public/logo.png`
  - `public/favicon.ico`
  - `src/app/layout.tsx`
  - `src/app/manifest.ts`
  - `src/app/__tests__/manifest-and-metadata.test.ts`
- **Tasks**:
  - [x] 1. アイコンファイルを `public/` に配置
  - [x] 2. `layout.tsx` と `manifest.ts` を更新
  - [x] 3. 単体テスト作成（RED → GREEN）
  - [x] 4. 検証実行（`bun run ai:check` PASS）
- **Worker Handoff Log**:
  - `public/` へのアイコン配置および `layout.tsx` / `manifest.ts` への apple-touch-icon 登録完了。単体テスト全3件PASS。

---

## 5. Reviewer Assessment (コード差分監査基準)
- **Reviewer Model**: `pro`
- **Decision**: `LGTM`
- **Reviewed At**: 2026-10-29 01:09
- **Summary**: iOS ホーム画面追加用アイコンおよび manifest.ts / metadata.icons の整合性が正しく確保されていることを確認。
- **Audit Checklist**:
  - [x] 1. **要件合致**: apple-touch-icon (180x180) が配置され、HTML/manifest に設定されているか。
  - [x] 2. **既存機能無欠陥**: favicon や Next.js アプリケーションのビルド・起動に問題がないか。
