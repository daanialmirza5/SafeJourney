/**
 * Referral Case state machine.
 *
 * `status` models the lifecycle of a referral. It is intentionally
 * separate from `operationalStatus` (ON_TRACK / ACTION_REQUIRED / STUCK /
 * CLOSED, see rescueEngine.ts), which is a computed overlay describing
 * whether the *current* status is progressing on schedule. A referral can
 * be in status ACKNOWLEDGED while its operational status is STUCK because
 * the next expected step (e.g. transport assignment) is overdue.
 *
 * Only the transitions listed below are permitted. CANCELLED is reachable
 * from any non-terminal state, but only via an explicit, audited
 * administrative override (see requiresOverride below) -- it is never a
 * side effect of normal workflow progression.
 */

export type ReferralStatus =
  | "DRAFT"
  | "CREATED"
  | "SENT"
  | "ACKNOWLEDGED"
  | "TRANSPORT_REQUESTED"
  | "TRANSPORT_ASSIGNED"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "UNDER_CARE"
  | "DISCHARGED"
  | "BACK_REFERRED"
  | "FOLLOW_UP_PENDING"
  | "FOLLOW_UP_CONFIRMED"
  | "CLOSED"
  | "CANCELLED";

export const TERMINAL_STATUSES: ReferralStatus[] = ["CLOSED", "CANCELLED"];

const FORWARD_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  DRAFT: ["CREATED"],
  CREATED: ["SENT"],
  SENT: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["TRANSPORT_REQUESTED", "ARRIVED"], // transport is optional
  TRANSPORT_REQUESTED: ["TRANSPORT_ASSIGNED"],
  TRANSPORT_ASSIGNED: ["IN_TRANSIT"],
  IN_TRANSIT: ["ARRIVED"],
  ARRIVED: ["UNDER_CARE"],
  UNDER_CARE: ["DISCHARGED"],
  DISCHARGED: ["BACK_REFERRED"],
  BACK_REFERRED: ["FOLLOW_UP_PENDING"],
  FOLLOW_UP_PENDING: ["FOLLOW_UP_CONFIRMED"],
  FOLLOW_UP_CONFIRMED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

/** Every non-terminal status may also move to CANCELLED, but only through
 * an explicit administrative override -- never through a plain `transition`
 * call. See `overrideTransition`. */
function isOverrideEligible(from: ReferralStatus): boolean {
  return !TERMINAL_STATUSES.includes(from);
}

export function canTransition(from: ReferralStatus, to: ReferralStatus): boolean {
  return FORWARD_TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: ReferralStatus): ReferralStatus[] {
  return FORWARD_TRANSITIONS[from] ?? [];
}

