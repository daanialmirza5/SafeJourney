import Link from "next/link";
import { HeartPulse, QrCode, Phone, ShieldCheck } from "lucide-react";
import { listReferralsForUser } from "@/lib/referral/queries";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { EmptyState, PageHeader } from "@/components/ui/EmptyState";
import { PatientJourney } from "@/components/referral/PatientJourney";
import { StatusBadge } from "@/components/ui/Badge";
import { translate } from "@/lib/i18n/translate";
import type { User } from "@prisma/client";

export async function PatientDashboard({ user }: { user: User }) {
  const referrals = await listReferralsForUser(user);
  const active = referrals.filter((r) => !["CLOSED", "CANCELLED"].includes(r.status));
  const primary = active[0] ?? referrals[0];
  const t = (text: string) => translate(user.language, text);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("My Referral Journey")}
        description={t("Track your care transfer and follow-up in simple, plain language.")}
      />

      {!primary ? (
        <EmptyState
          icon={<HeartPulse className="size-8 text-teal-600" />}
          title={t("No active referral")}
          description={t("When your doctor creates a referral for you, your care journey and next steps will appear here.")}
        />
      ) : (
        <>
          {/* Main Case Card */}
          <Card>
            <CardHeader
              title={`Referral Case ${primary.referralCode}`}
              subtitle={`${primary.referringFacility.name} → ${primary.receivingFacility.name}`}
              action={<StatusBadge status={primary.operationalStatus} />}
            />
            <CardBody className="space-y-4">
              <PatientJourney referral={primary} language={user.language} />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Link
                  href={`/referrals/${primary.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition-colors"
                >
                  <QrCode className="size-4" />
                  {t("Show My Referral Passport QR")}
                </Link>

                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-teal-600" />
                  <span>Privacy Protected · Verified Clinical Record</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Emergency & Support Note */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-start gap-3">
            <Phone className="size-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Need Immediate Assistance?</p>
              <p className="mt-0.5 text-slate-500">
                If your condition or symptoms change unexpectedly, contact your referring facility or local emergency services immediately.
              </p>
            </div>
          </div>

          {referrals.length > 1 && (
            <div>
              <h2 className="mb-3 text-sm font-bold text-slate-900">Past & Other Referrals</h2>
              <div className="space-y-2">
                {referrals.slice(1).map((r) => (
                  <Link key={r.id} href={`/referrals/${r.id}`} className="block rounded-xl border border-border bg-white p-3.5 text-xs shadow-2xs hover:shadow-xs transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{r.referralCode}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-slate-500 mt-1">
                      {r.referringFacility.name} → {r.receivingFacility.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
