# TASK-078: [Level 2-A] Ctrl+Enter メモ保存および Overlay ショートカット認識の根本修正

## 1. Metadata
- **Status**: `IN_REVIEW`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/features/memo-overlay/hooks/useMemoOverlayEventBridge.ts` (MODIFY)
  - `src/features/memo-overlay/hooks/__tests__/useMemoOverlayEventBridge.test.ts` (MODIFY)
  - `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts` (MODIFY)
  - `extension/features/memo-overlay/__tests__/quick-tag-bar.test.tsx` (MODIFY)
  - `extension/features/memo-overlay/components/overlay-app.tsx` (MODIFY)
  - `extension/entrypoints/overlay.content.tsx` (MODIFY)
  - `extension/features/memo-overlay/components/QuickTagBar.tsx` (MODIFY)
  - `extension/features/memo-overlay/stores/use-overlay-store.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `src/features/memo-overlay/hooks/useMemoOverlayEventBridge.ts`:
  - `window.addEventListener('message', handleMessage)` リスナーを追加し、`FOOTICS_ACTION` 受信時に `EVENT_BRIDGE_HANDLERS` の対応ハンドラ（`SAVE_MEMO`, `CLOSE_OVERLAY`, `NEXT_PHASE`, `PREV_PHASE` 等）を呼び出す。
  - 後方互換性のため、既存の `footics-action` CustomEvent リスナーも維持する。
  - クリーンアップ関数で `removeEventListener('message', handleMessage)` を確実に実行する。
- [x] 2. `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts`:
  - `hotkeys-js` のバブリング依存を撤廃し、`window.addEventListener('keydown', handleKeyDown, { capture: true })` 駆動へ刷新する。
  - Shadow DOM 内での `stopPropagation` に阻まれず、以下のキー操作を確実に捕捉して `window.postMessage` を発火する:
    - `Ctrl+Enter` / `Cmd+Enter`: `{ type: 'FOOTICS_ACTION', action: 'SAVE_MEMO' }`
    - `Escape`: `{ type: 'FOOTICS_ACTION', action: 'CLOSE_OVERLAY' }`
    - `Alt+M` (または `Alt+m`): `{ type: 'FOOTICS_ACTION', action: 'TOGGLE_DISPLAY_MODE' }`
    - `Alt+S` (または `Alt+s`): `{ type: 'FOOTICS_TRIGGER_CAPTURE' }`
    - 数字キー `1`〜`4`: `isInputFocused`（`e.composedPath ? e.composedPath()[0] : e.target` による判定）が false かつ修飾キーなしの場合に、EVENT モードのクイックタグをトグル。
  - 送信時の `targetOrigin` は `'*'` を使用し、オリジン不一致による破棄を根絶する。
  - クリーンアップ関数で `removeEventListener('keydown', handleKeyDown, { capture: true })` を確実に実行する。
- [x] 3. `extension/features/memo-overlay/components/overlay-app.tsx`:
  - `message` イベントリスナーを追加し、`FOOTICS_ACTION` で `action === 'TOGGLE_DISPLAY_MODE'` 受信時に `useOverlayStore.getState().toggleDisplayMode()` を呼び出す（CustomEvent 後方互換も維持）。
- [x] 4. `extension/entrypoints/overlay.content.tsx`:
  - `message` イベントリスナーを追加し、`type === 'FOOTICS_TRIGGER_CAPTURE'` 受信時に `CaptureService.executeCapturePipeline()` を実行する（CustomEvent 後方互換も維持）。
- [x] 5. 単体テスト:
  - `src/features/memo-overlay/hooks/__tests__/useMemoOverlayEventBridge.test.ts` に postMessage による `SAVE_MEMO` / `CLOSE_OVERLAY` 等の受信テストを追加し PASS すること。
  - `extension/features/memo-overlay/__tests__/quick-tag-bar.test.tsx` のテストがすべて PASS すること。
  - `bun run ai:check` が全項目 PASS すること。

## 3. Context Snippets (参照コード・型定義)

### 3.1 useMemoOverlayEventBridge.ts 実装パターン
```ts
export function useMemoOverlayEventBridge(
  onClose: () => void,
  onSave: () => void,
  onOpen?: EventBridgeContext['onOpen'],
  isActive = true,
) {
  useEffect(() => {
    const handleAction = (action: string, detail?: FooticsActionDetail) => {
      const isToggleAction =
        action === 'TOGGLE_MATCH_MEMO' ||
        action === 'TOGGLE_EVENT_MEMO';
      if (!isActive && !isToggleAction) return;

      const handler = EVENT_BRIDGE_HANDLERS[action];
      if (handler) {
        const store = useMemoOverlayStore.getState();
        handler(detail ?? { action }, { onClose, onSave, onOpen, store });
      }
    };

    const handleMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'FOOTICS_ACTION' && typeof data.action === 'string') {
        handleAction(data.action, data.payload ?? data.detail ?? { action: data.action });
      } else if (
        data.type === 'footics-action' &&
        typeof data.detail?.action === 'string'
      ) {
        handleAction(data.detail.action, data.detail);
      }
    };

    const handleFooticsAction = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | FooticsActionDetail
        | undefined;
      if (!detail?.action) return;
      handleAction(detail.action, detail);
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('footics-action', handleFooticsAction);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('footics-action', handleFooticsAction);
    };
  }, [onClose, onSave, onOpen, isActive]);
}
```

