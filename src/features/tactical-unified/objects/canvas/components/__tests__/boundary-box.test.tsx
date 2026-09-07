import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BoundaryBox as BoundaryBoxType } from '@/lib/types/tactical-unified';
import { BoundaryBox } from '../boundary-box';

describe('BoundaryBox rendering', () => {
  const defaultBox: BoundaryBoxType = {
    x: 10,
    y: 10,
    width: 80,
    height: 80,
    enabled: true,
  };
  const stageSize = { width: 800, height: 450 };

  it('renders null when isExporting is true', () => {
    const { container } = render(
      <BoundaryBox
        boundaryBox={defaultBox}
        stageSize={stageSize}
        onUpdate={vi.fn()}
        isExporting={true}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when boundaryBox.enabled is false', () => {
    const { container } = render(
      <BoundaryBox
        boundaryBox={{ ...defaultBox, enabled: false }}
        stageSize={stageSize}
        onUpdate={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders 4 corner handles and has pointer-events: none on outer container', () => {
    const { container } = render(
      <BoundaryBox
        boundaryBox={defaultBox}
        stageSize={stageSize}
        onUpdate={vi.fn()}
      />,
    );

    const outer = container.firstChild as HTMLElement;
    expect(outer).toBeDefined();
    expect(outer.style.pointerEvents).toBe('none');

    expect(
      screen.getByRole('button', { name: 'Resize handle tl' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Resize handle tr' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Resize handle br' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Resize handle bl' }),
    ).toBeDefined();
  });
});

describe('BoundaryBox dragging & commit', () => {
  const defaultBox: BoundaryBoxType = {
    x: 10,
    y: 10,
    width: 80,
    height: 80,
    enabled: true,
  };
  const stageSize = { width: 800, height: 450 };

  it('handles corner drag to resize the boundary box and calls onCommit on release', () => {
    const onUpdate = vi.fn();
    const onCommit = vi.fn();
    render(
      <BoundaryBox
        boundaryBox={defaultBox}
        stageSize={stageSize}
        onUpdate={onUpdate}
        onCommit={onCommit}
      />,
    );

    const handleBr = screen.getByRole('button', { name: 'Resize handle br' });
    handleBr.setPointerCapture = vi.fn();

    fireEvent.pointerDown(handleBr, {
      clientX: 720,
      clientY: 405,
      pointerId: 1,
    });

    const moveEvent = new PointerEvent('pointermove', {
      clientX: 740,
      clientY: 420,
    });
    handleBr.dispatchEvent(moveEvent);

    expect(onUpdate).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();

    const upEvent = new PointerEvent('pointerup');
    handleBr.dispatchEvent(upEvent);

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });

  it('handles box move drag and calls onCommit on release', () => {
    const onUpdate = vi.fn();
    const onCommit = vi.fn();
    const { container } = render(
      <BoundaryBox
        boundaryBox={defaultBox}
        stageSize={stageSize}
        onUpdate={onUpdate}
        onCommit={onCommit}
      />,
    );

    const rects = container.querySelectorAll('rect');
    const dragRect = rects[0];
    dragRect.setPointerCapture = vi.fn();

    fireEvent.pointerDown(dragRect, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });

    const moveEvent = new PointerEvent('pointermove', {
      clientX: 120,
      clientY: 130,
    });
    dragRect.dispatchEvent(moveEvent);

    expect(onUpdate).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();

    const upEvent = new PointerEvent('pointerup');
    dragRect.dispatchEvent(upEvent);

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });
});
