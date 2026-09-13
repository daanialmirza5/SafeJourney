import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAckTimeoutMinutes, getMaternalFollowUpDueDays, isDemoMode } from "@/lib/config";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { formatDateTime } from "@/lib/format";
import { DemoToolsPanel } from "@/components/dashboards/DemoToolsPanel";
import { NOTIFICATION_TEMPLATE_DEFAULTS } from "@/lib/notifications/templates";
import { BenefitRulesTable } from "./BenefitRulesTable";
import { AckTimeoutForm } from "./AckTimeoutForm";
import { NotificationTemplatesPanel } from "./NotificationTemplatesPanel";
import { UsersTable } from "./UsersTable";
import { FacilitiesTable } from "./FacilitiesTable";
import { MilestoneTemplatesTable } from "./MilestoneTemplatesTable";

async function checkDatabaseHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, message: "Connected" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Unreachable" };
  }
}

export default async function AdminPage() {
  let admin;
  try {
    admin = await requireRole("ADMIN");
  } catch {
    redirect("/dashboard");
  }

  const [
    users,
    facilities,
    benefitRules,
    auditLogs,
    ackTimeoutMinutes,
    maternalFollowUpDueDays,
    dbHealth,
    notificationTemplateOverrides,
    referralCount,
    milestoneTemplates,
  ] = await Promise.all([
    db.user.findMany({ orderBy: { role: "asc" }, include: { facility: true } }),
    db.facility.findMany({ orderBy: { name: "asc" } }),
    db.benefitRule.findMany({ orderBy: { name: "asc" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: true } }),
    getAckTimeoutMinutes(),
    getMaternalFollowUpDueDays(),
    checkDatabaseHealth(),
    db.notificationTemplate.findMany(),
    db.referralCase.count(),
    db.newbornMilestoneTemplate.findMany({ orderBy: { offsetDays: "asc" } }),
  ]);

  const overridesByKey = new Map(notificationTemplateOverrides.map((o) => [o.key, o]));
  const notificationTemplates = NOTIFICATION_TEMPLATE_DEFAULTS.map((def) => {
    const override = overridesByKey.get(def.key);
    return {
      key: def.key,
      category: def.category,
      title: override?.title ?? def.title,
      body: override?.body ?? def.body,
      placeholders: def.placeholders,
      isCustomized: Boolean(override),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Panel" description="Users, facilities, benefit rules, referral configuration, audit trail and demo data." />

      <Card>
        <CardHeader title="System health" subtitle="Live checks against this running instance" />
        <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Database" value={dbHealth.ok ? "Connected" : "Unreachable"} tone={dbHealth.ok ? "success" : "danger"} />
          <StatCard label="Mode" value={isDemoMode() ? "Demo" : "Production"} tone={isDemoMode() ? "warning" : "success"} />
          <StatCard label="Total referrals" value={referralCount} />
          <StatCard label="Server uptime" value={`${Math.floor(process.uptime() / 60)}m`} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Demo data" subtitle="Reset regenerates all synthetic facilities, users and referral cases" />
        <CardBody>
          <DemoToolsPanel showReset />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Referral configuration" />
        <CardBody>
          <AckTimeoutForm currentValue={ackTimeoutMinutes} currentMaternalFollowUpDueDays={maternalFollowUpDueDays} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Notification templates" subtitle="Editable copy for every automated notification -- {{placeholders}} are filled in at send time" />
        <CardBody>
          <NotificationTemplatesPanel templates={notificationTemplates} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Benefit rules" subtitle="Enable/disable pathways and update source verification" />
        <CardBody>
          <BenefitRulesTable rules={benefitRules} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Newborn continuity schedule"
          subtitle="Configurable milestone reminders scheduled on every referral with a linked newborn case"
        />
        <CardBody>
          <MilestoneTemplatesTable templates={milestoneTemplates} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Users (${users.length})`} subtitle="Deactivating blocks login and signs the account out immediately -- fully reversible" />
        <CardBody>
          <UsersTable
            currentUserId={admin.id}
            users={users.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              facilityName: u.facility?.name ?? null,
              deactivatedAt: u.deactivatedAt ? u.deactivatedAt.toISOString() : null,
            }))}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Facilities (${facilities.length})`} subtitle="Deactivating hides a facility from new-referral pickers; existing referrals are unaffected" />
        <CardBody>
          <FacilitiesTable
            facilities={facilities.map((f) => ({
              id: f.id,
              name: f.name,
              type: f.type,
              district: f.district,
              state: f.state,
              deactivatedAt: f.deactivatedAt ? f.deactivatedAt.toISOString() : null,
            }))}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Audit trail" subtitle="Most recent 100 events across the system" />
        <CardBody className="max-h-96 overflow-y-auto">
          <ul className="space-y-2">
            {auditLogs.map((log) => (
              <li key={log.id} className="border-b border-slate-100 pb-2 text-xs last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-700">{log.action}</span>
                  <StatusBadge status="PENDING" label={log.entityType} />
                </div>
                <p className="mt-0.5 text-slate-400">
                  {log.actor?.name ?? "System"} · {formatDateTime(log.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
