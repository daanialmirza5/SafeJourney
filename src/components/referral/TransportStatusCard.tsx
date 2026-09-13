import { Truck } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import type { DecoratedReferral } from "@/lib/referral/queries";

const STEPS = ["REQUESTED", "ASSIGNED", "EN_ROUTE_TO_PICKUP", "PICKED_UP", "IN_TRANSIT", "ARRIVED"];

export function TransportStatusCard({ referral }: { referral: DecoratedReferral }) {
  if (!referral.transportRequired) {
    return <p className="text-sm text-slate-400">Transport was not requested for this referral.</p>;
  }
  const transport = referral.transportRequests[0];
  if (!transport) {
    return <p className="text-sm text-slate-400">Transport has not been requested yet.</p>;
  }
  const stepIndex = STEPS.indexOf(transport.status);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-slate-400" />
          <span className="text-sm text-slate-700">{transport.assignedVehiclePseudo ?? "Vehicle not yet assigned"} (demo mode)</span>
        </div>
        <StatusBadge status={transport.status} />
      </div>
      {transport.etaMinutes && <p className="mb-3 text-xs text-slate-500">ETA: {transport.etaMinutes} minutes</p>}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => (
          <div key={step} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-brand" : "bg-slate-100"}`} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
        <span>Requested</span>
        <span>Arrived</span>
      </div>
    </div>
  );
}
