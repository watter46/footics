# Overlay Shortcuts & Focus Management (ショートカットとフォーカス制御)

## 概要
動画プレイヤー（DAZNやYouTube等）やWebアプリケーション上で拡張機能のオーバーレイを表示する際、キーボードショートカット（`Escape`、`Alt+1~5` 等）と、入力フィールド（数字入力やテキストエリア）での文字入力が競合する問題を解決するための標準パターンです。

## 基本方針 (Rules)

1. **グローバルショートカットの登録は最小限にする**
   - 画面全体で有効にしたいショートカット（例: `Escape`で閉じる、`Ctrl+Enter`で保存）は、`hotkeys-js` (`useKeyboardShortcut`, `useOverlayShortcutInterceptor`) を通じて登録します。
   - `hotkeys-js` のデフォルト挙動により、`input` や `textarea` にフォーカスがある場合は **イベントが無視される** 仕様を積極的に利用します。これにより、入力中の意図せぬオーバーレイの開閉を防ぎます。

2. **入力フィールド（Input/Textarea）内でのイベント伝播制御**
   - 数字やテキストの入力中、そのキーイベントが上位の要素や動画プレイヤーに伝播して予期せぬ動作（動画のシークや一時停止など）を引き起こさないよう、入力要素の `onKeyDown` で原則として **`e.stopPropagation()`** を呼び出します。
   - ただし、`Alt`, `Ctrl`, `Meta` キーなどの修飾キーが押されている場合は伝播を許容（`stopPropagation` しない）し、`hotkeys-js` やグローバルイベントリスナーがショートカットとして捕捉できるようにします。

3. **入力要素からの意図的なショートカット発火**
   - `input` や `textarea` にフォーカスがある状態で `Escape` や `Ctrl+Enter` を押した場合、`hotkeys-js` では捕捉されないため、入力要素自身の `onKeyDown` ハンドラ内でキャッチし、`e.preventDefault()` とともに `footics-action` イベントを発行（ディスパッチ）します。
   - 同様に、`Tab` や `Shift+Tab` によるフェーズ移動 (`NEXT_PHASE`, `PREV_PHASE`) も手動で発火させます。

4. **二重保存の防止 (Concurrency Control)**
   - 非同期の保存処理（DB書き込み等）が走っている間、重複して保存処理が実行されないよう、`isSaving` フラグによるガードを必須とします。特に `Ctrl+Enter` の長押しや連打による重複登録を防ぐために重要です。

5. **フォーカスの自動復帰**
   - 動画プレイヤーなどでマウス操作を行った際など、意図せず `input` からフォーカスが外れた状態でタイピング（数字など）を開始した場合、グローバルな `keydown` を監視し、修飾キーなしの数字入力であれば自動的に `input` 要素にフォーカスを戻します。

## 実装パターン (Code Template)

### 1. グローバルショートカットインターセプター
`extension/hooks/use-overlay-shortcut-interceptor.ts` や Web版 `MemoOverlayModal.tsx` 等で登録します。

```typescript
import hotkeys from 'hotkeys-js';
import { useEffect } from 'react';

export function useOverlayShortcutInterceptor() {
  useEffect(() => {
    // Escape で閉じる
    hotkeys('escape', (e) => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent('footics-action', { detail: { action: 'CLOSE_OVERLAY' } }),
      );
    });

    // 保存
    hotkeys('ctrl+enter, command+enter', (e) => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent('footics-action', { detail: { action: 'SAVE_MEMO' } }),
      );
    });

    return () => {
      hotkeys.unbind('escape');
      hotkeys.unbind('ctrl+enter, command+enter');
    };
  }, []);
}
```

### 2. Input 要素での制御 (PhaseTimeInput / PhaseLabelSelection)
入力要素自身でのイベント伝播制御と、アクションの手動発火の例です。

```typescript
<input
  onKeyDown={(e) => {
    // 1. 修飾キーを伴うショートカットはバブリングさせる
    // 2. それ以外の単体キーは伝播を止める
    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
      e.stopPropagation();
    }

    // Shift+Tab: 前のフェーズへ
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('footics-action', { detail: { action: 'PREV_PHASE' } }));
    } 
    // Enter / Tab: 次のフェーズへ
    else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('footics-action', { detail: { action: 'NEXT_PHASE' } }));
    }
  }}
/>
```

### 3. Textarea での制御 (PhaseMemoInput)
`textarea` は `hotkeys-js` がデフォルトで無視するため、明示的なハンドリングが必要です。

```typescript
<textarea
  onKeyDown={(e) => {
    // 保存・閉じるなどの主要アクションを明示的に発火
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('footics-action', { detail: { action: 'CLOSE_OVERLAY' } }));
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('footics-action', { detail: { action: 'SAVE_MEMO' } }));
    }
    // 基本は伝播を止める
    e.stopPropagation();
  }}
/>
```

### 4. 保存ガード (isSaving Pattern)
モーダル/オーバーレイの `handleSave` 実装例です。

```typescript
const handleSave = useCallback(async () => {
  if (isSaving) return; // 二重保存ガード

  setIsSaving(true);
  try {
    await db.save(...);
    handleClose();
  } finally {
    setIsSaving(false);
  }
}, [isSaving]);
```

### 5. Web版モーダルでの統合パターン
Web版アプリでは、`useMemoOverlayEventBridge` と `hotkeys` インターセプターを組み合わせて拡張機能と同じ挙動を再現します。

```typescript
// MemoOverlayModal.tsx 内
useMemoOverlayEventBridge(handleClose, handleSave);

useEffect(() => {
  if (!isModalOpen) return;
  // hotkeys の登録 (Escape, Ctrl+Enter)
  return () => {
    // hotkeys の解除
  };
}, [isModalOpen]);
```
