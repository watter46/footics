import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSlideTimeline } from '../use-slide-timeline';

describe('useSlideTimeline', () => {
  it('initializes timeline and controls playback', () => {
    const onUpdate = vi.fn();
    const onComplete = vi.fn();

    const { result, unmount } = renderHook(() =>
      useSlideTimeline({
        durationMs: 1000,
        autoPlay: false,
        onUpdate,
        onComplete,
      }),
    );

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.progress).toBe(0);

    // Seek to 0.5
    act(() => {
      result.current.seek(0.5);
    });
    expect(result.current.progress).toBeCloseTo(0.5);
    expect(onUpdate).toHaveBeenCalledWith(expect.closeTo(0.5));

    // Play
    act(() => {
      result.current.play();
    });
    expect(result.current.isPlaying).toBe(true);

    // Pause
    act(() => {
      result.current.pause();
    });
    expect(result.current.isPlaying).toBe(false);

    // Unmount kills timeline
    unmount();
  });
});
