import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SyntaxStudioPage from '@/app/syntax-studio/page';
import { useSyntaxStudioStore } from '@/stores/syntax-studio-store';

// Canvas 2D context mock for happy-dom / jsdom
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    isPointInPath: vi.fn(() => true),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createPattern: vi.fn(),
    font: '',
    textAlign: '',
    textBaseline: '',
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('SyntaxStudioPage integration', () => {
  beforeEach(() => {
    useSyntaxStudioStore.setState({
      viewMode: 'split',
      currentSceneIndex: 0,
      aiDraft: null,
      humanGroundTruth: null,
      matchMetadata: null,
      datasetId: null,
    });
  });

  it('renders studio header and auto-loads sample dataset', () => {
    render(<SyntaxStudioPage />);

    expect(screen.getByText('Syntax Studio')).toBeDefined();
    expect(screen.getByText('AI Draft (Read-only)')).toBeDefined();
    expect(screen.getByText('Human Ground Truth (Editable)')).toBeDefined();
    expect(screen.getByText(/Scene 1/i)).toBeDefined();
  });

  it('toggles view mode between split and focus', () => {
    render(<SyntaxStudioPage />);

    const focusBtn = screen.getByRole('button', { name: /focus view/i });
    fireEvent.click(focusBtn);

    expect(screen.getByText('Human Ground Truth (Full Focus)')).toBeDefined();
    expect(screen.queryByText('AI Draft (Read-only)')).toBeNull();

    const splitBtn = screen.getByRole('button', { name: /split view/i });
    fireEvent.click(splitBtn);

    expect(screen.getByText('AI Draft (Read-only)')).toBeDefined();
  });

  it('changes scene via scene tabs', () => {
    useSyntaxStudioStore.setState({
      aiDraft: {
        version: '1.0.0',
        tacticalScenes: [
          { id: 'scene-1', title: 'Scene 1', description: 'desc 1', players: [], arrows: [], zones: [] },
          { id: 'scene-2', title: 'Scene 2', description: 'desc 2', players: [], arrows: [], zones: [] },
        ],
      },
      humanGroundTruth: {
        version: '1.0.0',
        tacticalScenes: [
          { id: 'scene-1', title: 'Scene 1', description: 'desc 1', players: [], arrows: [], zones: [] },
          { id: 'scene-2', title: 'Scene 2', description: 'desc 2', players: [], arrows: [], zones: [] },
        ],
      },
    });

    render(<SyntaxStudioPage />);

    const scene2Tab = screen.getByRole('button', { name: /scene 2/i });
    fireEvent.click(scene2Tab);

    expect(useSyntaxStudioStore.getState().currentSceneIndex).toBe(1);
  });

  it('opens and closes JSON Schema drawer', () => {
    render(<SyntaxStudioPage />);

    const jsonBtn = screen.getByRole('button', { name: /json schema/i });
    fireEvent.click(jsonBtn);

    expect(screen.getByText('Tactical Dataset JSON Drawer')).toBeDefined();

    const closeBtn = screen.getByLabelText(/close modal overlay/i);
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Tactical Dataset JSON Drawer')).toBeNull();
  });
});
