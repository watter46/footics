export function detectIOSDevice() {
  if (typeof navigator === 'undefined')
    return { isIOS: false, isIPhone12: false };
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isIPhone12 =
    isIOS &&
    typeof window !== 'undefined' &&
    window.screen.width === 390 &&
    window.screen.height === 844;
  return { isIOS, isIPhone12 };
}

export const IOS_ENCODER_PRESETS = {
  iphone12: {
    label: 'iPhone 12 (A14 Bionic) — Optimized',
    codec: 'avc1.64002a',
    maxQueueSize: 30,
    bitrateMbps: 24,
    fps: 60,
    latencyMode: 'quality' as const,
    keyFrameIntervalSec: 2,
  },
  iosGeneral: {
    label: 'iOS Safari — Safe',
    codec: 'avc1.4d002a',
    maxQueueSize: 20,
    bitrateMbps: 16,
    fps: 30,
    latencyMode: 'realtime' as const,
    keyFrameIntervalSec: 2,
  },
} as const;
