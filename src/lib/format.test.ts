import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatDuration } from "./format";

describe("shared date/time formatting", () => {
  const sample = new Date("2026-03-15T14:30:00Z");

  it("formatDate accepts a Date or an ISO string and returns the same result", () => {
    expect(formatDate(sample)).toBe(formatDate(sample.toISOString()));
  });

  it("formatDate does not include a time component", () => {
    expect(formatDate(sample)).not.toMatch(/:/);
  });

  it("formatDateTime includes both a date and a time component", () => {
    const result = formatDateTime(sample);
    expect(result).toMatch(/:/); // has a time portion
    expect(result.length).toBeGreaterThan(formatDate(sample).length);
  });

  it("formatDateTime accepts a Date or an ISO string and returns the same result", () => {
    expect(formatDateTime(sample)).toBe(formatDateTime(sample.toISOString()));
  });
});

describe("formatDuration", () => {
  it("renders under an hour in minutes", () => {
    expect(formatDuration(15)).toBe("15 minutes");
    expect(formatDuration(1)).toBe("1 minute");
  });

  it("renders under two days in hours", () => {
    expect(formatDuration(90)).toBe("2 hours");
    expect(formatDuration(60)).toBe("1 hour");
  });

  it("renders two days or more in days -- this is the case that matters for a", () => {
    // multi-month follow-up wait: without this, the Rescue Engine's
    // minutesWaiting would render as an unreadable five-digit number.
    expect(formatDuration(90 * 24 * 60)).toBe("90 days");
    expect(formatDuration(48 * 60)).toBe("2 days");
  });
});
