import QRCode from "qrcode";
import { PassportActions } from "@/components/referral/PassportActions";
import type { DecoratedReferral } from "@/lib/referral/queries";

export async function PassportCard({ referral }: { referral: DecoratedReferral }) {
  const qrDataUrl = await QRCode.toDataURL(referral.passportToken, { margin: 1, width: 240 });

  return (
    <div className="rounded-xl border border-border bg-white p-5" id="passport-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Referral Passport</p>
          <p className="font-mono text-lg font-semibold text-slate-900">{referral.referralCode}</p>
        </div>
        <PassportActions referralId={referral.id} qrDataUrl={qrDataUrl} />
      </div>
      <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Referral Passport QR code" className="size-40 rounded-lg border border-slate-100" />
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt className="text-slate-400">Originating facility</dt>
          <dd className="text-slate-700">{referral.referringFacility.name}</dd>
          <dt className="text-slate-400">Destination facility</dt>
          <dd className="text-slate-700">{referral.receivingFacility.name}</dd>
          <dt className="text-slate-400">Transport</dt>
          <dd className="text-slate-700">{referral.transportRequired ? referral.transportRequests[0]?.status.replace(/_/g, " ") ?? "Requested" : "Not required"}</dd>
          <dt className="text-slate-400">Documents</dt>
          <dd className="text-slate-700">{referral.documents.filter((d) => d.status === "CONFIRMED").length} confirmed</dd>
          <dt className="text-slate-400">Administrative</dt>
          <dd className="text-slate-700">{referral.administrativeReadiness}% ready</dd>
          <dt className="text-slate-400">Follow-up</dt>
          <dd className="text-slate-700">{referral.followUpTasks.length > 0 ? `${referral.followUpTasks.filter((t) => t.status === "COMPLETED").length}/${referral.followUpTasks.length} complete` : "Not yet assigned"}</dd>
        </dl>
      </div>
      <p className="mt-4 text-[11px] text-slate-400">
        This QR code links only to a secure, opaque referral token -- it never encodes patient data directly. Scanning
        requires an authorized SafeJourney account.
      </p>
    </div>
  );
}
