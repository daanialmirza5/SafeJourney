import { db } from "@/lib/db";

export interface AuditEventInput {
  actorId: string | null;
  actorRole: string | null;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

/** Every state-changing action in SafeJourney writes an audit log entry.
 * See spec section 32. Never skip this for actions on the tracked list. */
export async function recordAuditEvent(input: AuditEventInput) {
  return db.auditLog.create({
    data: {
      actorId: input.actorId,
      actorRole: input.actorRole,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      oldValue: input.oldValue !== undefined ? JSON.stringify(input.oldValue) : null,
      newValue: input.newValue !== undefined ? JSON.stringify(input.newValue) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

/**
 * Generates a human-readable summary of an audit event for governance dashboards.
 */
export function formatAuditEventSummary(event: {
  action: string;
  actorRole: string | null;
  entityType: string;
}): string {
  const actor = event.actorRole ? event.actorRole.replace(/_/g, " ").toLowerCase() : "system";
  const action = event.action.replace(/_/g, " ").toLowerCase();
  const entity = event.entityType.toLowerCase();
  return `${actor.charAt(0).toUpperCase() + actor.slice(1)} performed ${action} on ${entity}`;
}
