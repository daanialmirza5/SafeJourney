"use client";

import { useId, type ReactNode } from "react";

/**
 * Pairs a visible label with its control via a generated id/htmlFor, which
 * nothing in this codebase did before (every <label> was a visual sibling
 * of its input, not programmatically associated -- a real gap for screen
 * readers, and it meant clicking/tapping a label didn't focus its input
 * for anyone). Renders the control via a render-prop so the caller can
 * spread the id onto whatever element they need (input/select/textarea).
 */
export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {required && (
          <span aria-hidden="true" className="text-rose-500">
            {" "}
            *
          </span>
        )}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
