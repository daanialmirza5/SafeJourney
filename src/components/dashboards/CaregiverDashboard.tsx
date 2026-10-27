import { Users } from "lucide-react";
import { listReferralsForUser } from "@/lib/referral/queries";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { EmptyState, PageHeader } from "@/components/ui/EmptyState";
import { translate } from "@/lib/i18n/translate";
import type { User } from "@prisma/client";

export async function CaregiverDashboard({ user }: { user: User }) {
  const referrals = await listReferralsForUser(user);
  const t = (text: string) => translate(user.language, text);

  return (
    <div className="space-y-6">
      <PageHeader title={t("Linked cases")} description={t("Cases you've been added to as a caregiver.")} />
      {referrals.length === 0 ? (
        <EmptyState
          icon={<Users className="size-8" />}
          title={t("No linked cases yet")}
          description={t("When a patient adds you as a caregiver, their referral will appear here.")}
        />
      ) : (
        <div className="space-y-3">
          {referrals.map((r) => (
            <ReferralCard key={r.id} referral={r} />
          ))}
        </div>
      )}
    </div>
  );
}
