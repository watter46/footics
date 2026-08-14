import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/stores/useEditorStore';

export interface ImageSize {
  w: number;
  h: number;
}

/**
 * 背景画像の読み込みと HTMLImageElement の管理を行うフック。
 * ストアの lastCapturedFrame (data URL) を監視し、
 * Konva.Image に渡せる HTMLImageElement を返す。
 */
export function useBackground() {
  const lastCapturedFrame = useEditorStore((state) => state.lastCapturedFrame);
  const isHydrated = useEditorStore((state) => state.isHydrated);

  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>({ w: 0, h: 0 });

  // 同一 data URL での重複ロードを防止
  const loadedSrcRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !lastCapturedFrame) {
      setBackgroundImage(null);
      setImageSize({ w: 0, h: 0 });
      loadedSrcRef.current = null;
      return;
    }

    // 同じソースならスキップ
    if (loadedSrcRef.current === lastCapturedFrame) return;

    const img = new Image();
    img.onload = () => {
      loadedSrcRef.current = lastCapturedFrame;
      setBackgroundImage(img);
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
      console.log(
        `[useBackground] Image loaded: ${img.naturalWidth}x${img.naturalHeight}`,
      );
    };
    img.onerror = (e) => {
      console.error('[useBackground] Image load error:', e);
      setBackgroundImage(null);
      setImageSize({ w: 0, h: 0 });
    };
    img.src = lastCapturedFrame;
  }, [lastCapturedFrame, isHydrated]);

  return { backgroundImage, imageSize };
}
