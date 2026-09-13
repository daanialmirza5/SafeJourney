import type { DocumentExtractionResult } from "@/lib/ai/aiService";

/**
 * OCR / document extraction abstraction (spec sections 15, 41). This is
 * the demo adapter: it produces plausible, structured, illustrative fields
 * without calling any external OCR provider so the app runs with zero
 * credentials. A real adapter (e.g. a cloud OCR API) can implement the
 * same `extractDocument` signature and be swapped in via OCR_PROVIDER.
 *
 * The extraction NEVER writes directly to canonical patient data -- callers
 * must persist results to DocumentExtraction and require explicit user
 * confirmation before any field is treated as authoritative (spec 15/16).
 */

export type DocumentTypeKey =
  | "REFERRAL_NOTE"
  | "IDENTITY_DOCUMENT"
  | "HOSPITAL_DOCUMENT"
  | "ADMINISTRATIVE_FORM"
  | "TRANSPORT_DOCUMENT"
  | "DISCHARGE_DOCUMENT"
  | "BIRTH_DOCUMENT"
  | "BILL_RECEIPT"
  | "ENTITLEMENT_APPLICATION"
  | "UNKNOWN";

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = (Math.imul(1103515245, h) + 12345) | 0;
    return ((h >>> 0) % 1000) / 1000;
  };
}

function fieldTemplate(type: DocumentTypeKey, rand: () => number): Record<string, string> {
  const dateStr = new Date(Date.now() - Math.floor(rand() * 5) * 86400000).toISOString().slice(0, 10);
  switch (type) {
    case "REFERRAL_NOTE":
      return { referringFacility: "Demo Referring Facility", date: dateStr, priority: rand() > 0.6 ? "Urgent" : "Routine" };
    case "IDENTITY_DOCUMENT":
      return { fullName: "[Redacted in demo]", idNumberMasked: `XXXX-XXXX-${Math.floor(rand() * 9000 + 1000)}`, dateOfBirth: "[on file]" };
    case "HOSPITAL_DOCUMENT":
      return { facilityName: "Demo Hospital", admissionDate: dateStr, ward: rand() > 0.5 ? "Maternity Ward" : "General Ward" };
    case "ADMINISTRATIVE_FORM":
      return { formType: "Administrative form", submissionDate: dateStr };
    case "TRANSPORT_DOCUMENT":
      return { vehiclePseudonym: `DEMO-AMB-${Math.floor(rand() * 90 + 10)}`, pickupTime: dateStr };
    case "DISCHARGE_DOCUMENT":
      return { dischargeDate: dateStr, followUpRequired: rand() > 0.3 ? "Yes" : "No" };
    case "BIRTH_DOCUMENT":
      return { sex: rand() > 0.5 ? "Female" : "Male", birthDate: dateStr, birthWeightGrams: `${Math.floor(2400 + rand() * 1200)}` };
    case "BILL_RECEIPT":
      return {
        billNumber: `INV-${Math.floor(rand() * 90000 + 10000)}`,
        totalAmount: `${Math.floor(rand() * 8000 + 500)}`,
        facility: "Demo Hospital Billing Desk",
      };
    case "ENTITLEMENT_APPLICATION":
      return { schemeName: rand() > 0.5 ? "JSSK" : "PMMVY", referenceNumber: `REF-${Math.floor(rand() * 900000 + 100000)}` };
    default:
      return {};
  }
}

/** Best-effort filename-based classification. A real OCR/LLM classifier can
 * replace this while keeping the same return contract. */
export function classifyDocument(filename: string): DocumentTypeKey {
  const name = filename.toLowerCase();
  if (name.includes("referral")) return "REFERRAL_NOTE";
  if (name.includes("id") || name.includes("aadhaar") || name.includes("identity")) return "IDENTITY_DOCUMENT";
  if (name.includes("discharge")) return "DISCHARGE_DOCUMENT";
  if (name.includes("birth")) return "BIRTH_DOCUMENT";
  if (name.includes("bill") || name.includes("receipt") || name.includes("invoice")) return "BILL_RECEIPT";
  if (name.includes("scheme") || name.includes("entitlement") || name.includes("benefit")) return "ENTITLEMENT_APPLICATION";
  if (name.includes("transport") || name.includes("ambulance")) return "TRANSPORT_DOCUMENT";
  if (name.includes("hospital") || name.includes("admission")) return "HOSPITAL_DOCUMENT";
  if (name.includes("form") || name.includes("admin")) return "ADMINISTRATIVE_FORM";
  return "UNKNOWN";
}

export const ocrService = {
  async extractDocument(filename: string, typeHint?: DocumentTypeKey): Promise<DocumentExtractionResult> {
    const documentType = typeHint ?? classifyDocument(filename);
    const rand = seededRandom(filename + documentType);
    const fields = fieldTemplate(documentType, rand);
    return {
      documentType,
      fields,
      confidence: Math.round((0.7 + rand() * 0.22) * 100) / 100,
      warnings: [
        "Demo extraction: values are illustrative and must be reviewed before confirming.",
        ...(documentType === "UNKNOWN" ? ["Could not confidently classify this document type."] : []),
      ],
    };
  },
};
