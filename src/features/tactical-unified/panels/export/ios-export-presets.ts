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

export const IOS_ENCODER_PRESET = {
  label: 'iPhone (A14 Bionic) — 60fps High Quality',
  codec: 'avc1.64002a',
  maxQueueSize: 30,
  bitrateMbps: 24,
  fps: 60,
  latencyMode: 'quality' as const,
  keyFrameIntervalSec: 2,
} as const;

export type IosEncoderPreset = typeof IOS_ENCODER_PRESET;

// 後方互換性用エイリアス (30fps撤去・60fps高画質プリセットへ一本化)
export const IOS_ENCODER_PRESETS = {
  iphone12: IOS_ENCODER_PRESET,
  iosGeneral: IOS_ENCODER_PRESET,
} as const;
