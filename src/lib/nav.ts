import type { RoleName } from "@/lib/types/enums";

export interface NavItem {
  href: string;
  label: string;
  icon: "home" | "referrals" | "followup" | "analytics" | "notifications" | "admin" | "settings" | "scan" | "journey" | "documents" | "tasks";
}

export const NAV_BY_ROLE: Record<RoleName, NavItem[]> = {
  DOCTOR: [
    { href: "/dashboard", label: "Dashboard", icon: "home" },
    { href: "/referrals", label: "Referrals", icon: "referrals" },
    { href: "/scan", label: "Scan & Lookup", icon: "scan" },
    { href: "/notifications", label: "Notifications", icon: "notifications" },
    { href: "/analytics", label: "Analytics", icon: "analytics" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ],
  COORDINATOR: [
    { href: "/dashboard", label: "Dashboard", icon: "home" },
    { href: "/referrals", label: "Referrals", icon: "referrals" },
    { href: "/scan", label: "Scan & Lookup", icon: "scan" },
    { href: "/notifications", label: "Notifications", icon: "notifications" },
    { href: "/analytics", label: "Analytics", icon: "analytics" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ],
  PATIENT: [
    { href: "/dashboard", label: "My Journey", icon: "journey" },
    { href: "/notifications", label: "Notifications", icon: "notifications" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ],
  CAREGIVER: [
    { href: "/dashboard", label: "Linked Cases", icon: "journey" },
    { href: "/notifications", label: "Notifications", icon: "notifications" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ],
  FOLLOWUP: [
    { href: "/dashboard", label: "Follow-Up Tasks", icon: "followup" },
    { href: "/referrals", label: "Referrals", icon: "referrals" },
    { href: "/scan", label: "Scan & Lookup", icon: "scan" },
    { href: "/notifications", label: "Notifications", icon: "notifications" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: "home" },
    { href: "/referrals", label: "Referrals", icon: "referrals" },
    { href: "/admin", label: "Admin Panel", icon: "admin" },
    { href: "/analytics", label: "Analytics", icon: "analytics" },
    { href: "/scan", label: "Scan & Lookup", icon: "scan" },
    { href: "/notifications", label: "Notifications", icon: "notifications" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ],
};

export const ROLE_LABELS: Record<RoleName, string> = {
  DOCTOR: "Doctor / Clinician",
  COORDINATOR: "Intake Coordinator",
  PATIENT: "Patient",
  CAREGIVER: "Caregiver",
  FOLLOWUP: "Community Health Worker",
  ADMIN: "System Administrator",
};
