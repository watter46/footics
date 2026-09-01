import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import { TimelineBar } from '../timeline/timeline-bar';

describe('TimelineBar Component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders playback controls and initial scene', () => {
    render(<TimelineBar />);

    expect(screen.getByRole('button', { name: /play/i })).toBeDefined();
    expect(screen.getByText(/Total 1.5s/i)).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    expect(
      screen.getByRole('button', {
        name: /add scene/i,
      }),
    ).toBeDefined();
  });

  it('adds a blank scene on left click', () => {
    render(<TimelineBar />);

    const addBtn = screen.getByRole('button', {
      name: /add scene/i,
    });

    fireEvent.click(addBtn);

    const slides = useTacticalUnifiedStore.getState().project.slides;
    expect(slides.length).toBe(2);
    expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slides[1].id);
  });

  it('duplicates scene on right click (contextmenu)', () => {
    render(<TimelineBar />);

    const addBtn = screen.getByRole('button', {
      name: /add scene/i,
    });

    fireEvent.contextMenu(addBtn);

    const slides = useTacticalUnifiedStore.getState().project.slides;
    expect(slides.length).toBe(2);
    expect(slides[1].label).toContain('(copy)');
  });

  it('toggles playback when Play button is clicked', () => {
    render(<TimelineBar />);

    const playBtn = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playBtn);

    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);
    expect(screen.getByRole('button', { name: /pause/i })).toBeDefined();

    const pauseBtn = screen.getByRole('button', { name: /pause/i });
    fireEvent.click(pauseBtn);

    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);
  });
});
