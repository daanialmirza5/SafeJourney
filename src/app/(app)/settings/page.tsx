import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/EmptyState";
import { ROLE_LABELS } from "@/lib/nav";
import type { RoleName } from "@/lib/types/enums";
import { LanguageForm } from "./LanguageForm";
import { CaregiverManager } from "./CaregiverManager";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const patient = user.role === "PATIENT" ? await db.patient.findUnique({ where: { userId: user.id } }) : null;
  const caregivers = patient
    ? await db.caregiverAccess.findMany({ where: { patientId: patient.id, revokedAt: null }, include: { user: true } })
    : [];

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" />

      <Card>
        <CardHeader title="Profile" />
        <CardBody className="space-y-2 text-sm">
          <p>
            <span className="text-slate-400">Name:</span> {user.name}
          </p>
          <p>
            <span className="text-slate-400">Email:</span> {user.email}
          </p>
          <p>
            <span className="text-slate-400">Role:</span> {ROLE_LABELS[user.role as RoleName]}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Language" subtitle="English, Hindi (हिन्दी) and Marathi (मराठी) are supported" />
        <CardBody>
          <LanguageForm currentLanguage={user.language} />
        </CardBody>
      </Card>

      {patient && (
        <Card>
          <CardHeader title="Caregivers & consent" subtitle="Who can access my case, and why" />
          <CardBody>
            <CaregiverManager patientId={patient.id} initialCaregivers={caregivers} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
