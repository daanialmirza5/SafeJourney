import {
  Home, ClipboardList, Users, BarChart3, Bell, Shield, Settings, QrCode, HeartPulse, FileText, CheckSquare,
} from "lucide-react";
import type { NavItem } from "@/lib/nav";

export function NavIcon({ icon, className }: { icon: NavItem["icon"]; className?: string }) {
  const Icon = {
    home: Home,
    referrals: ClipboardList,
    followup: Users,
    analytics: BarChart3,
    notifications: Bell,
    admin: Shield,
    settings: Settings,
    scan: QrCode,
    journey: HeartPulse,
    documents: FileText,
    tasks: CheckSquare,
  }[icon];
  return <Icon className={className} />;
}
