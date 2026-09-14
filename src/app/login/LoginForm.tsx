"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  Building2,
  Users,
  ShieldCheck,
  HeartPulse,
  Lock,
  Mail,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { DEMO_USER_EMAILS, DEMO_PASSWORD } from "@/lib/demoAccounts";
import { Button } from "@/components/ui/Button";

const EVALUATION_PERSONAS = [
  {
    role: "Referring Clinic Doctor",
    name: "Dr. Meera Kulkarni",
    facility: "Sunrise Community Health Centre",
    email: DEMO_USER_EMAILS.doctor,
    icon: Stethoscope,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Initiate maternal & newborn referrals, upload clinical records, track outbound cases.",
  },
  {
    role: "Hospital Intake Coordinator",
    name: "Arjun Deshmukh",
    facility: "Riverbend Women & Newborn Hospital",
    email: DEMO_USER_EMAILS.coordinator,
    icon: Building2,
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Acknowledge inbound cases, coordinate emergency transport, record arrival & discharge.",
  },
  {
    role: "Community Health Worker (ASHA)",
    name: "Meera Bai",
    facility: "Asha Community Care Team",
    email: DEMO_USER_EMAILS.worker,
    icon: Users,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Manage postpartum home visits, newborn immunization and growth check-ins.",
  },
  {
    role: "System Administrator",
    name: "District Health Admin",
    facility: "District Maternal Coordination Cell",
    email: DEMO_USER_EMAILS.admin,
    icon: ShieldCheck,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Manage facilities, users, scheme rules, notification templates, and audit logs.",
  },
  {
    role: "Patient Portal",
    name: "Ananya Patil",
    facility: "Patient & Family View",
    email: DEMO_USER_EMAILS.patient,
    icon: HeartPulse,
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    description: "Access plain-language journey updates, digital QR passport, and entitlements.",
  },
];

export function LoginForm() {
  const router = useRouter();
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const phoneId = useId();
  const roleId = useId();

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("PATIENT");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(true);

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
      setError(err instanceof Error ? err.message : "Authentication failed. Please verify your email and password.");
    } finally {
      setLoading(null);
    }
  }

  async function register() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading("register");
    setError(null);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          phone: phone.trim() || undefined,
        }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  function fillCredentials(fillEmail: string) {
    setEmail(fillEmail);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Primary Clean Auth Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-xs space-y-6">
        {/* Auth Mode Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setError(null);
              }}
              className={`rounded-lg px-5 py-1.5 transition-all ${
                authMode === "login" ? "bg-white text-brand shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setError(null);
              }}
              className={`rounded-lg px-5 py-1.5 transition-all ${
                authMode === "register" ? "bg-white text-brand shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
            <span>SafeJourney Platform</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {authMode === "login" ? "Sign In to SafeJourney" : "Create SafeJourney Account"}
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {authMode === "login"
              ? "Enter your credentials to access your referral coordination workspace."
              : "Register a patient or clinical coordinator account to track referral journeys."}
          </p>
        </div>

        {authMode === "login" ? (
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
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-slate-400"
                placeholder="name@facility.org"
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
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800">
                <ShieldAlert className="size-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading === "form"} className="w-full py-3 text-sm font-semibold rounded-xl">
              Sign In to Workplace
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              register();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor={nameId} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Users className="size-3.5 text-slate-400" />
                Full Name
              </label>
              <input
                id={nameId}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-slate-400"
                placeholder="e.g. Ananya Patil"
              />
            </div>

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
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-slate-400"
                placeholder="patient@example.com"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-slate-400"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label htmlFor={roleId} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <ShieldCheck className="size-3.5 text-slate-400" />
                  Account Role
                </label>
                <select
                  id={roleId}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
                >
                  <option value="PATIENT">Patient (Family / Individual)</option>
                  <option value="DOCTOR">Doctor (Referring Clinician)</option>
                  <option value="COORDINATOR">Intake Coordinator</option>
                  <option value="FOLLOWUP">Community Health Worker (ASHA)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor={phoneId} className="mb-1.5 block text-xs font-semibold text-slate-700">
                Phone Number (Optional)
              </label>
              <input
                id={phoneId}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-slate-400"
                placeholder="+91 98765 43210"
              />
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800">
                <ShieldAlert className="size-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading === "register"} className="w-full py-3 text-sm font-semibold rounded-xl">
              Create SafeJourney Account
            </Button>
          </form>
        )}
      </div>

      {/* Collapsible Evaluation & Testing Access */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition-all">
        <button
          type="button"
          onClick={() => setShowEvaluation(!showEvaluation)}
          className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-brand" />
            <span>Evaluation &amp; Demonstration Access</span>
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 font-medium">Sample Roles</span>
          </div>
          {showEvaluation ? <ChevronUp className="size-4 text-slate-500" /> : <ChevronDown className="size-4 text-slate-500" />}
        </button>

        {showEvaluation && (
          <div className="mt-3.5 space-y-2 pt-2 border-t border-slate-200/60">
            <p className="text-[11px] text-slate-500 mb-2">
              Click any role below to sign in instantly as that persona, or fill the credentials above.
            </p>
            <div className="grid gap-2">
              {EVALUATION_PERSONAS.map((p) => {
                const Icon = p.icon;
                const isLoggingIn = loading === p.role;
                return (
                  <div
                    key={p.email}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-2xs transition-all hover:border-brand-border hover:shadow-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-brand-soft group-hover:text-brand-dark transition-colors">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-slate-900">{p.name}</p>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${p.badgeColor}`}>
                            {p.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{p.facility}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => fillCredentials(p.email)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        Fill
                      </button>
                      <button
                        type="button"
                        disabled={loading !== null}
                        onClick={() => login(p.email, DEMO_PASSWORD, p.role)}
                        className="flex items-center gap-1 rounded-lg bg-brand px-3 py-1 text-[11px] font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50 shadow-2xs"
                      >
                        {isLoggingIn ? (
                          <span className="size-3 animate-spin rounded-full border border-white border-t-transparent" />
                        ) : (
                          <>
                            <span>1-Click Sign In</span>
                            <ArrowRight className="size-3" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

