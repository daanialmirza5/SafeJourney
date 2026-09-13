/**
 * Internal knowledge layer (spec section 43). In the MVP this is a small,
 * in-repo, keyword-searchable set of structured summaries -- not verbatim
 * copies of external legal text. It stands in for a future pgvector-backed
 * RAG index (see docs/16_FUTURE_ROADMAP.md); the retrieval interface below
 * is written so that swap can happen without touching call sites.
 */

export interface KnowledgeDoc {
  id: string;
  title: string;
  benefitName: string;
  content: string;
  source: string;
  sourceUrl: string;
  jurisdiction: string;
  effectiveDate: string;
  lastVerified: string;
  keywords: string[];
}

export const KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  {
    id: "kb-jssk",
    title: "Janani Shishu Suraksha Karyakram (JSSK) — administrative overview",
    benefitName: "JSSK",
    content:
      "JSSK is a government entitlement pathway intended to remove out-of-pocket expenses for pregnant women and sick newborns at public health facilities, including free transport between facilities, free diagnostics, medicines and diet during the stay. Availability and exact coverage can vary by state and facility.",
    source: "Ministry of Health & Family Welfare (configured demo summary)",
    sourceUrl: "https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=822&lid=222",
    jurisdiction: "National (state-administered)",
    effectiveDate: "2011-06-01",
    lastVerified: "2026-01-15",
    keywords: ["jssk", "free transport", "free delivery", "newborn free care", "no out of pocket"],
  },
  {
    id: "kb-pmmvy",
    title: "Pradhan Mantri Matru Vandana Yojana (PMMVY) — administrative overview",
    benefitName: "PMMVY",
    content:
      "PMMVY is a maternity benefit cash-transfer pathway for eligible pregnant and lactating women, intended as partial compensation for wage loss. It typically requires registration, identity documentation and health-facility visit records. Eligibility conditions and amounts are configured per current scheme rules.",
    source: "Ministry of Women & Child Development (configured demo summary)",
    sourceUrl: "https://pmmvy.wcd.gov.in/",
    jurisdiction: "National",
    effectiveDate: "2017-01-01",
    lastVerified: "2026-01-15",
    keywords: ["pmmvy", "maternity benefit", "cash transfer", "registration"],
  },
  {
    id: "kb-jsy",
    title: "Janani Suraksha Yojana (JSY) — administrative overview",
    benefitName: "JSY",
    content:
      "JSY is a safe-motherhood cash-assistance pathway intended to promote institutional delivery, with amounts and eligibility rules varying by state (rural/urban) and facility type. It is typically linked to ASHA facilitation and identity/beneficiary documentation.",
    source: "National Health Mission (configured demo summary)",
    sourceUrl: "https://nhm.gov.in/index1.php?lang=1&level=2&sublinkid=841&lid=309",
    jurisdiction: "National (state-administered)",
    effectiveDate: "2005-04-12",
    lastVerified: "2026-01-15",
    keywords: ["jsy", "institutional delivery", "asha", "safe motherhood"],
  },
  {
    id: "kb-referral-passport",
    title: "What is a Referral Passport?",
    benefitName: "PRODUCT",
    content:
      "A Referral Passport is SafeJourney's secure digital record for a single referral journey. It carries a QR code linked to an opaque access token -- never raw patient data -- so a receiving facility can look up the referral after authorization.",
    source: "SafeJourney product documentation",
    sourceUrl: "internal://docs/01_PRODUCT_OVERVIEW.md",
    jurisdiction: "N/A",
    effectiveDate: "2026-01-01",
    lastVerified: "2026-01-01",
    keywords: ["passport", "qr", "scan", "referral id"],
  },
];

export function searchKnowledgeBase(query: string, limit = 3): KnowledgeDoc[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return [];

  const scored = KNOWLEDGE_DOCS.map((doc) => {
    const haystack = `${doc.title} ${doc.content} ${doc.keywords.join(" ")}`.toLowerCase();
    const score = terms.reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0);
    return { doc, score };
  }).filter((s) => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.doc);
}
