/**
 * virtual-canvas-rect.ts
 *
 * 仮想キャンバス幾何計算ヘルパー（純粋関数）
 * コンテナに対して object-fit: contain 相当の均等スケーリングとセンタリング、
 * および余白0%（ゼロマージン）の仮想矩形を算出する。
 */

export interface VirtualCanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export function calculateVirtualCanvasRect(
  containerSize: { width: number; height: number },
  imageAspect: number,
  baseWidth: number = imageAspect >= 1 ? 1920 : 1080,
  paddingRatio: number = 0,
): VirtualCanvasRect {
  if (
    containerSize.width <= 0 ||
    containerSize.height <= 0 ||
    imageAspect <= 0 ||
    Number.isNaN(imageAspect)
  ) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      scale: 1,
    };
  }

  const safePaddingRatio = Math.max(0, Math.min(0.4, paddingRatio));
  const availW = containerSize.width * (1 - safePaddingRatio * 2);
  const availH = containerSize.height * (1 - safePaddingRatio * 2);
  const availAspect = availW / availH;
  let width = 0;
  let height = 0;

  if (availAspect > imageAspect) {
    // コンテナ（余白除外後）の方が横長のため、高さ基準でフィット
    height = availH;
    width = height * imageAspect;
  } else {
    // コンテナ（余白除外後）の方が縦長のため、幅基準でフィット
    width = availW;
    height = width / imageAspect;
  }

  const x = (containerSize.width - width) / 2;
  const y = (containerSize.height - height) / 2;

  const safeBaseWidth = baseWidth > 0 ? baseWidth : 1920;
  const scale = width / safeBaseWidth;

  return {
    x,
    y,
    width,
    height,
    scale,
  };
}
