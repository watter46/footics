'use client';

/**
 * use-ring-transformer.ts
 * Custom hook: Konva Transformer を Ring マーカーに紐付けるロジック
 */

import { useEffect, useRef } from 'react';

interface UseRingTransformerOptions {
  isSelected: boolean;
  markerType: string;
  radius: number;
}

export function useRingTransformer({
  isSelected,
  markerType,
}: UseRingTransformerOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ringShapeNodeRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ringTransformerRef = useRef<any>(null);

  useEffect(() => {
    if (!ringTransformerRef.current) return;
    if (isSelected && markerType === 'ring' && ringShapeNodeRef.current) {
      ringTransformerRef.current.nodes([ringShapeNodeRef.current]);
      ringTransformerRef.current.getLayer()?.batchDraw();
    } else {
      ringTransformerRef.current.nodes([]);
      ringTransformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, markerType]);

  return { ringShapeNodeRef, ringTransformerRef };
}
