import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import type { DecoratedReferral } from "@/lib/referral/queries";

export function BenefitRadar({ referral }: { referral: DecoratedReferral }) {
  const evaluations = referral.benefitEvaluations.filter((e) => e.result !== "NOT_APPLICABLE");
  if (evaluations.length === 0) {
    return <p className="text-sm text-slate-400">No potentially relevant benefit pathways for this case&apos;s configured rules.</p>;
  }
  return (
    <div className="space-y-3">
      {evaluations.map((evalItem) => {
        const requiredDocs: string[] = JSON.parse(evalItem.requiredDocuments);
        const nextActions: string[] = JSON.parse(evalItem.nextActions);
        return (
          <div key={evalItem.id} className="rounded-lg border border-slate-100 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">{evalItem.benefitRule.name}</p>
              <StatusBadge status={evalItem.result} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{evalItem.reason}</p>
            {requiredDocs.length > 0 && (
              <p className="mt-1.5 text-xs text-slate-600">
                <span className="font-medium">Still needed:</span> {requiredDocs.join(", ")}
              </p>
            )}
            {nextActions.length > 0 && (
              <ul className="mt-1.5 list-inside list-disc text-xs text-slate-500">
                {nextActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
            <a
              href={evalItem.benefitRule.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-brand hover:underline"
            >
              Source · verified {formatDate(evalItem.benefitRule.lastVerified)} <ExternalLink className="size-3" />
            </a>
          </div>
        );
      })}
    </div>
  );
}
