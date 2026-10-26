'use client';

import { useCallback, useRef, useState } from 'react';

export interface PanOffset {
  x: number;
  y: number;
}

export function usePitchInteraction() {
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 });
  const [tilt, setTilt] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPan: PanOffset;
  }>({
    startX: 0,
    startY: 0,
    initialPan: { x: 0, y: 0 },
  });

  // ズーム操作 (0.5x 〜 3.0x)
  const updateZoom = useCallback((newZoom: number) => {
    setZoom(Math.max(0.5, Math.min(3.0, Math.round(newZoom * 100) / 100)));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = -e.deltaY * 0.0015;
    setZoom((prev) =>
      Math.max(0.5, Math.min(3.0, Math.round((prev + zoomFactor) * 100) / 100)),
    );
  }, []);

  // パン（ドラッグ移動）操作
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // 左クリックのみドラッグ開始
      if (e.button !== 0) return;
      setIsDragging(true);
      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialPan: { ...pan },
      };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setPan({
        x: dragStartRef.current.initialPan.x + dx,
        y: dragStartRef.current.initialPan.y + dy,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // チルト角度操作 (0° 〜 35°)
  const updateTilt = useCallback((newTilt: number) => {
    setTilt(Math.max(0, Math.min(35, Math.round(newTilt))));
  }, []);

  // 全てリセット
  const resetTransform = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setTilt(0);
  }, []);

  return {
    zoom,
    pan,
    tilt,
    isDragging,
    updateZoom,
    updateTilt,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    resetTransform,
  };
}
