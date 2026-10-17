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

  const containerAspect = containerSize.width / containerSize.height;
  let width = 0;
  let height = 0;
  let x = 0;
  let y = 0;

  if (containerAspect > imageAspect) {
    // コンテナの方が横長のため、高さ基準でフィットし左右にセンタリング
    height = containerSize.height;
    width = height * imageAspect;
    x = (containerSize.width - width) / 2;
    y = 0;
  } else {
    // コンテナの方が縦長のため、幅基準でフィットし上下にセンタリング
    width = containerSize.width;
    height = width / imageAspect;
    x = 0;
    y = (containerSize.height - height) / 2;
  }

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
