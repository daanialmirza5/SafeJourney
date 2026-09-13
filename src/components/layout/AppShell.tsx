"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
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

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
          <div className="flex items-center gap-2 border-b border-border px-5 py-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">S</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">SafeJourney</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-brand">Demo mode</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-brand-soft text-brand-dark" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <NavIcon icon={item.icon} className="size-4" />
                  {t(item.label)}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border px-4 py-4">
            <p className="truncate text-sm font-medium text-slate-800">{userName}</p>
            <p className="text-xs text-slate-500">
              {t(ROLE_LABELS[role])}
              {facilityName ? ` · ${facilityName}` : ""}
            </p>
            <button onClick={logout} className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600">
              <LogOut className="size-3.5" /> Log out
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 md:px-6">
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex size-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">S</div>
              <span className="text-sm font-semibold">SafeJourney</span>
            </div>
            <div className="hidden flex-1 md:block">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <button
                onClick={logout}
                aria-label="Log out"
                className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-rose-600 md:hidden"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-8">{children}</main>

          <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface md:hidden">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                    active ? "text-brand" : "text-slate-500"
                  }`}
                >
                  <NavIcon icon={item.icon} className="size-5" />
                  {t(item.label)}
                </Link>
              );
            })}
          </nav>
        </div>
        <AiCopilot />
      </div>
    </ToastProvider>
  );
}
