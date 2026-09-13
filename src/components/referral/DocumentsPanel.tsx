"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Sparkles, Check, X, ExternalLink, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/Badge";

const DOCUMENT_TYPES = [
  ["REFERRAL_NOTE", "Referral note"],
  ["IDENTITY_DOCUMENT", "Identity document"],
  ["HOSPITAL_DOCUMENT", "Hospital document"],
  ["ADMINISTRATIVE_FORM", "Administrative form"],
  ["TRANSPORT_DOCUMENT", "Transport document"],
  ["DISCHARGE_DOCUMENT", "Discharge document"],
  ["BIRTH_DOCUMENT", "Birth document"],
  ["BILL_RECEIPT", "Bill / receipt"],
  ["ENTITLEMENT_APPLICATION", "Entitlement application"],
] as const;

interface DocExtraction {
  documentType: string;
  fields: string;
  confidence: number;
  warnings: string;
}
interface Doc {
  id: string;
  originalName: string;
  type: string;
  status: string;
  extraction: DocExtraction | null;
}

export function DocumentsPanel({
  referralId,
  initialDocuments,
  canReview,
}: {
  referralId: string;
  initialDocuments: Doc[];
  /** Whether the viewer may confirm/reject documents -- an administrative-
   * completeness decision restricted to staff managing the case (see
   * docs/stage-11-document-permission-decision.md). Patients/caregivers
   * still see every document, its status, and can view the file; they just
   * don't get the review controls, keeping the UI consistent with what the
   * API now enforces. */
  canReview: boolean;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [typeHint, setTypeHint] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { showToast } = useToast();

  function updateDoc(id: string, patch: Partial<Doc>) {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function upload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("referralId", referralId);
      form.append("file", file);
      if (typeHint) form.append("typeHint", typeHint);
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Upload failed.");
      setDocuments((prev) => [{ ...data.document, extraction: null }, ...prev]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showToast("Document uploaded.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function extract(doc: Doc) {
    setBusyId(doc.id);
    try {
      const data = await apiFetch<{ extraction: DocExtraction }>(`/api/documents/${doc.id}/extract`, { method: "POST" });
      updateDoc(doc.id, { status: "EXTRACTED", extraction: data.extraction, type: data.extraction.documentType });
      showToast("Document extracted -- please review before confirming.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Extraction failed.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function confirm(doc: Doc) {
    setBusyId(doc.id);
    try {
      await apiFetch(`/api/documents/${doc.id}/confirm`, { method: "POST", body: JSON.stringify({}) });
      updateDoc(doc.id, { status: "CONFIRMED" });
      showToast("Document confirmed and attached to the Referral Passport.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Confirmation failed.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(doc: Doc) {
    const reason = window.prompt("Why are you rejecting this document?");
    if (!reason) return;
    setBusyId(doc.id);
    try {
      await apiFetch(`/api/documents/${doc.id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
      updateDoc(doc.id, { status: "REJECTED" });
      showToast("Document rejected.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reject document.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 p-3 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          data-testid="document-file-input"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          aria-label="Choose a document file to upload"
          className="flex-1 text-xs"
        />
        <select
          value={typeHint}
          onChange={(e) => setTypeHint(e.target.value)}
          aria-label="Document type"
          className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"
        >
          <option value="">Auto-detect type</option>
          {DOCUMENT_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          data-testid="upload-document"
          onClick={upload}
          disabled={uploading}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Upload
        </button>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-slate-400">No documents uploaded yet.</p>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => {
            const fields: Record<string, string> = doc.extraction ? JSON.parse(doc.extraction.fields) : {};
            const warnings: string[] = doc.extraction ? JSON.parse(doc.extraction.warnings) : [];
            const busy = busyId === doc.id;
            return (
              <li key={doc.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-slate-400" />
                    <span className="truncate text-sm font-medium text-slate-800">{doc.originalName}</span>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <a
                    href={`/api/documents/${doc.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline"
                  >
                    View file <ExternalLink className="size-3" />
                  </a>
                  <span className="text-[11px] text-slate-400">{doc.type.replace(/_/g, " ").toLowerCase()}</span>
                </div>

                {doc.status === "UPLOADED" && (
                  <button
                    data-testid="extract-document"
                    onClick={() => extract(doc)}
                    disabled={busy}
                    className="mt-2 flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} Extract information
                  </button>
                )}

                {doc.status === "EXTRACTED" && doc.extraction && (
                  <div className="mt-2 rounded-md bg-slate-50 p-3">
                    <p className="mb-1.5 text-xs font-medium text-slate-600">Review extracted information</p>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      {Object.entries(fields).map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-slate-400">{k}</dt>
                          <dd className="text-slate-700">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    {warnings.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-[11px] text-amber-700">
                        {warnings.map((w, i) => (
                          <li key={i}>⚠ {w}</li>
                        ))}
                      </ul>
                    )}
                    {canReview ? (
                      <div className="mt-2 flex gap-2">
                        <button
                          data-testid="confirm-document"
                          onClick={() => confirm(doc)}
                          disabled={busy}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check className="size-3.5" /> Confirm
                        </button>
                        <button
                          onClick={() => reject(doc)}
                          disabled={busy}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <X className="size-3.5" /> Reject
                        </button>
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] text-slate-400">Awaiting review by the care team.</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
