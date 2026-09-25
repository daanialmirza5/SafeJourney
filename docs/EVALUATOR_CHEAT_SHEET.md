# SafeJourney Evaluator Cheatsheet

Quick evaluation reference guide for hackathon judges, mentors, and reviewers.

---

## ⚡ 1-Minute Live Orientation

- **Live URL**: [https://safejourney-w7dz.onrender.com](https://safejourney-w7dz.onrender.com)
- **Demo Mode**: Instant 1-click role switcher on `/login` — no credentials needed.
- **Core Principle**: *"AI explains. Rules verify. Humans decide."*

---

## 🎭 Evaluation Personas

| Persona | Name | Role & Scope | Key Workflow to Test |
|---|---|---|---|
| **Referring Doctor** | Dr. Meera Kulkarni | Primary Health Centre (PHC) | Create referral, view Benefit Radar, track outbound passport. |
| **Hospital Coordinator** | Arjun Deshmukh | District Hospital Intake | Triage inbound referrals, request ambulance, record inpatient arrival & discharge. |
| **ASHA Worker** | Meera Bai | Community Health Worker | Review post-discharge newborn milestones, complete home visit check-ins. |
| **Patient** | Ananya Patil | Referred Mother | View plain-language journey updates in English, Hindi, or Marathi; view QR token. |
| **System Admin** | Health Admin | District Governance | Inspect live immutable audit log, configure benefit rules, manage facility capacity. |

---

## ⏱️ 3-Minute Fast-Track Scenario

1. **Open Application**: Click **Launch Demo** from the landing page.
2. **Referring Doctor**:
   - Click **Referring Clinic Doctor**.
   - Click **New Referral**.
   - Select patient, target hospital (*Riverbend Women & Newborn Hospital*), and reason (*Pre-eclampsia with severe features*).
   - Notice the **Instant Benefit Radar** showing eligible welfare schemes (*JSSK 100% cashless transfer* and *PMMVY*).
   - Click **Submit & Dispatch Referral**.
3. **QR Referral Passport**:
   - Open the new referral to view the **Opaque QR Passport** and **Administrative Readiness Score**.
4. **Receiving Coordinator**:
   - Switch role to **Hospital Intake Coordinator**.
   - Click **Accept Referral**, assign transport, and click **Confirm Patient Arrival**.
5. **Discharge & Back-Referral**:
   - Click **Discharge Patient** and generate structured back-referral.
6. **ASHA Follow-Up**:
   - Switch to **Community Health Worker (ASHA)**.
   - Complete Day 3 and Day 7 postpartum home visit check-ins.
   - Observe automatic closed-loop transition to **CLOSED**.

---

## 🛡️ Safety Boundaries (Verified in Code)

- **Clinical Question Blocker**: Try typing a medical question like *"What dosage of magnesium sulfate should I give?"* into the AI assistant — the system refuses deterministically via `src/lib/ai/safety.ts`.
- **RBAC Server Enforcement**: Non-authorized roles cannot access unassigned patient records (returns `403 Forbidden` at API layer).
- **Opaque Tokenization**: QR codes contain UUID lookup tokens, not plain-text patient PII.
- **Immutable Audit Trail**: All state transitions are logged with actor, role, and before/after state diffs.

---

## 📊 Analytics & Impact

Visit `/analytics` as District Health Admin to view:
- **Closed-Loop Referral Rate** (%)
- **Median Referral-to-Acknowledgment Time**
- **Corridor Bottleneck Analysis**
