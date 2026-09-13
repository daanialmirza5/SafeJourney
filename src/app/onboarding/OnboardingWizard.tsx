"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, Globe, ShieldCheck, UserPlus, ArrowRight, Check } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ToastProvider } from "@/components/ui/Toast";
import { Field } from "@/components/ui/Field";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "mr", label: "मराठी (Marathi)" },
];

function WizardBody({
  userName,
  role,
  initialLanguage,
  patientId,
}: {
  userName: string;
  role: string;
  initialLanguage: string;
  patientId: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [language, setLanguage] = useState(initialLanguage);
  const [caregiverEmail, setCaregiverEmail] = useState("");
  const [caregiverName, setCaregiverName] = useState("");
  const [caregiverAdded, setCaregiverAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const steps = useMemo(
    () => ["welcome", "language", ...(role === "PATIENT" && patientId ? ["caregiver"] : []), "consent"],
    [role, patientId]
  );
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  function next() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  async function saveLanguage() {
    if (language === initialLanguage) return next();
    setLoading(true);
    try {
      await apiFetch("/api/users/me", { method: "PATCH", body: JSON.stringify({ language }) });
      next();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save language.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function addCaregiver() {
    if (!caregiverEmail || !caregiverName || !patientId) return next();
    setLoading(true);
    try {
      await apiFetch(`/api/patients/${patientId}/caregivers`, {
        method: "POST",
        body: JSON.stringify({ email: caregiverEmail, name: caregiverName, permission: "VIEW_ONLY" }),
      });
      setCaregiverAdded(true);
      showToast("Caregiver added.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add caregiver.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    setLoading(true);
    try {
      await apiFetch("/api/users/me/complete-onboarding", { method: "POST" });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to finish onboarding.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm">
      <div className="mb-6 flex justify-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className={`h-1.5 w-8 rounded-full ${i <= stepIndex ? "bg-brand" : "bg-slate-200"}`} />
        ))}
      </div>

      {step === "welcome" && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
            <HeartPulse className="size-6" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Welcome, {userName.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-slate-500">
            SafeJourney keeps your referral connected end-to-end -- from your doctor&apos;s decision through to
            follow-up. It coordinates; it never gives medical advice.
          </p>
          <Button className="mt-6 w-full" onClick={next}>
            Get started <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {step === "language" && (
        <div>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
            <Globe className="size-6" />
          </div>
          <h2 className="text-center text-lg font-semibold text-slate-900">Choose your language</h2>
          <p className="mt-1 text-center text-sm text-slate-500">You can change this any time in Settings.</p>
          <div className="mt-5 space-y-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                aria-pressed={language === l.code}
                className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm ${
                  language === l.code ? "border-brand bg-brand-soft font-medium text-brand-dark" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <Button className="mt-6 w-full" loading={loading} onClick={saveLanguage}>
            Continue <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {step === "caregiver" && (
        <div>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
            <UserPlus className="size-6" />
          </div>
          <h2 className="text-center text-lg font-semibold text-slate-900">Add a caregiver (optional)</h2>
          <p className="mt-1 text-center text-sm text-slate-500">
            A family member or friend can help track your referral. You can add or remove caregivers later too.
          </p>
          <div className="mt-5 space-y-2">
            <Field label="Caregiver's name">
              {(id) => (
                <input
                  id={id}
                  value={caregiverName}
                  onChange={(e) => setCaregiverName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  disabled={caregiverAdded}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                />
              )}
            </Field>
            <Field label="Caregiver's email">
              {(id) => (
                <input
                  id={id}
                  type="email"
                  value={caregiverEmail}
                  onChange={(e) => setCaregiverEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={caregiverAdded}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                />
              )}
            </Field>
            {caregiverAdded && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <Check className="size-3.5" /> Caregiver added -- these fields are locked. Continue when you&apos;re ready.
              </p>
            )}
          </div>
          <div className="mt-6 flex gap-2">
            {caregiverAdded ? (
              <Button className="w-full" onClick={next}>
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" className="w-full" onClick={next}>
                  Skip for now
                </Button>
                <Button className="w-full" loading={loading} disabled={!caregiverEmail || !caregiverName} onClick={addCaregiver}>
                  <Check className="size-4" /> Add
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {step === "consent" && (
        <div>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
            <ShieldCheck className="size-6" />
          </div>
          <h2 className="text-center text-lg font-semibold text-slate-900">Who can see your case?</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>• Your doctor and the receiving facility&apos;s coordinator, to coordinate your care.</li>
            <li>• Any caregiver you add, at the access level you choose -- you can revoke this any time in Settings.</li>
            <li>• A follow-up worker, only once assigned after discharge.</li>
            <li>• Administrators, for audited system support only.</li>
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Every access change is recorded in an audit trail. SafeJourney never shares your case outside this list.
          </p>
          <Button className="mt-6 w-full" loading={loading} onClick={finish}>
            I understand -- go to my dashboard <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function OnboardingWizard(props: { userName: string; role: string; initialLanguage: string; patientId: string | null }) {
  return (
    <ToastProvider>
      <WizardBody {...props} />
    </ToastProvider>
  );
}
