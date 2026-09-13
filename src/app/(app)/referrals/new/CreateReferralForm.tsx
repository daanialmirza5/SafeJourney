"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-rose-500">
      {" "}
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
    setLoading(true);
    try {
      const data = await apiFetch<{ referral: { id: string; referralCode: string } }>("/api/referrals", {
        method: "POST",
        body: JSON.stringify({
          patient: { name: patientName, sex },
          includeNewborn: includeNewborn ? { name: newbornName || `Baby of ${patientName.split(" ")[0]}`, sex: "Female" } : undefined,
          receivingFacilityId,
          priority,
          transportRequired,
          doctorNote,
          adminNotes: adminNotes || undefined,
        }),
      });
      showToast(`Referral ${data.referral.referralCode} created and sent.`);
      router.push(`/referrals/${data.referral.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create referral.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-xl border border-border bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={patientNameId} className="mb-1 block text-xs font-medium text-slate-600">
            Patient name
            <RequiredMark />
          </label>
          <input
            id={patientNameId}
            required
            data-testid="patient-name"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Ananya Patil"
          />
        </div>
        <div>
          <label htmlFor={sexId} className="mb-1 block text-xs font-medium text-slate-600">Sex</label>
          <select id={sexId} value={sex} onChange={(e) => setSex(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={includeNewborn} onChange={(e) => setIncludeNewborn(e.target.checked)} />
        This referral also includes a linked newborn case
      </label>
      {includeNewborn && (
        <div>
          <label htmlFor={newbornNameId} className="mb-1 block text-xs font-medium text-slate-600">Newborn name (optional)</label>
          <input
            id={newbornNameId}
            value={newbornName}
            onChange={(e) => setNewbornName(e.target.value)}
            placeholder="e.g. Baby of Ananya"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label htmlFor={facilityId} className="mb-1 block text-xs font-medium text-slate-600">
          Receiving facility
          <RequiredMark />
        </label>
        <select
          id={facilityId}
          required
          data-testid="receiving-facility"
          value={receivingFacilityId}
          onChange={(e) => setReceivingFacilityId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select a facility...</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.district}, {f.state})
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={priorityId} className="mb-1 block text-xs font-medium text-slate-600">Priority (clinical judgement, doctor-set)</label>
          <select id={priorityId} value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="ROUTINE">Routine</option>
            <option value="URGENT">Urgent</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            data-testid="transport-required"
            checked={transportRequired}
            onChange={(e) => setTransportRequired(e.target.checked)}
          />
          Transport required
        </label>
      </div>

      <div>
        <label htmlFor={doctorNoteId} className="mb-1 block text-xs font-medium text-slate-600">
          Referral note
          <RequiredMark />
        </label>
        <textarea
          id={doctorNoteId}
          required
          data-testid="doctor-note"
          value={doctorNote}
          onChange={(e) => setDoctorNote(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Administrative/coordination context for the receiving facility. SafeJourney does not generate clinical recommendations."
        />
      </div>

      <div>
        <label htmlFor={adminNotesId} className="mb-1 block text-xs font-medium text-slate-600">Administrative notes (optional)</label>
        <textarea id={adminNotesId} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>

      <p className="text-[11px] text-slate-400">
        <span className="text-rose-500">*</span> Required
      </p>

      <div className="flex gap-3">
        <Button type="submit" data-testid="submit-referral" loading={loading} className="flex-1">
          Create Referral
        </Button>
        <Link
          href="/referrals"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
