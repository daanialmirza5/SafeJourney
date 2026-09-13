"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/clientApi";
import { DEMO_USER_EMAILS, DEMO_PASSWORD } from "@/lib/demoAccounts";
import { Button } from "@/components/ui/Button";

const QUICK_LOGINS = [
  { label: "Doctor", email: DEMO_USER_EMAILS.doctor, blurb: "Create & track referrals" },
  { label: "Coordinator", email: DEMO_USER_EMAILS.coordinator, blurb: "Receive & manage cases" },
  { label: "Patient", email: DEMO_USER_EMAILS.patient, blurb: "Follow your journey" },
  { label: "Caregiver", email: DEMO_USER_EMAILS.caregiver, blurb: "Support the family" },
  { label: "Follow-up worker", email: DEMO_USER_EMAILS.worker, blurb: "Community handoffs" },
  { label: "Admin", email: DEMO_USER_EMAILS.admin, blurb: "Configure & audit" },
];

export function LoginForm() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(loginEmail: string, loginPassword: string) {
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand">Demo mode — synthetic data</p>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick demo login</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_LOGINS.map((q) => (
            <button
              key={q.email}
              disabled={loading}
              onClick={() => login(q.email, DEMO_PASSWORD)}
              className="rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand hover:bg-brand-soft disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-slate-800">{q.label}</p>
              <p className="text-xs text-slate-500">{q.blurb}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Sign in</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            login(email, password);
          }}
          className="space-y-3"
        >
          <div>
            <label htmlFor={emailId} className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input
              id={emailId}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="you@demo.local"
            />
          </div>
          <div>
            <label htmlFor={passwordId} className="mb-1 block text-xs font-medium text-slate-600">Password</label>
            <input
              id={passwordId}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="demo1234"
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-rose-600">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-xs text-slate-400">All demo accounts use the password &ldquo;{DEMO_PASSWORD}&rdquo;.</p>
      </div>
    </div>
  );
}
