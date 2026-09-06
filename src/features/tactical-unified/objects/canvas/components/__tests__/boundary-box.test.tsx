import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BoundaryBox as BoundaryBoxType } from '@/lib/types/tactical-unified';
import { BoundaryBox } from '../boundary-box';

describe('BoundaryBox component', () => {
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

  it('handles corner drag to resize the boundary box', () => {
    const onUpdate = vi.fn();
    render(
      <BoundaryBox
        boundaryBox={defaultBox}
        stageSize={stageSize}
        onUpdate={onUpdate}
      />,
    );

    const handleBr = screen.getByRole('button', { name: 'Resize handle br' });
    handleBr.setPointerCapture = vi.fn();

    fireEvent.pointerDown(handleBr, {
      clientX: 720,
      clientY: 405,
      pointerId: 1,
    });

    fireEvent(
      handleBr,
      new CustomEvent('pointermove', {
        detail: {},
      }),
    );

    const moveEvent = new Event('pointermove') as any;
    moveEvent.clientX = 740;
    moveEvent.clientY = 420;
    handleBr.dispatchEvent(moveEvent);

    expect(onUpdate).toHaveBeenCalled();
  });
});
