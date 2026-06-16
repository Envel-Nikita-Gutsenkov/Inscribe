import { describe, it, expect, vi } from "vitest";
import { checkRateLimit } from "../src/lib/rateLimit";

describe("Rate Limiter (Token-Bucket)", () => {
  it("should allow requests up to MAX_TOKENS (10)", () => {
    const ip = "1.2.3.4";
    
    // First 10 requests should succeed
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(ip)).toBe(true);
    }
    
    // The 11th request should be rate-limited
    expect(checkRateLimit(ip)).toBe(false);
  });

  it("should separate limits for different IPs", () => {
    const ip1 = "10.0.0.1";
    const ip2 = "10.0.0.2";

    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(ip1)).toBe(true);
    }
    expect(checkRateLimit(ip1)).toBe(false);

    // ip2 should still be allowed since it has its own bucket
    expect(checkRateLimit(ip2)).toBe(true);
  });

  it("should refill tokens over time", () => {
    const ip = "192.168.1.1";
    
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      checkRateLimit(ip);
    }
    expect(checkRateLimit(ip)).toBe(false);

    // Fake passing of time by mocking Date.now()
    const originalNow = Date.now;
    const now = originalNow();
    
    // 20 seconds later (should refill 20 * (3 / 60) = 1 token)
    Date.now = () => now + 20000;
    expect(checkRateLimit(ip)).toBe(true);
    expect(checkRateLimit(ip)).toBe(false); // second one should fail again

    // Restore original Date.now
    Date.now = originalNow;
  });
});
