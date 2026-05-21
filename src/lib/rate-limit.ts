// Simple in-memory rate limiter with TTL-based window expiry.
// Suitable for single-instance deployments (no Redis required).

interface RateLimitEntry {
  attempts: number
  windowStart: number
}

interface RateLimitResult {
  allowed: boolean
  retryAfter: number
}

interface RateLimiter {
  check: (key: string) => RateLimitResult
  reset: (key: string) => void
}

/**
 * Create a rate limiter with the given configuration.
 *
 * @param options.limitPerWindow - Maximum number of requests allowed in the window
 * @param options.windowMs - Time window duration in milliseconds
 *
 * @example
 * ```ts
 * const limiter = rateLimit({ limitPerWindow: 5, windowMs: 60_000 })
 * const { allowed, retryAfter } = limiter.check('user:123')
 * if (!allowed) return errorResponse('RATE_LIMITED', `Try again in ${retryAfter}s`, 429)
 * ```
 */
export function rateLimit(options: {
  limitPerWindow: number
  windowMs: number
}): RateLimiter {
  const store = new Map<string, RateLimitEntry>()
  const { limitPerWindow, windowMs } = options

  // Periodically clean up expired entries to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > windowMs) {
        store.delete(key)
      }
    }
  }, Math.max(windowMs, 60_000)) // Cleanup at least every 60 seconds

  // Allow the timer to not prevent process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }

  return {
    check(key: string): RateLimitResult {
      const now = Date.now()

      let entry = store.get(key)

      // If no entry exists or the window has expired, create a new one
      if (!entry || now - entry.windowStart > windowMs) {
        entry = { attempts: 0, windowStart: now }
        store.set(key, entry)
      }

      entry.attempts += 1

      if (entry.attempts > limitPerWindow) {
        const remainingMs = windowMs - (now - entry.windowStart)
        const retryAfter = Math.ceil(remainingMs / 1000)
        return { allowed: false, retryAfter }
      }

      return { allowed: true, retryAfter: 0 }
    },

    reset(key: string): void {
      store.delete(key)
    },
  }
}
