import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PreviewBoundaryOverlay } from '../preview-boundary-overlay';

describe('PreviewBoundaryOverlay', () => {
  it('renders boundary frame with neutral styling and not #00A8FF', () => {
    const containerRef = createRef<HTMLDivElement>();
    const onCommit = vi.fn();
    const boundaryBox = {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
      visible: true,
    };

    render(
      <PreviewBoundaryOverlay
        boundaryBox={boundaryBox}
        containerRef={containerRef}
        onCommit={onCommit}
      />,
    );

    const frame = screen.getByTestId('boundary-box-frame');
    expect(frame.className).toContain('border-neutral-300/80');
    expect(frame.className).not.toContain('#00A8FF');

    const handleTl = screen.getByTestId('boundary-handle-tl');
    expect(handleTl.className).toContain('border-neutral-400');
  });
});
