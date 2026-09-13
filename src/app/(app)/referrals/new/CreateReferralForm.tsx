"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User, Baby, Building2, Stethoscope, Truck, Sparkles
} from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-rose-500 font-bold ml-0.5">
      *
    </span>
  );
}

interface Facility {
  id: string;
  name: string;
  district: string;
  state: string;
}

export function CreateReferralForm({ facilities }: { facilities: Facility[] }) {
  const router = useRouter();
  const { showToast } = useToast();

  const patientNameId = useId();
  const sexId = useId();
  const newbornNameId = useId();
  const facilityId = useId();
  const priorityId = useId();
  const doctorNoteId = useId();
  const adminNotesId = useId();

  const [loading, setLoading] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [sex, setSex] = useState("Female");
  const [includeNewborn, setIncludeNewborn] = useState(false);
  const [newbornName, setNewbornName] = useState("");
  const [receivingFacilityId, setReceivingFacilityId] = useState("");
  const [priority, setPriority] = useState("ROUTINE");
  const [transportRequired, setTransportRequired] = useState(false);
  const [doctorNote, setDoctorNote] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientName.trim() || !receivingFacilityId || !doctorNote.trim()) {
      showToast("Please fill in all required fields marked with *", "error");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{ referral: { id: string; referralCode: string } }>("/api/referrals", {
        method: "POST",
        body: JSON.stringify({
          patient: { name: patientName, sex },
          includeNewborn: includeNewborn
            ? { name: newbornName || `Baby of ${patientName.split(" ")[0]}`, sex: "Female" }
            : undefined,
          receivingFacilityId,
          priority,
          transportRequired,
          doctorNote,
          adminNotes: adminNotes || undefined,
        }),
      });

      showToast(`Referral ${data.referral.referralCode} created and sent successfully.`);
      router.push(`/referrals/${data.referral.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create referral.", "error");
      setLoading(false);
    }
  }

  // --- Main Form Render ---
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Initiate Maternal / Newborn Referral</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Follow the guided sections to register the referral, trigger Benefit Radar scheme matching, and generate the Digital Referral Passport.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Section 1: Patient Information */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="size-4 text-brand" />
            <h2 className="text-sm font-bold text-slate-900">1. Patient & Case Identification</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={patientNameId} className="mb-1 block text-xs font-semibold text-slate-700">
                Patient Full Name <RequiredMark />
              </label>
              <input
                id={patientNameId}
                data-testid="patient-name"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Pooja Sharma"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label htmlFor={sexId} className="mb-1 block text-xs font-semibold text-slate-700">
                Sex
              </label>
              <select
                id={sexId}
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Newborn Continuity Option */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={includeNewborn}
                onChange={(e) => setIncludeNewborn(e.target.checked)}
                className="mt-0.5 size-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Baby className="size-3.5 text-brand" /> Link Newborn Continuity Care
                </span>
                <p className="text-[11px] text-slate-500">
                  Automatically schedules post-discharge newborn home visits, immunization checkpoints, and growth monitoring.
                </p>
              </div>
            </label>

            {includeNewborn && (
              <div className="pt-2 pl-7">
                <label htmlFor={newbornNameId} className="mb-1 block text-[11px] font-semibold text-slate-700">
                  Newborn Name / Label (Optional)
                </label>
                <input
                  id={newbornNameId}
                  value={newbornName}
                  onChange={(e) => setNewbornName(e.target.value)}
                  placeholder="e.g. Baby of Pooja Sharma"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-brand"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Destination & Facility Selection */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="size-4 text-brand" />
            <h2 className="text-sm font-bold text-slate-900">2. Receiving Facility Destination</h2>
          </div>

          <div>
            <label htmlFor={facilityId} className="mb-1 block text-xs font-semibold text-slate-700">
              Select Receiving Hospital <RequiredMark />
            </label>
            <select
              id={facilityId}
              data-testid="receiving-facility"
              required
              value={receivingFacilityId}
              onChange={(e) => setReceivingFacilityId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">-- Choose destination facility --</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.district}, {f.state})
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-slate-500">
              The selected facility&apos;s intake coordinator will be notified immediately upon submission.
            </p>
          </div>
        </div>

        {/* Section 3: Clinical & Administrative Coordination Notes */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Stethoscope className="size-4 text-brand" />
            <h2 className="text-sm font-bold text-slate-900">3. Coordination Notes & Priority</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={priorityId} className="mb-1 block text-xs font-semibold text-slate-700">
                Case Priority / Urgency
              </label>
              <select
                id={priorityId}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="ROUTINE">Routine Transfer (Standard handoff)</option>
                <option value="URGENT">Urgent (Requires bed prep)</option>
                <option value="EMERGENCY">Emergency (Immediate intake team)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Transport Logistics
              </label>
              <label className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  data-testid="transport-required"
                  checked={transportRequired}
                  onChange={(e) => setTransportRequired(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <span className="flex items-center gap-1.5">
                  <Truck className="size-3.5 text-brand" /> Emergency Transport Required
                </span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor={doctorNoteId} className="mb-1 block text-xs font-semibold text-slate-700">
              Reason for Transfer & Clinical Coordination Summary <RequiredMark />
            </label>
            <textarea
              id={doctorNoteId}
              data-testid="doctor-note"
              required
              rows={3}
              value={doctorNote}
              onChange={(e) => setDoctorNote(e.target.value)}
              placeholder="e.g. Referred for higher obstetric care and neonatal observation. Patient stable in transit."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Administrative and operational notes for the receiving team. Does not replace primary physical clinical chart.
            </p>
          </div>

          <div>
            <label htmlFor={adminNotesId} className="mb-1 block text-xs font-semibold text-slate-700">
              Administrative & Welfare Scheme Notes (Optional)
            </label>
            <input
              id={adminNotesId}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. Beneficiary of JSSK and PMMVY; Aadhaar copy attached."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Section 4: Live Benefit Radar Preview Notice */}
        <div className="rounded-xl border border-brand-border bg-brand-soft/60 p-4 flex items-start gap-3">
          <Sparkles className="size-5 text-brand shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-brand-dark">Automated Scheme Entitlement Discovery (Benefit Radar)</p>
            <p className="text-slate-600">
              Upon creation, SafeJourney automatically evaluates matching criteria for Janani Shishu Suraksha Karyakram (JSSK), PMMVY, and Ayushman Bharat (PM-JAY) to prepare the administrative documentation checklist.
            </p>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/referrals"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            data-testid="submit-referral"
            loading={loading}
            className="px-6 py-2.5 text-xs font-semibold"
          >
            Initiate & Transmit Referral
          </Button>
        </div>
      </form>
    </div>
  );
}
