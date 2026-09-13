import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "./rateLimit";
import { RateLimitError } from "./apiError";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows calls up to the limit within the window", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(() => checkRateLimit(key, 5, 60_000)).not.toThrow();
    }
  });

  it("throws RateLimitError once the limit is exceeded within the window", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60_000);
    expect(() => checkRateLimit(key, 5, 60_000)).toThrow(RateLimitError);
  });

  it("resets the count once the window has elapsed", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60_000);
    vi.advanceTimersByTime(61_000);
    expect(() => checkRateLimit(key, 5, 60_000)).not.toThrow();
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(keyA, 5, 60_000);
    expect(() => checkRateLimit(keyB, 5, 60_000)).not.toThrow();
    expect(() => checkRateLimit(keyA, 5, 60_000)).toThrow(RateLimitError);
  });
});
