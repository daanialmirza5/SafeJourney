import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/EmptyState";
import { CreateReferralForm } from "./CreateReferralForm";

export default async function NewReferralPage() {
  let doctor;
  try {
    doctor = await requireRole("DOCTOR");
  } catch {
    redirect("/dashboard");
  }

  const facilities = await db.facility.findMany({
    where: { id: { not: doctor.facilityId ?? "" }, type: { in: ["RECEIVING", "BOTH"] }, deactivatedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Create Referral" description="Coordinate the handoff -- SafeJourney never generates clinical recommendations." />
      <CreateReferralForm facilities={facilities} />
    </div>
  );
}
