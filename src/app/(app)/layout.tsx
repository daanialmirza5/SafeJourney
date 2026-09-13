import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { NAV_BY_ROLE } from "@/lib/nav";
import type { RoleName } from "@/lib/types/enums";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = user.role as RoleName;
  if ((role === "PATIENT" || role === "CAREGIVER") && !user.onboardedAt) redirect("/onboarding");

  const facility = user.facilityId ? await db.facility.findUnique({ where: { id: user.facilityId } }) : null;

  return (
    <AppShell navItems={NAV_BY_ROLE[role]} userName={user.name} role={role} facilityName={facility?.name} language={user.language}>
      {children}
    </AppShell>
  );
}
