import { act, render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import type { CapturedScreenshot } from '../../../capture/db/screenshot-db';
import {
  QuickAnnotationCanvas,
  type QuickAnnotationCanvasHandle,
} from '../QuickAnnotationCanvas';

const mockScreenshot: CapturedScreenshot = {
  id: 'shot-canvas-1',
  timestamp: Date.now(),
  videoTitle: 'Sample Canvas Video',
  videoUrl: 'https://youtube.com/watch?v=mock2',
  imageDataUrl: 'data:image/png;base64,mockImage',
  canvasAnnotations: JSON.stringify({
    arrows: [],
    zones: [],
    texts: [],
    markers: [],
  }),
};

describe('QuickAnnotationCanvas', () => {
  it('mounts without crash and forwards CanvasCoreHandle ref', () => {
    const canvasRef = createRef<QuickAnnotationCanvasHandle>();

    const { container } = render(
      <div style={{ width: 800, height: 600 }}>
        <QuickAnnotationCanvas
          ref={canvasRef}
          screenshot={mockScreenshot}
          imageAspect={16 / 9}
        />
      </div>,
    );

    expect(container).toBeDefined();
    expect(canvasRef.current).toBeDefined();
    expect(typeof canvasRef.current?.exportPng).toBe('function');
    expect(typeof canvasRef.current?.copyToClipboard).toBe('function');
    expect(typeof canvasRef.current?.undo).toBe('function');
    expect(typeof canvasRef.current?.redo).toBe('function');
  });

  it('supports applyRatio for boundaryBox aspect ratio presets', () => {
    const canvasRef = createRef<QuickAnnotationCanvasHandle>();

    render(
      <div style={{ width: 800, height: 600 }}>
        <QuickAnnotationCanvas
          ref={canvasRef}
          screenshot={mockScreenshot}
          imageAspect={16 / 9}
        />
      </div>,
    );

    expect(typeof canvasRef.current?.applyRatio).toBe('function');
    expect(() => {
      act(() => {
        canvasRef.current?.applyRatio?.('4:5');
      });
    }).not.toThrow();
    expect(() => {
      act(() => {
        canvasRef.current?.applyRatio?.('full');
      });
    }).not.toThrow();
  });
});
