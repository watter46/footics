---
id: L1-Extension-204
emoji: ⏸️
title: メモオーバーレイ開閉時の動画自動一時停止/再開オプション
status: TODO
depends_on: []
model: Gemini 3.7 Flash
effort: low
context_files:
  - extension/features/memo-overlay/components/overlay-app.tsx
  - extension/features/memo-overlay/stores/use-overlay-store.ts
  - extension/features/capture/drm-capture-engine.ts
  - extension/entrypoints/overlay.content.tsx
---

# ⏸️ L1-Extension-204: メモオーバーレイ開閉時の動画自動一時停止/再開オプション

## UX Impact
`Alt+W` / `Alt+E` でメモオーバーレイを開いた瞬間に動画が自動一時停止し、保存/閉鎖時に自動再開することで、メモ入力と動画視聴の切り替えがシームレスになる。

## Detailed Spec
1. `extension/utils/video-controller.ts` を新規作成：`pauseVideoIfPlaying(video: HTMLVideoElement): boolean` と `resumeVideoIfWasPaused(video: HTMLVideoElement, wasPaused: boolean): void` を実装（was-paused フラグを返して管理）。
2. `overlay-app.tsx` の `open()` 呼び出し前に `findVideoElement()` で動画を探し、`pauseVideoIfPlaying()` を実行。戻り値 (wasPaused フラグ) を `useRef` で保持。
3. `isVisible === false` になった `useEffect` で `resumeVideoIfWasPaused()` を呼び出す。フォーカス復元ロジックと同じ useEffect 内に組み込む。
4. `useOverlayStore` に `autoPauseVideo: boolean` 設定フラグを追加し、デフォルト `true`。`browser.storage.local` で永続化して次回起動時も維持。

## Acceptance Criteria & Verification Commands
- [ ] オーバーレイを開いた際に再生中の動画が自動停止すること
- [ ] オーバーレイを閉じた際に停止前まで再生中だった動画が再開すること
- [ ] 最初から停止中だった動画は閉時に再生されないこと
- [ ] `autoPauseVideo: false` 設定時は自動停止しないこと

### Verification
```
rtk biome check extension/features/memo-overlay/
rtk biome check extension/utils/
rtk pnpm --filter footics-extension type-check
```
