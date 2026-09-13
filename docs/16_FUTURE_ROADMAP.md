# 16. Future Roadmap

Ordered roughly by "would unlock the most value for a real pilot first," not by build difficulty. Items
originally listed here that have since been implemented (rate limiting, the Playwright E2E suite, the
onboarding wizard, notification template management, real Hindi/Marathi coverage of the patient-facing
experience, soft-delete for users/facilities, admin deactivate/reactivate/create for users/facilities, and
a real S3-compatible storage adapter) have moved to `docs/15_LIMITATIONS.md`, which documents what's real
and what's still partial.

## Near-term (unlocks a real pilot)

1. **Postgres migration** — flip `prisma/schema.prisma`'s datasource provider, regenerate migrations, point
   `DATABASE_URL` at a managed instance. Mechanically simple (documented in `12_DEPLOYMENT.md`); the value
   is concurrent multi-instance deployment and durable backups.
2. **A real OCR provider adapter** behind `ocrService` — the interface (`extractDocument(filename,
   typeHint) -> { documentType, fields, confidence, warnings }`) is already the contract a real cloud OCR
   API would need to satisfy.
3. **A real notification provider** (SMS/WhatsApp Business API, transactional email) behind
   `getEmailProvider()`/`getWhatsAppProvider()` — same story, interface-first. The editable-template layer
   (`NotificationTemplate`) is already in place and would apply unchanged to a real provider's sends.
4. **Verify the S3 storage adapter against a real bucket** (AWS S3 or a MinIO/R2/Spaces instance) — the code
   is complete (`src/lib/storage/providers/s3.ts`) but has only been exercised via its local fallback path
   in this environment, which has no S3 credentials.
5. **Move the rate limiter's state to Redis** once this becomes a multi-instance deployment — the
   `checkRateLimit(key, limit, windowMs)` call sites wouldn't need to change, only the implementation
   backing them.

## Medium-term (deepens the product)

6. **pgvector-backed knowledge base** replacing the keyword-overlap `searchKnowledgeBase()` — same call
   signature, real embedding similarity search, larger curated document set covering more schemes and more
   states.
7. **Distinct ASHA/ANM persona** — a `FOLLOWUP` sub-type with its own permission surface (e.g. visit-log
   fields) rather than reusing the generic follow-up worker role.
8. **Real transport dispatch integration** — only after a pilot's KPI data (see `14_PILOT_PLAN.md`) actually
   shows transport coordination, not acknowledgement delay, as the bottleneck.
9. **Full Hindi/Marathi UI coverage** across every provider-facing surface (currently real but concentrated
   on the patient/caregiver experience + nav — see `docs/15_LIMITATIONS.md`), plus the pre-login landing
   and login pages once there's a language preference to read before a session exists (e.g. a
   `localStorage`-backed toggle).
10. **Admin edit/create for individual user accounts** (name, role, facility reassignment) — the admin panel
    can deactivate/reactivate a user and create/deactivate/reactivate a facility, but not yet edit or create
    a user account directly from the UI (accounts are currently created via the "Add caregiver" flow, the
    onboarding path, or the seed script).

## Longer-term

11. **Soft-delete + archival for referral cases** older than a configurable retention window — deliberately
    out of scope for `User`/`Facility`-style soft-delete (see `docs/15_LIMITATIONS.md` for why referrals stay
    permanent/audit-preserving), but an archival *tier* (not a delete) could still make sense at real scale.
12. **Get `e2e/admin-and-onboarding.spec.ts` to a confirmed-green run.** The spec exists, typechecks, and its
    facility-CRUD test has passed twice — but its notification-template-edit and deactivate→onboard tests
    haven't been confirmed passing in this session; three attempts each hit a different random UI-wait
    timeout correlated with severe, independently-observed memory pressure on this specific development
    machine (see `11_TESTING_STRATEGY.md`). Re-run on a machine with headroom (or in CI) before trusting it
    as a merge gate.
13. **Multi-facility, multi-district scale-out** — once a single pilot corridor is proven, generalize the
    facility/benefit-rule seed data model to onboard new districts/states without code changes (this is
    already close: `BenefitRule.state` and `Facility.state/district` are already data, not code).
