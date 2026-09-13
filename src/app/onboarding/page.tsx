import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "PATIENT" && user.role !== "CAREGIVER") redirect("/dashboard");
  if (user.onboardedAt) redirect("/dashboard");

  const patient = user.role === "PATIENT" ? await db.patient.findUnique({ where: { userId: user.id } }) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <OnboardingWizard userName={user.name} role={user.role} initialLanguage={user.language} patientId={patient?.id ?? null} />
    </div>
  );
}
