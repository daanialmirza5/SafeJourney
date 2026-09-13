"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { AnalyticsData } from "@/lib/analytics/computeAnalytics";

const STATUS_SHORT_LABELS: Record<string, string> = {
  CREATED: "Created",
  SENT: "Sent",
  ACKNOWLEDGED: "Ack'd",
  TRANSPORT_REQUESTED: "Transport req.",
  TRANSPORT_ASSIGNED: "Transport asg.",
  IN_TRANSIT: "In transit",
  ARRIVED: "Arrived",
  UNDER_CARE: "Under care",
  DISCHARGED: "Discharged",
  BACK_REFERRED: "Back-referred",
  FOLLOW_UP_PENDING: "Follow-up pending",
  FOLLOW_UP_CONFIRMED: "Follow-up confirmed",
  CLOSED: "Closed",
};

export function FunnelChart({ funnel }: { funnel: AnalyticsData["funnel"] }) {
  const data = funnel.map((f) => ({ name: STATUS_SHORT_LABELS[f.status] ?? f.status, count: f.count }));
  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 8 }} aria-label="Referral funnel bar chart">
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={70} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#0e7c74" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Accessible/text alternative to the chart above -- same data, readable
          by a screen reader or anyone who'd rather scan numbers than bars. */}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">View as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400">
              <th className="pb-1 font-medium">Stage reached</th>
              <th className="pb-1 font-medium">Referrals</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.name} className="border-t border-slate-100">
                <td className="py-1">{row.name}</td>
                <td className="py-1 text-slate-600">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
