import { RateLimitError } from "@/lib/apiError";

/**
 * Minimal in-memory token-bucket rate limiter (spec section 48). Adequate
 * for the single-process deployment target of this MVP (see
 * docs/03_TRD.md) -- a real multi-instance deployment would move this
 * state into Redis behind the same `checkRateLimit()` signature.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Periodically forget old buckets so this Map never grows unbounded.
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > windowMs) buckets.delete(key);
  }
}

/** Throws RateLimitError if `key` has exceeded `limit` calls within
 * `windowMs`. Call at the very top of a route handler, before any
 * expensive work (password hashing, DB queries). */
export function checkRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw new RateLimitError("Too many attempts. Please wait a moment and try again.");
  }
}

/** Best-effort caller identity for rate limiting when no authenticated
 * user exists yet (e.g. login). Never trust this for authorization -- only
 * for throttling. */
export function clientKeyFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
