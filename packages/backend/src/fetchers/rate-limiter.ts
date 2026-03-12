// Token-bucket rate limiter for external API calls.
// Usage: await limiter.throttle() before each request.

export class RateLimiter {
  private tokens: number
  private queue: Array<() => void> = []

  constructor(private readonly maxPerMinute: number) {
    this.tokens = maxPerMinute
    setInterval(() => {
      this.tokens = maxPerMinute
      this.flush()
    }, 60_000)
  }

  throttle(): Promise<void> {
    if (this.tokens > 0) {
      this.tokens--
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.queue.push(resolve)
    })
  }

  private flush(): void {
    while (this.tokens > 0 && this.queue.length > 0) {
      this.tokens--
      this.queue.shift()!()
    }
  }
}

// 25 req/min — stays comfortably under GeckoTerminal free tier (30/min)
export const geckoTerminalLimiter = new RateLimiter(25)
