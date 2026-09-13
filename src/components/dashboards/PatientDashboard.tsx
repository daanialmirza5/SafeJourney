import Link from "next/link";
import { HeartPulse, ArrowRight } from "lucide-react";
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
      <PageHeader title={t("My Journey")} description={t("Your referral, in plain language.")} />

      {!primary ? (
        <EmptyState
          icon={<HeartPulse className="size-8" />}
          title={t("No referral yet")}
          description={t("When your doctor creates a referral for you, it will appear here with your next steps.")}
        />
      ) : (
        <>
          <Card>
            <CardHeader
              title={primary.referralCode}
              subtitle={`${primary.referringFacility.name} → ${primary.receivingFacility.name}`}
              action={<StatusBadge status={primary.operationalStatus} />}
            />
            <CardBody>
              <PatientJourney referral={primary} language={user.language} />
              <Link
                href={`/referrals/${primary.id}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                {t("View full details, documents & Referral Passport")} <ArrowRight className="size-3.5" />
              </Link>
            </CardBody>
          </Card>

          {referrals.length > 1 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Other referrals</h2>
              <div className="space-y-2">
                {referrals.slice(1).map((r) => (
                  <Link key={r.id} href={`/referrals/${r.id}`} className="block rounded-lg border border-border bg-white p-3 text-sm hover:shadow-sm">
                    <span className="font-mono">{r.referralCode}</span> · {r.receivingFacility.name}
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
