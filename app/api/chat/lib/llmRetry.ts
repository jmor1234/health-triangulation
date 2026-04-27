import { getRetryConfig, type RetryPhase, type RetryConfig } from './retryConfig';

const NON_RETRYABLE_STATUS = new Set([400, 401, 403, 404, 422]);

function isRetryableError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { status?: number; statusCode?: number; name?: string };
  const status = e.status ?? e.statusCode;
  if (typeof status === 'number') return !NON_RETRYABLE_STATUS.has(status);
  if (e.name === 'AbortError') return false;
  return true;
}

function getRetryAfterMs(err: unknown): number | null {
  const e = err as { headers?: Record<string, string | undefined> };
  const v = e.headers?.['retry-after'];
  if (!v) return null;
  const num = Number(v);
  if (Number.isFinite(num)) return num * 1000;
  const date = Date.parse(v);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

function computeBackoff(attempt: number, cfg: RetryConfig): number {
  const exp = cfg.initialBackoffMs * Math.pow(cfg.backoffMultiplier, attempt);
  const capped = Math.min(exp, cfg.maxBackoffMs);
  const jitter = capped * cfg.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, capped + jitter);
}

export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  phase: RetryPhase,
): Promise<T> {
  const cfg = getRetryConfig(phase);
  let lastError: unknown;

  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);

    try {
      return await fn(controller.signal);
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === cfg.maxAttempts - 1) throw err;

      const retryAfter = getRetryAfterMs(err);
      const wait = retryAfter ?? computeBackoff(attempt, cfg);
      console.warn(`[Retry] ${phase} attempt ${attempt + 1} failed, retrying in ${Math.round(wait)}ms`);
      await new Promise((r) => setTimeout(r, wait));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}
