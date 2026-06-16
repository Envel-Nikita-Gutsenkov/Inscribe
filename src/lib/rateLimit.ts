interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

function createLimiter(maxTokens: number, refillAmount: number, refillIntervalMs: number) {
  const buckets = new Map<string, TokenBucket>();
  // Entries inactive for 2× refill window are considered stale
  const STALE_AFTER_MS = refillIntervalMs * 2;

  function evictStale(now: number) {
    for (const [ip, b] of buckets) {
      if (now - b.lastRefill > STALE_AFTER_MS) {
        buckets.delete(ip);
      }
    }
  }

  let lastEviction = Date.now();

  return function check(ip: string): boolean {
    const now = Date.now();

    // Periodic eviction — runs at most once per refill window
    if (now - lastEviction > refillIntervalMs) {
      evictStale(now);
      lastEviction = now;
    }

    let bucket = buckets.get(ip);
    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      buckets.set(ip, bucket);
    } else {
      const elapsed = now - bucket.lastRefill;
      const refilled = elapsed * (refillAmount / refillIntervalMs);
      bucket.tokens = Math.min(maxTokens, bucket.tokens + refilled);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    return false;
  };
}

// Auth endpoints: 10 tokens, +3/min
export const checkRateLimit = createLimiter(10, 3, 60_000);

// Search endpoint: 30 tokens, +10/min — more lenient but still bounded
export const checkSearchRateLimit = createLimiter(30, 10, 60_000);
