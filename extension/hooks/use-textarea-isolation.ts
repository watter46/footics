/**
 * useTextareaIsolation
 *
 * 責務: メモ入力中の Textarea において、ホストページ（ビデオプレイヤー等）の
 * ショートカットを抑制しつつ、標準的なテキスト入力をエミュレートする。
 */
export function handleTextareaIsolation(
  e: KeyboardEvent,
  ta: HTMLTextAreaElement,
  isSaveCombo: boolean,
): { shouldStop: boolean; shouldPrevent: boolean } {
  const isNavigationKey = e.key === 'Tab' || e.key === 'Escape';

  // 保存コンボやナビゲーションキーはインターセプター側に任せる
  if (isSaveCombo || isNavigationKey) {
    return { shouldStop: false, shouldPrevent: false };
  }

  // ホストページ（ビデオプレイヤー等）のショートカットを阻止するために伝播を止める
  // ただし、文字入力などの標準的な挙動はブラウザに任せるため preventDefault は呼ばない
  if (e.type === 'keydown' || e.type === 'keyup' || e.type === 'keypress') {
    return { shouldStop: true, shouldPrevent: false };
  }

  return { shouldStop: false, shouldPrevent: false };
}
