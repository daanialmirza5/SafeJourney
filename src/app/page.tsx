import Link from "next/link";
import {
  ArrowRight, ClipboardCheck, Truck, QrCode, Wallet, Baby, ShieldCheck, CalendarClock,
  CheckCircle2, AlertTriangle, HeartPulse,
} from "lucide-react";

const JOURNEY_STEPS = [
  { title: "Refer", desc: "Doctor creates a referral in place of a paper handoff." },
  { title: "Relay", desc: "Receiving facility is notified instantly with a Referral Passport." },
  { title: "Receive", desc: "Facility accepts, requests clarification, or flags unavailability." },
  { title: "Discharge", desc: "Discharge is logged with administrative status intact." },
  { title: "Return", desc: "A back-referral carries the case back to the originating network." },
  { title: "Follow", desc: "Community follow-up workers receive a clear handoff task." },
  { title: "Close", desc: "The referral is confirmed closed -- nothing left dangling." },
];

const FAQS = [
  {
    q: "Does SafeJourney make clinical decisions?",
    a: "No. SafeJourney never diagnoses, recommends treatment, or decides that a referral is needed. The doctor makes every clinical decision -- the platform coordinates the operational journey around it.",
  },
  {
    q: "Is the data on this demo real?",
    a: "No. Every facility, patient and case shown in demo mode is synthetic and clearly labeled. No real patient data is used.",
  },
  {
    q: "Does it integrate with real ambulance or WhatsApp systems today?",
    a: "The MVP simulates transport coordination and messaging through clearly labeled demo adapters. The architecture has provider interfaces ready for real integrations during a pilot.",
  },
  {
    q: "How is a benefit like JSSK or PMMVY evaluated?",
    a: "Through a deterministic, configuration-driven rule engine -- never an AI guess. Every result is labeled potentially applicable / not applicable / needs verification, with a source and last-verified date.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex-1 bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">S</div>
            <span className="text-sm font-semibold text-slate-900">SafeJourney</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
            <a href="#how-it-works" className="hover:text-slate-900">How it works</a>
            <a href="#safety" className="hover:text-slate-900">Safety</a>
            <a href="#pilot" className="hover:text-slate-900">Pilot plan</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <Link href="/login" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Launch Demo
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <p className="mb-4 inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-slate-500">
          Closed-Loop Platform · Maternal &amp; Newborn Care · Financial &amp; Administrative Support
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">SAFEJOURNEY</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">&ldquo;Don&apos;t let a referral end with a piece of paper.&rdquo;</p>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-500">
          SafeJourney connects referrals, receiving facilities, transport, documents, administrative support and
          follow-up into one closed-loop journey for maternal and newborn care.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-medium text-white hover:bg-brand-dark">
            Launch Demo <ArrowRight className="size-4" />
          </Link>
          <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Explore How It Works
          </a>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-600">The problem</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              A maternal or newborn referral creates a chain of dependencies: the receiving facility must know and
              acknowledge, transport may need coordination, documents must travel with the patient, administrative
              and financial information must not be lost, and follow-up must stay connected after discharge.
              Without a coordination layer, a referral becomes an administrative dead end -- fragmented across
              phone calls, paperwork and disconnected workflows.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">The solution</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              SafeJourney is a coordination layer -- not a replacement -- around the existing maternal/newborn care
              ecosystem. It keeps a referral connected end-to-end: from the doctor&apos;s decision, through
              acceptance, transport and documents, to discharge, back-referral and community follow-up. AI explains.
              Rules verify. Humans decide.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-2xl font-semibold text-slate-900">The closed-loop referral journey</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {JOURNEY_STEPS.map((step, i) => (
            <div key={step.title} className="rounded-xl border border-border bg-white p-5">
              <div className="mb-3 flex size-8 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-dark">
                {i + 1}
              </div>
              <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Feature icon={<QrCode className="size-5" />} title="Referral Passport" desc="A secure, QR-backed digital record of the referral journey -- never encoding raw patient data in the code itself." />
          <Feature icon={<AlertTriangle className="size-5" />} title="Referral Rescue Engine" desc="Detects stalled handoffs -- like an un-acknowledged referral -- and surfaces operational escalation actions. Never a clinical prediction." />
          <Feature icon={<Wallet className="size-5" />} title="Administrative Continuity" desc="A live readiness score across documentation, identity, financial and discharge tasks, so nothing quietly falls through." />
          <Feature icon={<Baby className="size-5" />} title="Mother + Newborn Continuity" desc="A linked family case keeps the mother's and baby's journeys connected under one referral." />
          <Feature icon={<Truck className="size-5" />} title="Transport Coordination" desc="A simulated, clearly-labeled transport workflow from request to arrival -- ready for a real dispatch integration." />
          <Feature icon={<ClipboardCheck className="size-5" />} title="Benefit Radar" desc="A deterministic rule engine surfaces potentially applicable schemes like JSSK, PMMVY and JSY, always citing a source." />
        </div>
      </section>

      {/* Safety */}
      <section id="safety" className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-xl border border-border bg-white p-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-brand" />
            <h2 className="text-lg font-semibold text-slate-900">Safety boundaries, by design</h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Never diagnoses or interprets clinical findings</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Never recommends treatment or medication</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Never calculates clinical risk or decides a referral</li>
            </ul>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Every benefit result requires human verification</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Full audit trail on every state-changing action</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Consent-based, role-scoped access with human override</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pilot plan */}
      <section id="pilot" className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-2xl font-semibold text-slate-900">Pilotable in 60-90 days</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <PilotPhase icon={<CalendarClock className="size-5" />} title="Days 1-30" desc="Onboard 2-3 facility pairs, configure benefit rules for the pilot state, train coordinators and ASHA/ANM workers." />
          <PilotPhase icon={<HeartPulse className="size-5" />} title="Days 31-60" desc="Run live referrals in shadow mode alongside existing paper process, tune the Rescue Engine timeout, collect KPI baselines." />
          <PilotPhase icon={<ClipboardCheck className="size-5" />} title="Days 61-90" desc="Switch to SafeJourney as the primary referral record for the pilot corridor, review the closed-loop referral rate." />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-4xl px-6 py-12">
        <h2 className="text-center text-2xl font-semibold text-slate-900">Frequently asked questions</h2>
        <div className="mt-8 space-y-4">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-xl border border-border bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">{f.q}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-surface py-8 text-center text-xs text-slate-400">
        SafeJourney is an assistive, non-clinical operational workflow coordination platform. Demo mode
        uses synthetic data only.
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">{icon}</div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{desc}</p>
    </div>
  );
}

function PilotPhase({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-6 text-center">
      <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">{icon}</div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{desc}</p>
    </div>
  );
}