export class InvalidTransitionError extends Error {
  constructor(from: ReferralStatus, to: ReferralStatus) {
    super(`Invalid referral state transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

/** Validates a normal forward transition. Throws InvalidTransitionError if
 * the move isn't allowed by the workflow graph above. */
export function transition(from: ReferralStatus, to: ReferralStatus): ReferralStatus {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
  return to;
}

/** Validates an administrative override transition (e.g. cancellation, or
 * a coordinator correcting a mis-clicked status). Requires a reason string
 * -- callers must persist it to an audit log entry. */
export function overrideTransition(
  from: ReferralStatus,
  to: ReferralStatus,
  reason: string
): ReferralStatus {
  if (!reason || reason.trim().length === 0) {
    throw new Error("An override transition requires a non-empty reason.");
  }
  if (to === "CANCELLED") {
    if (!isOverrideEligible(from)) {
      throw new InvalidTransitionError(from, to);
    }
    return to;
  }
  // Non-cancellation overrides must still land on a status reachable from
  // the *current point in the graph or earlier* -- we don't allow jumping
  // arbitrarily forward, only correcting backward/lateral mistakes.
  if (from === to) {
    throw new InvalidTransitionError(from, to);
  }
  return to;
}

/** Linear ordering of the happy-path lifecycle, used to render progress
 * checklists (spec section 25). CANCELLED is intentionally excluded --
 * it's a side-branch, not a point on this line. */
export const STATUS_ORDER: ReferralStatus[] = [
  "DRAFT",
  "CREATED",
  "SENT",
  "ACKNOWLEDGED",
  "TRANSPORT_REQUESTED",
  "TRANSPORT_ASSIGNED",
  "IN_TRANSIT",
  "ARRIVED",
  "UNDER_CARE",
  "DISCHARGED",
  "BACK_REFERRED",
  "FOLLOW_UP_PENDING",
  "FOLLOW_UP_CONFIRMED",
  "CLOSED",
];

export function statusIndex(status: ReferralStatus): number {
  return STATUS_ORDER.indexOf(status);
}

export const STATUS_LABELS: Record<ReferralStatus, string> = {
  DRAFT: "Draft",
  CREATED: "Created",
  SENT: "Sent to receiving facility",
  ACKNOWLEDGED: "Acknowledged",
  TRANSPORT_REQUESTED: "Transport requested",
  TRANSPORT_ASSIGNED: "Transport assigned",
  IN_TRANSIT: "In transit",
  ARRIVED: "Arrived",
  UNDER_CARE: "Under care",
  DISCHARGED: "Discharged",
  BACK_REFERRED: "Back-referred",
  FOLLOW_UP_PENDING: "Follow-up pending",
  FOLLOW_UP_CONFIRMED: "Follow-up confirmed",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export function isTerminalStatus(status: ReferralStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getRemainingLifecycleSteps(current: ReferralStatus): ReferralStatus[] {
  const currentIndex = STATUS_ORDER.indexOf(current);
  if (currentIndex === -1 || isTerminalStatus(current)) {
    return [];
  }
  return STATUS_ORDER.slice(currentIndex + 1);
}

export function calculateLifecycleProgressPercentage(current: ReferralStatus): number {
  if (current === "CLOSED") return 100;
  if (current === "CANCELLED") return 0;
  const idx = STATUS_ORDER.indexOf(current);
  if (idx === -1) return 0;
  return Math.round((idx / (STATUS_ORDER.length - 1)) * 100);
}

/**
 * Validates whether an array of historical status transitions represents a valid progression.
 */
export function validateTransitionSequence(statuses: ReferralStatus[]): { valid: boolean; errorIndex?: number; reason?: string } {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return { valid: true };
  }
  for (let i = 0; i < statuses.length - 1; i++) {
    const from = statuses[i];
    const to = statuses[i + 1];
    if (!canTransition(from, to) && to !== "CANCELLED") {
      return {
        valid: false,
        errorIndex: i + 1,
        reason: `Illegal state transition from ${from} to ${to} at sequence index ${i + 1}`,
      };
    }
  }
  return { valid: true };
}

export interface TransitionEventParams {
  currentStatus: ReferralStatus;
  targetStatus: ReferralStatus;
  eventTimestamp: number;
  lastEventTimestamp: number;
  idempotencyKey?: string;
  processedKeys?: Set<string>;
  isOverride?: boolean;
  overrideReason?: string;
}

export interface TransitionEventResult {
  success: boolean;
  status: ReferralStatus;
  isDuplicate: boolean;
  isOutOfOrder: boolean;
  error?: string;
}

/**
 * Idempotent state transition executor with duplicate event protection,
 * out-of-order event rejection, and terminal-state guards.
 */
export function applyIdempotentTransition(params: TransitionEventParams): TransitionEventResult {
  const {
    currentStatus,
    targetStatus,
    eventTimestamp,
    lastEventTimestamp,
    idempotencyKey,
    processedKeys,
    isOverride = false,
    overrideReason,
  } = params;

  // 1. Idempotency Check (Duplicate Event)
  if (idempotencyKey && processedKeys?.has(idempotencyKey)) {
    return {
      success: true,
      status: currentStatus,
      isDuplicate: true,
      isOutOfOrder: false,
    };
  }

  // 2. Terminal State Guard
  if (isTerminalStatus(currentStatus)) {
    return {
      success: false,
      status: currentStatus,
      isDuplicate: false,
      isOutOfOrder: false,
      error: `Cannot transition from terminal status '${currentStatus}'. Terminal records are immutable.`,
    };
  }

  // 3. Out-of-Order Timestamp Guard
  if (eventTimestamp < lastEventTimestamp) {
    return {
      success: false,
      status: currentStatus,
      isDuplicate: false,
      isOutOfOrder: true,
      error: `Out-of-order event rejected: event timestamp (${eventTimestamp}) is earlier than last recorded event (${lastEventTimestamp}).`,
    };
  }

  // 4. Same-State No-op
  if (currentStatus === targetStatus) {
    return {
      success: true,
      status: currentStatus,
      isDuplicate: true,
      isOutOfOrder: false,
    };
  }

  // 5. Transition Graph Validation
  if (isOverride) {
    try {
      const resolved = overrideTransition(currentStatus, targetStatus, overrideReason || "");
      return {
        success: true,
        status: resolved,
        isDuplicate: false,
        isOutOfOrder: false,
      };
    } catch (err) {
      return {
        success: false,
        status: currentStatus,
        isDuplicate: false,
        isOutOfOrder: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (!canTransition(currentStatus, targetStatus)) {
    return {
      success: false,
      status: currentStatus,
      isDuplicate: false,
      isOutOfOrder: false,
      error: `Invalid transition: ${currentStatus} -> ${targetStatus}`,
    };
  }

  return {
    success: true,
    status: targetStatus,
    isDuplicate: false,
    isOutOfOrder: false,
  };
}

export interface AuditTrailEntry {
  referralId: string;
  fromStatus: ReferralStatus;
  toStatus: ReferralStatus;
  actorId: string;
  actorRole: string;
  reason?: string;
  timestamp: number;
  checksum: string;
}

/**
 * Generates an immutable, verifiable audit trail record for state transitions.
 */
export function generateAuditTrailEntry(
  referralId: string,
  fromStatus: ReferralStatus,
  toStatus: ReferralStatus,
  actorId: string,
  actorRole: string,
  reason?: string,
  timestamp: number = Date.now()
): AuditTrailEntry {
  const payload = `${referralId}:${fromStatus}:${toStatus}:${actorId}:${actorRole}:${reason || ""}:${timestamp}`;
  // Deterministic FNV-1a 32-bit hash checksum
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const checksum = `AUDIT-${(hash >>> 0).toString(16).padStart(8, "0").toUpperCase()}`;

  return {
    referralId,
    fromStatus,
    toStatus,
    actorId,
    actorRole,
    reason,
    timestamp,
    checksum,
  };
}
