# 14. Pilot Plan

## Target: pilotable in 60-90 days

### Days 1-30 — Setup

- Select 2-3 facility pairs (one referring, one receiving) in a single district, ideally already connected
  by an existing informal referral relationship.
- Replace `DATABASE_URL` with a real Postgres instance (see `12_DEPLOYMENT.md`); turn off `DEMO_MODE`.
- Configure `BenefitRule` rows for the pilot state's actual current scheme rules, with a real
  `sourceUrl`/`lastVerified` per rule, reviewed by someone with authority to confirm them (never auto-scraped).
- Onboard doctors, coordinators, and 1-2 ASHA/ANM follow-up workers with real accounts (replace demo seed
  accounts entirely for the pilot database).
- Configure `REFERRAL_ACK_TIMEOUT_MINUTES` to a realistic value for the pilot corridor (the demo default of
  10 minutes is aggressive on purpose, for live demos).

### Days 31-60 — Shadow mode

- Run real referrals through SafeJourney **alongside** the existing paper/phone process, not replacing it
  yet — this de-risks the pilot and builds trust.
- Collect baseline KPI numbers from `/analytics` (handoff time, admin completeness, document completeness,
  follow-up completion, stuck rate) weekly.
- Tune the Rescue Engine timeout based on what "actually stuck" looks like in this corridor versus normal
  variance.
- Get direct facility feedback on the Referral Passport / QR flow at the physical handoff point.

### Days 61-90 — Primary record

- Switch coordinators to treating SafeJourney as the primary referral record for the pilot corridor.
- Review the Closed-Loop Referral Rate against the shadow-mode baseline.
- Decide, with real data, which `16_FUTURE_ROADMAP.md` items are worth building next for this specific
  corridor (e.g. a real transport dispatch integration only if transport coordination shows up as the
  actual bottleneck, not before).

## What must change before a real pilot (do this before, not during, the pilot)

- Real password reset flow, rate limiting on `/api/auth/login`, and a signed-off `JWT_SECRET` rotation plan.
- A real storage backend (S3-compatible) instead of local disk, for durability across deployments.
- A legal/compliance review of the `Consent` model against the specific state's data-protection
  requirements — the current implementation is a reasonable default, not a substitute for that review.
- Sign-off from whoever owns the source benefit-rule data that the seeded `BenefitRule` conditions/documents
  are accurate for the pilot state — this application deliberately never scrapes or infers scheme rules.

## District Pilot Readiness Checklist

- [ ] **Infrastructure**: Production PostgreSQL database provisioned with daily automated backups.
- [ ] **Storage**: S3 / Cloudflare R2 bucket provisioned with bucket-level encryption.
- [ ] **Facility Calibration**: Initial corridor paired with confirmed bed capacity and intake contact points.
- [ ] **Staff Training**: Referring doctors, triage coordinators, and ASHA community workers oriented on the 5-step lifecycle.
- [ ] **QR Printers / Terminals**: Basic thermal or standard A4 printer available at referring PHC/CHC for paper passports.
- [ ] **Helpline Escalation**: Designated district escalation coordinator for handling stalled referrals flagged by the Rescue Engine.
