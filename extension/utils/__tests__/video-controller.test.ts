import { describe, expect, it, vi } from 'vitest';
import {
  pauseVideoIfPlaying,
  resumeVideoIfWasPaused,
} from '../video-controller';

describe('video-controller', () => {
  it('再生中の動画を一時停止し、true を返すこと', () => {
    const video = {
      paused: false,
      ended: false,
      pause: vi.fn(function (this: { paused: boolean }) {
        this.paused = true;
      }),
      play: vi.fn(),
    } as unknown as HTMLVideoElement;

    const wasPlaying = pauseVideoIfPlaying(video);
    expect(video.pause).toHaveBeenCalledTimes(1);
    expect(wasPlaying).toBe(true);
  });

  it('既に一時停止中の動画の場合は pause() を呼ばず false を返すこと', () => {
    const video = {
      paused: true,
      ended: false,
      pause: vi.fn(),
      play: vi.fn(),
    } as unknown as HTMLVideoElement;

    const wasPlaying = pauseVideoIfPlaying(video);
    expect(video.pause).not.toHaveBeenCalled();
    expect(wasPlaying).toBe(false);
  });

  it('再生終了済みの動画の場合は pause() を呼ばず false を返すこと', () => {
    const video = {
      paused: false,
      ended: true,
      pause: vi.fn(),
      play: vi.fn(),
    } as unknown as HTMLVideoElement;

    const wasPlaying = pauseVideoIfPlaying(video);
    expect(video.pause).not.toHaveBeenCalled();
    expect(wasPlaying).toBe(false);
  });

  it('wasPlaying が true で video.paused が true の場合、play() を呼び出すこと', () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    const video = {
      paused: true,
      ended: false,
      play: playMock,
    } as unknown as HTMLVideoElement;

    resumeVideoIfWasPaused(video, true);
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('wasPlaying が false の場合は play() を呼び出さないこと', () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    const video = {
      paused: true,
      ended: false,
      play: playMock,
    } as unknown as HTMLVideoElement;

    resumeVideoIfWasPaused(video, false);
    expect(playMock).not.toHaveBeenCalled();
  });

  it('video が既に再生中の場合は play() を重複して呼び出さないこと', () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    const video = {
      paused: false,
      ended: false,
      play: playMock,
    } as unknown as HTMLVideoElement;

    resumeVideoIfWasPaused(video, true);
    expect(playMock).not.toHaveBeenCalled();
  });
});
