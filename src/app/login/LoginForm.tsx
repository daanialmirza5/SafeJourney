"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, Building2, Users, ShieldCheck, HeartPulse, ArrowRight, Lock, Mail } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { DEMO_USER_EMAILS, DEMO_PASSWORD } from "@/lib/demoAccounts";
import { Button } from "@/components/ui/Button";

const WORKPLACE_PERSONAS = [
  {
    role: "Referring Clinic Staff",
    name: "Dr. Ananya Rao",
    facility: "Hillside Demo PHC",
    email: DEMO_USER_EMAILS.doctor,
    icon: Stethoscope,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Initiate maternal/newborn transfers, attach records, track outbound cases.",
  },
  {
    role: "Receiving Hospital Staff",
    name: "Suresh Patil",
    facility: "Metro Maternal Hospital",
    email: DEMO_USER_EMAILS.coordinator,
    icon: Building2,
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Triage inbound referrals, manage emergency transport, record arrival & discharge.",
  },
  {
    role: "Community Health Worker",
    name: "Sunita Devi (ASHA)",
    facility: "Hillside Catchment Area",
    email: DEMO_USER_EMAILS.worker,
    icon: Users,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Execute postpartum home visits, newborn immunization and growth check-ins.",
  },
  {
    role: "System Administrator",
    name: "District Health Admin",
    facility: "District Coordination Cell",
    email: DEMO_USER_EMAILS.admin,
    icon: ShieldCheck,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Manage facilities, users, benefit rules, notification templates, and audit logs.",
  },
  {
    role: "Patient & Family Portal",
    name: "Ananya Patil",
    facility: "Patient View",
    email: DEMO_USER_EMAILS.patient,
    icon: HeartPulse,
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    description: "Access plain-language journey updates, digital QR passport, and support notes.",
  },
];

export function LoginForm() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function login(loginEmail: string, loginPassword: string, label: string = "manual") {
    setLoading(label);
    setError(null);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Top Header Card */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
          <span>SafeJourney Coordination Platform</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          Sign In to Workplace
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Select a verified healthcare staff persona for 1-click evaluation, or sign in with your email.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Quick Persona Switcher (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Evaluator Personas (1-Click Access)
            </h2>
            <span className="text-[11px] font-medium text-slate-400">Password: {DEMO_PASSWORD}</span>
          </div>

          <div className="grid gap-2.5">
            {WORKPLACE_PERSONAS.map((p) => {
              const Icon = p.icon;
              const isLoggingIn = loading === p.role;
              return (
                <button
                  key={p.email}
                  disabled={loading !== null}
                  onClick={() => login(p.email, DEMO_PASSWORD, p.role)}
                  className="group relative flex items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-white p-3.5 text-left shadow-2xs transition-all hover:border-brand hover:shadow-xs hover:bg-slate-50/50 disabled:opacity-50"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-brand-soft group-hover:text-brand-dark transition-colors">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${p.badgeColor}`}>
                          {p.role}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{p.facility}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center text-slate-400 group-hover:text-brand group-hover:translate-x-0.5 transition-all">
                    {isLoggingIn ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Direct Sign-In Form (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-white p-6 shadow-xs">
          <div className="mb-5 space-y-1">
            <h2 className="text-base font-bold text-slate-900">Custom Credentials</h2>
            <p className="text-xs text-slate-500">Sign in with any authorized account email.</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              login(email, password, "form");
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor={emailId} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Mail className="size-3.5 text-slate-400" />
                Email Address
              </label>
              <input
                id={emailId}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
                placeholder="doctor@demo.local"
              />
            </div>

            <div>
              <label htmlFor={passwordId} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Lock className="size-3.5 text-slate-400" />
                Password
              </label>
              <input
                id={passwordId}
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading === "form"} className="w-full py-2.5">
              Sign In to Workspace
            </Button>
          </form>

          <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
            <p className="text-[11px] text-slate-500">
              Demo sandbox initialized with real referral data across primary, community, and tertiary hospitals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
