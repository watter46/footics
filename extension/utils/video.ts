/**
 * DOMツリー（Shadow DOM含む）からビデオ要素を再帰的に検索する
 *
 * DAZN等の配信サービスやカスタムプレイヤーで、<video>要素が
 * Shadow DOM内部にカプセル化されている場合でも確実に取得できるようにします。
 */
export function findVideoElement(
  root: Document | ShadowRoot | Element = document,
): HTMLVideoElement | null {
  const video = root.querySelector('video');
  if (video) return video;

  // Shadow DOMを持つ要素を再帰的に検索
  const shadowHosts = root.querySelectorAll('*');
  for (const host of Array.from(shadowHosts)) {
    if (host.shadowRoot) {
      const found = findVideoElement(host.shadowRoot);
      if (found) return found;
    }
  }

  return null;
}
