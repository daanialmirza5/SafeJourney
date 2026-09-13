/** Generates human-readable referral codes like MR-2026-10482 (spec section 8). */
export function generateReferralCode(now: Date = new Date()): string {
  const year = now.getFullYear();
  const sequence = Math.floor(10000 + Math.random() * 89999);
  return `MR-${year}-${sequence}`;
}

/** Generates an opaque passport token for QR / secure lookup. Never encodes
 * patient data -- it is purely a random lookup key (spec section 10). */
export function generatePassportToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
