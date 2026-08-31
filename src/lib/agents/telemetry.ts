import type { Telemetry } from './types';

/**
 * Robust token estimation utility
 * Approximation: ~4 chars per token for Latin characters/code, ~1.5 chars per token for CJK
 */
export function estimateTokens(text: string | undefined | null): number {
  if (!text) return 0;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // CJK Unified Ideographs, Hiragana, Katakana range
    if (
      (code >= 0x3000 && code <= 0x9fff) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff00 && code <= 0xffef)
    ) {
      count += 1;
    } else {
      count += 0.25;
    }
  }
  return Math.max(1, Math.ceil(count));
}

export class LatencyTimer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  reset(): void {
    this.startTime = Date.now();
  }

  elapsedMs(): number {
    return Math.max(1, Date.now() - this.startTime);
  }
}

export interface TelemetryComputeOptions {
  promptText?: string;
  completionText?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  timer?: LatencyTimer;
}

export function computeTelemetry(options: TelemetryComputeOptions): Telemetry {
  const promptTokens =
    options.promptTokens ?? (options.promptText ? estimateTokens(options.promptText) : 0);
  const completionTokens =
    options.completionTokens ??
    (options.completionText ? estimateTokens(options.completionText) : 0);
  const totalTokens = promptTokens + completionTokens;
  const latencyMs =
    options.latencyMs ?? (options.timer ? options.timer.elapsedMs() : 0);

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    latency_ms: latencyMs,
  };
}
