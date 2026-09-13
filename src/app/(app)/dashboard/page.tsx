import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DoctorDashboard } from "@/components/dashboards/DoctorDashboard";
import { CoordinatorDashboard } from "@/components/dashboards/CoordinatorDashboard";
import { PatientDashboard } from "@/components/dashboards/PatientDashboard";
import { CaregiverDashboard } from "@/components/dashboards/CaregiverDashboard";
import { FollowUpDashboard } from "@/components/dashboards/FollowUpDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  switch (user.role) {
    case "DOCTOR":
      return <DoctorDashboard user={user} />;
    case "COORDINATOR":
      return <CoordinatorDashboard user={user} />;
    case "PATIENT":
      return <PatientDashboard user={user} />;
    case "CAREGIVER":
      return <CaregiverDashboard user={user} />;
    case "FOLLOWUP":
      return <FollowUpDashboard user={user} />;
    case "ADMIN":
      return <AdminDashboard user={user} />;
    default:
      return null;
  }
}
