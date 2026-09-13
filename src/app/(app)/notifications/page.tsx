import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/EmptyState";
import { NotificationList } from "./NotificationList";
import { BellRing } from "lucide-react";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Referral, transport, document, administrative and follow-up updates." />
      {notifications.length === 0 ? (
        <EmptyState icon={<BellRing className="size-8" />} title="No notifications yet" />
      ) : (
        <NotificationList initialNotifications={notifications} />
      )}
    </div>
  );
}
