const H264_CODEC_CANDIDATES = [
  'avc1.64002a', // High Profile Level 4.2 (GPU native maximum quality)
  'avc1.4d002a', // Main Profile Level 4.2
  'avc1.4D401F', // Main Profile Level 3.1
  'avc1.42E01E', // Baseline Profile Level 3.0 (Fallback)
];

const VP9_CODEC_CANDIDATES = [
  'vp09.00.10.08', // Profile 0, 8-bit, 4:2:0
  'vp09.00.41.08', // Profile 0, Level 4.1
  'vp09.02.10.10', // Profile 2, 10-bit
  'vp9',
];

/**
 * Detects the best supported H.264 codec configuration for VideoEncoder,
 * strictly prioritizing GPU hardware acceleration ('prefer-hardware').
 */
export async function getSupportedH264EncoderConfig(
  width: number,
  height: number,
  fps: number,
  bitrate = 30_000_000,
): Promise<VideoEncoderConfig | null> {
  if (typeof globalThis === 'undefined' || !('VideoEncoder' in globalThis)) {
    return null;
  }

  const accelOptions: HardwareAcceleration[] = [
    'prefer-hardware',
    'no-preference',
    'prefer-software',
  ];

  const latencyModes: LatencyMode[] = ['quality', 'realtime'];

  for (const hardwareAcceleration of accelOptions) {
    for (const latencyMode of latencyModes) {
      for (const codec of H264_CODEC_CANDIDATES) {
        try {
          const testConfig: VideoEncoderConfig = {
            codec,
            width,
            height,
            bitrate,
            framerate: fps,
            hardwareAcceleration,
            bitrateMode: 'variable',
            latencyMode,
          };
          const support = await VideoEncoder.isConfigSupported(testConfig);
          if (support.supported && support.config) {
            return support.config;
          }
        } catch (err) {
          console.warn('[VideoExportEngine] H264 config check error:', err);
        }
      }
    }
  }

  return null;
}

/**
 * Backward-compatible helper for H.264 codec string lookup.
 */
export async function getSupportedH264Codec(
  width: number,
  height: number,
  fps: number,
  bitrate = 30_000_000,
): Promise<string> {
  const config = await getSupportedH264EncoderConfig(
    width,
    height,
    fps,
    bitrate,
  );
  return config?.codec ?? 'avc1.64002a';
}

/**
 * Detects the best supported VP9 codec configuration for VideoEncoder,
 * supporting alpha transparency when alpha is true.
 */
export async function getSupportedVP9EncoderConfig(
  width: number,
  height: number,
  fps: number,
  bitrate = 30_000_000,
  alpha = false,
): Promise<VideoEncoderConfig | null> {
  if (typeof globalThis === 'undefined' || !('VideoEncoder' in globalThis)) {
    return null;
  }

  const accelOptions: HardwareAcceleration[] = [
    'prefer-hardware',
    'no-preference',
    'prefer-software',
  ];

  const latencyModes: LatencyMode[] = ['quality', 'realtime'];

  for (const hardwareAcceleration of accelOptions) {
    for (const latencyMode of latencyModes) {
      for (const codec of VP9_CODEC_CANDIDATES) {
        try {
          const testConfig: VideoEncoderConfig = {
            codec,
            width,
            height,
            bitrate,
            framerate: fps,
            hardwareAcceleration,
            bitrateMode: 'variable',
            latencyMode,
            ...(alpha ? { alpha: 'keep' } : {}),
          };
          const support = await VideoEncoder.isConfigSupported(testConfig);
          if (support.supported && support.config) {
            return support.config;
          }
        } catch (err) {
          console.warn('[VideoExportEngine] VP9 config check error:', err);
        }
      }
    }
  }

  return null;
}

/**
 * Helper for VP9 codec string lookup.
 */
export async function getSupportedVP9Codec(
  width: number,
  height: number,
  fps: number,
  bitrate = 30_000_000,
  alpha = false,
): Promise<string> {
  const config = await getSupportedVP9EncoderConfig(
    width,
    height,
    fps,
    bitrate,
    alpha,
  );
  return config?.codec ?? 'vp09.00.10.08';
}
