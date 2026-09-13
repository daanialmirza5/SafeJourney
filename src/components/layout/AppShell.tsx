"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PlusCircle, Building2, UserCircle2 } from "lucide-react";
import { NavIcon } from "@/components/layout/icons";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AiCopilot } from "@/components/layout/AiCopilot";
import { ToastProvider } from "@/components/ui/Toast";
import { ROLE_LABELS, type NavItem } from "@/lib/nav";
import type { RoleName } from "@/lib/types/enums";
import { apiFetch } from "@/lib/clientApi";
import { translate } from "@/lib/i18n/translate";

export function AppShell({
  navItems,
  userName,
  role,
  facilityName,
  language = "en",
  children,
}: {
  navItems: NavItem[];
  userName: string;
  role: RoleName;
  facilityName?: string | null;
  language?: string;
  children: React.ReactNode;
}) {
  const t = (text: string) => translate(language, text);
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isStaff = role === "DOCTOR" || role === "COORDINATOR" || role === "ADMIN";

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex shadow-xs">
          {/* App Logo */}
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-base font-bold text-white shadow-xs">
              SJ
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">SafeJourney</p>
              <p className="text-[11px] text-slate-500 font-medium">Referral Workplace</p>
            </div>
          </div>

          {/* Quick Action for Clinical / Coordination Staff */}
          {isStaff && (
            <div className="px-3 pt-4 pb-2">
              <Link
                href="/referrals/new"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-brand-dark"
              >
                <PlusCircle className="size-4" />
                <span>{t("New Referral")}</span>
              </Link>
            </div>
          )}

          {/* Main Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-3">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-brand-soft text-brand-dark font-semibold shadow-2xs border-l-2 border-brand"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <NavIcon icon={item.icon} className={`size-4.5 ${active ? "text-brand" : "text-slate-400"}`} />
                  <span>{t(item.label)}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile Card */}
          <div className="border-t border-border bg-slate-50/50 p-4">
            <div className="flex items-start gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark font-semibold text-xs border border-brand-border">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900">{userName}</p>
                <div className="mt-0.5 flex flex-col gap-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-dark">
                    <UserCircle2 className="size-3 shrink-0" />
                    <span className="truncate">{ROLE_LABELS[role]}</span>
                  </span>
                  {facilityName && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 truncate" title={facilityName}>
                      <Building2 className="size-3 shrink-0 text-slate-400" />
                      <span className="truncate">{facilityName}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-600 shadow-2xs transition-colors hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
            >
              <LogOut className="size-3.5" />
              <span>{t("Log out")}</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-h-screen flex-1 flex-col">
          {/* Top Bar Header */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur-md md:px-6 shadow-2xs">
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex size-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
                SJ
              </div>
              <span className="text-sm font-semibold tracking-tight text-slate-900">SafeJourney</span>
            </div>

            <div className="hidden flex-1 md:block max-w-md">
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={logout}
                aria-label="Log out"
                className="flex size-8 items-center justify-center rounded-lg border border-border text-slate-500 hover:bg-slate-100 hover:text-rose-600 md:hidden"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </header>

          {/* Page View Body */}
          <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-12 max-w-7xl w-full mx-auto">{children}</main>

          {/* Mobile Bottom Navigation */}
          <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 backdrop-blur-md md:hidden shadow-lg">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                    active ? "text-brand font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <NavIcon icon={item.icon} className="size-5" />
                  <span className="truncate max-w-[60px]">{t(item.label)}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Assistive AI Copilot Drawer */}
        <AiCopilot />
      </div>
    </ToastProvider>
  );
}
