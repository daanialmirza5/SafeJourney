/**
 * Shared date/time display formatting. Before this, call sites used a mix
 * of bare `toLocaleString()` (no options -- locale-dependent, includes
 * seconds in some browsers), `toLocaleDateString()`, and one explicit
 * `{ dateStyle: "medium", timeStyle: "short" }` call, so the same kind of
 * timestamp could render differently on different screens. One place to
 * change the format going forward.
 */

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Renders a "minutes waiting" duration in whatever unit reads naturally --
 * minutes, hours, or days. The Rescue Engine's minutesWaiting can now be a
 * genuinely large number (a referral in FOLLOW_UP_PENDING can wait weeks),
 * where "14520 minutes" is unreadable but "10 days" is immediately clear. */
export function formatDuration(minutes: number): string {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (minutes < 60) return plural(Math.round(minutes), "minute");
  const hours = minutes / 60;
  if (hours < 48) return plural(Math.round(hours), "hour");
  const days = hours / 24;
  return plural(Math.round(days), "day");
}
