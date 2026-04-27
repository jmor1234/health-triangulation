export type RetryPhase = 'extraction';

export interface RetryConfig {
  timeoutMs: number;
  maxAttempts: number;
  initialBackoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  jitterFactor: number;
}

const DEFAULT_EXTRACTION: RetryConfig = {
  timeoutMs: 25_000,
  maxAttempts: 2,
  initialBackoffMs: 1_000,
  backoffMultiplier: 2,
  maxBackoffMs: 10_000,
  jitterFactor: 0.25,
};

function envInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getRetryConfig(phase: RetryPhase): RetryConfig {
  if (phase === 'extraction') {
    return {
      ...DEFAULT_EXTRACTION,
      timeoutMs: envInt('EXTRACTION_TIMEOUT_MS', DEFAULT_EXTRACTION.timeoutMs),
      maxAttempts: envInt('EXTRACTION_MAX_ATTEMPTS', DEFAULT_EXTRACTION.maxAttempts),
    };
  }
  return DEFAULT_EXTRACTION;
}