### 3.2 use-overlay-shortcut-interceptor.ts 実装パターン
```ts
export function useOverlayShortcutInterceptor() {
  useEffect(() => {
    const isInputFocused = (e: KeyboardEvent) => {
      const target = (e.composedPath ? e.composedPath()[0] : e.target) as HTMLElement | null;
      return (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: オーバーレイを閉じる
      if (e.key === 'Escape') {
        e.preventDefault();
        window.postMessage({ type: 'FOOTICS_ACTION', action: 'CLOSE_OVERLAY' }, '*');
        return;
      }

      // Ctrl+Enter / Cmd+Enter: メモ保存
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        window.postMessage({ type: 'FOOTICS_ACTION', action: 'SAVE_MEMO' }, '*');
        return;
      }

      // Alt+M: 表示モード切替
      if (e.altKey && (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')) {
        e.preventDefault();
        window.postMessage({ type: 'FOOTICS_ACTION', action: 'TOGGLE_DISPLAY_MODE' }, '*');
        return;
      }

      // Alt+S: キャプチャトリガー
      if (e.altKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
        e.preventDefault();
        window.postMessage({ type: 'FOOTICS_TRIGGER_CAPTURE' }, '*');
        return;
      }

      // 数字キー (1〜4) によるタグクイック選択
      if (!isInputFocused(e) && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        const matchingTag = QUICK_TAGS.find((tag) => tag.shortcut === e.key);
        if (matchingTag) {
          const overlayState = useOverlayStore.getState();
          if (overlayState.isVisible && overlayState.mode === 'EVENT') {
            e.preventDefault();
            const memoStore = useMemoOverlayStore.getState();
            const currentLabels = memoStore.selectedLabels;
            if (currentLabels.includes(matchingTag.label)) {
              memoStore.setSelectedLabels(
                currentLabels.filter((l) => l !== matchingTag.label),
              );
            } else {
              memoStore.addLabel(matchingTag.label);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: TDD 実装と検証
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/memo-overlay/hooks/useMemoOverlayEventBridge.ts`
  - `src/features/memo-overlay/hooks/__tests__/useMemoOverlayEventBridge.test.ts`
  - `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts`
  - `extension/features/memo-overlay/__tests__/quick-tag-bar.test.tsx`
  - `extension/features/memo-overlay/components/overlay-app.tsx`
  - `extension/entrypoints/overlay.content.tsx`
- **契約**:
  - `useMemoOverlayEventBridge.ts` が 60行以内のクリーンな設計を維持すること。
  - `use-overlay-shortcut-interceptor.ts` は `{ capture: true }` でイベントを拾うこと。
  - `bun run ai:check` が PASS すること。
  - `bun test extension/features/memo-overlay/__tests__/quick-tag-bar.test.tsx` が PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `src/features/memo-overlay/hooks/__tests__/useMemoOverlayEventBridge.test.ts` に postMessage テスト追加
  - [x] 2. `useMemoOverlayEventBridge.ts` を postMessage 対応に更新
  - [x] 3. `use-overlay-shortcut-interceptor.ts` を capture: true 方式へ刷新し、`targetOrigin: '*'` に統一
  - [x] 4. `overlay-app.tsx` および `overlay.content.tsx` を postMessage 対応に更新
  - [x] 5. `quick-tag-bar.test.tsx` のテスト動作確認と検証
  - [x] 6. `bun run ai:check` PASS
- **Worker Handoff Log**: postMessageによるFOOTICS_ACTIONとCustomEventを両立し、capture: trueで確実にショートカット捕捉

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 
- **Decision**: `PENDING`
- **Audit Checklist**:
  - [ ] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、既存テストの後方互換維持
  - [ ] 2. ホスト境界 & Store Provider: ホスト依存混入なし、Flicker防止
  - [ ] 3. 設計負債 & 拡張性: capture方式への刷新、60行制限の遵守
  - [ ] 4. サイレント破壊 & 既存保護: 既存CustomEvent後方互換維持
- **Summary**: 

## 6. Rejections / Additional Tasks (不可逆修正欄)
