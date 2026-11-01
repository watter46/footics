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

export type IosEncoderPresetKey = '24mbps' | '14mbps';

export interface IosEncoderPreset {
  readonly id: IosEncoderPresetKey;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly codec: 'avc1.64002a';
  readonly maxQueueSize: number;
  readonly bitrateMbps: 24 | 14;
  readonly fps: 60;
  readonly latencyMode: 'quality';
  readonly keyFrameIntervalSec: 2 | 1;
}

export const IOS_PRESET_24MBPS: IosEncoderPreset = {
  id: '24mbps',
  label: '24Mbps (High Quality, GOP 2s)',
  shortLabel: '24Mbps',
  description: 'High quality bit-perfect preset (24Mbps, GOP 2s)',
  codec: 'avc1.64002a',
  maxQueueSize: 2,
  bitrateMbps: 24,
  fps: 60,
  latencyMode: 'quality',
  keyFrameIntervalSec: 2,
};

export const IOS_PRESET_14MBPS: IosEncoderPreset = {
  id: '14mbps',
  label: '14Mbps (Balanced, GOP 1s)',
  shortLabel: '14Mbps',
  description: 'Optimized bitrate preset (14Mbps, GOP 1s)',
  codec: 'avc1.64002a',
  maxQueueSize: 2,
  bitrateMbps: 14,
  fps: 60,
  latencyMode: 'quality',
  keyFrameIntervalSec: 1,
};

export const IOS_COMPARISON_PRESET_KEYS = ['24mbps', '14mbps'] as const;

// 後方互換維持用
export const IOS_ENCODER_PRESET: IosEncoderPreset = IOS_PRESET_24MBPS;

export const IOS_ENCODER_PRESETS = {
  '24mbps': IOS_PRESET_24MBPS,
  '14mbps': IOS_PRESET_14MBPS,
  iphone12: IOS_PRESET_24MBPS,
  iosGeneral: IOS_PRESET_24MBPS,
} as const;
