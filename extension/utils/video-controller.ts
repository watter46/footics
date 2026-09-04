/**
 * Video playback controller for extension overlay
 */

/**
 * 動画が再生中（paused === false かつ !ended）であれば一時停止し、
 * 「元々再生中だったか」を boolean で返す。
 */
export function pauseVideoIfPlaying(video: HTMLVideoElement): boolean {
  if (!video.paused && !video.ended) {
    video.pause();
    return true;
  }
  return false;
}

/**
 * 前回の状態が再生中 (wasPlaying === true) だった場合、動画の再生を再開する。
 */
export function resumeVideoIfWasPaused(
  video: HTMLVideoElement,
  wasPlaying: boolean,
): void {
  if (wasPlaying && video.paused) {
    video.play().catch((err) => {
      console.warn('[Footics Overlay] Failed to resume video playback:', err);
    });
  }
}
