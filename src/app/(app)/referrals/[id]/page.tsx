import { notFound } from "next/navigation";
import { getCurrentUser, ForbiddenError } from "@/lib/auth";
import { db } from "@/lib/db";
import { getReferralOrThrow } from "@/lib/referral/referralService";
import { canAccessReferral } from "@/lib/referral/access";
import { decorateOperationalStatus } from "@/lib/referral/decorate";
import { getAckTimeoutMinutes } from "@/lib/config";
import { STATUS_LABELS } from "@/lib/referral/stateMachine";
import { formatDuration, formatDateTime } from "@/lib/format";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/EmptyState";
import { PatientJourney } from "@/components/referral/PatientJourney";
import { PassportCard } from "@/components/referral/PassportCard";
import { ReferralTimeline } from "@/components/referral/ReferralTimeline";
import { AdministrativeChecklist } from "@/components/referral/AdministrativeChecklist";
import { BenefitRadar } from "@/components/referral/BenefitRadar";
import { TransportStatusCard } from "@/components/referral/TransportStatusCard";
import { DocumentsPanel } from "@/components/referral/DocumentsPanel";
import { ReferralActions } from "@/components/referral/ReferralActions";
import { FollowUpPanel } from "@/components/referral/FollowUpPanel";
import { RescueActionsPanel } from "@/components/referral/RescueActionsPanel";
import type { RoleName } from "@/lib/types/enums";

export default async function ReferralDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) notFound();

  let referral;
  try {
    referral = await getReferralOrThrow(params.id);
  } catch {
    notFound();
  }
  if (!(await canAccessReferral(user, referral))) {
    throw new ForbiddenError("You do not have access to this referral.");
  }

  const ackTimeoutMinutes = await getAckTimeoutMinutes();
  const decorated = decorateOperationalStatus(referral, ackTimeoutMinutes);
  const role = user.role as RoleName;
  const isReferringFacility = user.facilityId === referral.referringFacilityId;
  const isReceivingFacility = user.facilityId === referral.receivingFacilityId;
  const followUpWorkers = await db.user.findMany({ where: { role: "FOLLOWUP" }, select: { id: true, name: true } });

  const isPatientFacing = role === "PATIENT" || role === "CAREGIVER";
  // Mirrors the confirm/reject API's own requireRole -- FOLLOWUP is not
  // patient-facing but also isn't staff authorized to make document
  // completeness decisions, so it can't just reuse !isPatientFacing here.
  const canReviewDocuments = role === "DOCTOR" || role === "COORDINATOR" || role === "ADMIN";

  return (
    <div className="space-y-6">
      <PageHeader
        title={referral.referralCode}
        description={`${referral.patient.pseudonym} · ${referral.referringFacility.name} → ${referral.receivingFacility.name}`}
        action={
          <div className="flex flex-wrap gap-2">
            <PriorityBadge priority={referral.priority} />
            <StatusBadge status={decorated.operationalStatus} />
          </div>
        }
      />

      {decorated.operationalStatus === "STUCK" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">Referral Rescue: this case needs attention</p>
          <p className="mt-1 text-xs">{decorated.operationalStatusReason} ({formatDuration(decorated.minutesWaiting)} waiting) -- this is an operational flag only, not a clinical assessment.</p>
          {!isPatientFacing && role !== "FOLLOWUP" && <RescueActionsPanel referralId={referral.id} />}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {isPatientFacing ? (
            <Card>
              <CardHeader title="Your journey" subtitle={STATUS_LABELS[referral.status as keyof typeof STATUS_LABELS]} />
              <CardBody>
                <PatientJourney referral={decorated} language={user.language} />
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Referral timeline" subtitle="Full audit history of this case" />
              <CardBody>
                <ReferralTimeline referral={decorated} />
              </CardBody>
            </Card>
          )}

          {!isPatientFacing && (
            <Card>
              <CardHeader title="Actions" subtitle="Only actions valid for the current status and your role are shown" />
              <CardBody>
                <ReferralActions
                  referralId={referral.id}
                  status={referral.status}
                  transportRequired={referral.transportRequired}
                  transportRequests={referral.transportRequests}
                  role={role}
                  isReferringFacility={isReferringFacility}
                  isReceivingFacility={isReceivingFacility}
                  followUpWorkers={followUpWorkers}
                />
              </CardBody>
            </Card>
          )}

          {referral.dischargedAt && (
            <Card>
              <CardHeader title="Discharge coordination" subtitle="Administrative record only -- not a medical fitness determination" />
              <CardBody className="space-y-1 text-sm">
                <p>
                  <span className="text-slate-400">Recorded:</span> {formatDateTime(referral.dischargedAt)}
                </p>
                <p>
                  <span className="text-slate-400">Destination / next care location:</span>{" "}
                  {referral.dischargeDestination ?? <span className="text-slate-400">Not recorded</span>}
                </p>
              </CardBody>
            </Card>
          )}

          {referral.backReferral && (
            <Card>
              <CardHeader title="Back-referral" subtitle="Created → origin facility notified → acknowledged → follow-up assigned" />
              <CardBody className="space-y-1 text-sm">
                <p>
                  <span className="text-slate-400">Sent:</span>{" "}
                  {referral.backReferral.sentAt ? formatDateTime(referral.backReferral.sentAt) : "Not yet sent"}
                </p>
                <p>
                  <span className="text-slate-400">Origin facility acknowledged:</span>{" "}
                  {referral.backReferral.acknowledgedAt ? (
                    formatDateTime(referral.backReferral.acknowledgedAt)
                  ) : (
                    <span className="font-medium text-amber-700">Awaiting acknowledgment</span>
                  )}
                </p>
                <p>
                  <span className="text-slate-400">Family notified:</span> {referral.backReferral.familyNotified ? "Yes" : "No linked patient/caregiver account"}
                </p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Documents" subtitle="Upload, review extracted fields, and confirm before they're attached to the passport" />
            <CardBody>
              <DocumentsPanel referralId={referral.id} initialDocuments={referral.documents} canReview={canReviewDocuments} />
            </CardBody>
          </Card>

          {referral.transportRequired && (
            <Card>
              <CardHeader title="Transport" subtitle="Simulated coordination -- demo mode" />
              <CardBody>
                <TransportStatusCard referral={decorated} />
              </CardBody>
            </Card>
          )}

          {!isPatientFacing && referral.followUpTasks.length > 0 && (
            <Card>
              <CardHeader
                title="Follow-up & newborn continuity"
                subtitle="Community follow-up, administrative handoffs, and (when applicable) the newborn continuity schedule"
              />
              <CardBody>
                <FollowUpPanel tasks={referral.followUpTasks} role={role} userId={user.id} />
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <PassportCard referral={decorated} />

          <Card>
            <CardHeader title="Administrative continuity" />
            <CardBody>
              <AdministrativeChecklist referral={decorated} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Benefit Radar" subtitle="Potentially applicable pathways -- always verify" />
            <CardBody>
              <BenefitRadar referral={decorated} />
            </CardBody>
          </Card>

          {referral.doctorNote && (
            <Card>
              <CardHeader title="Doctor's referral note" />
              <CardBody>
                <p className="text-sm text-slate-600">{referral.doctorNote}</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
