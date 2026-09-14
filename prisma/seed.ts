/**
 * Demo data seed (spec section 36). Wipes and recreates a fully synthetic,
 * clearly-labeled demo dataset: 10 facilities, ~20 doctors/coordinators,
 * ~50 referral cases spanning every lifecycle stage, benefit rules,
 * documents, follow-up tasks and the fixed demo login accounts.
 *
 * NOTE: All patient names, facility titles, phone numbers, and clinical summaries
 * are 100% synthetic test data generated strictly for demonstration and evaluation.
 * No real Protected Health Information (PHI) is present.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient, type User } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import {
  createReferral,
  acceptReferral,
  requestTransport,
  assignTransport,
  updateTransportProgress,
  confirmArrival,
  dischargeCase,
  generateAndSendBackReferral,
  acknowledgeBackReferral,
  completeFollowUpTask,
  declineReferral,
} from "../src/lib/referral/referralService";
import { uploadDocument, extractDocument, confirmDocument } from "../src/lib/documents/documentService";
import { DEMO_PASSWORD, DEMO_USER_EMAILS } from "../src/lib/config";
import { NEWBORN_CONTINUITY_SCHEDULE } from "../src/lib/referral/newbornContinuity";

const db = new PrismaClient();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

const FACILITIES = [
  { name: "Sunrise Community Health Centre", type: "REFERRING", district: "Pune", state: "Maharashtra" },
  { name: "Riverbend Women & Newborn Hospital", type: "RECEIVING", district: "Mumbai", state: "Maharashtra" },
  { name: "District Women's Care Centre", type: "BOTH", district: "Nashik", state: "Maharashtra" },
  { name: "Riverside Community Health Centre", type: "REFERRING", district: "Nagpur", state: "Maharashtra" },
  { name: "Lakeside Maternity Care Hospital", type: "RECEIVING", district: "Bengaluru Urban", state: "Karnataka" },
  { name: "Lakeview District Hospital", type: "BOTH", district: "Mysuru", state: "Karnataka" },
  { name: "Green Valley Primary Health Centre", type: "REFERRING", district: "Belagavi", state: "Karnataka" },
  { name: "Central Maternal Referral Hospital", type: "RECEIVING", district: "Pune", state: "Maharashtra" },
  { name: "Hillside Rural Health Centre", type: "REFERRING", district: "Satara", state: "Maharashtra" },
  { name: "Unity Medical College Hospital", type: "RECEIVING", district: "Bengaluru Urban", state: "Karnataka" },
] as const;

const DOCTOR_NAMES = [
  "Dr. Ananya Rao", "Dr. Vikram Nair", "Dr. Sneha Kulkarni", "Dr. Arjun Mehta", "Dr. Kavya Iyer",
  "Dr. Rohan Deshpande", "Dr. Priyanka Joshi", "Dr. Aditya Kapoor", "Dr. Meera Pillai", "Dr. Karan Bhat",
];
const COORDINATOR_NAMES = [
  "Suresh Patil", "Lakshmi Reddy", "Manoj Kumar", "Divya Shetty", "Ravi Chandran",
  "Neha Gupta", "Sanjay Verma", "Pooja Agarwal", "Vivek Menon", "Anjali Desai",
];
const PATIENT_NAMES = [
  "Ananya Patil", "Priya Sharma", "Kavita Yadav", "Sunita Devi", "Rekha Singh", "Geeta Kumari",
  "Meena Gowda", "Radha Krishnan", "Shalini Naik", "Pooja Chavan", "Anita Rao", "Vandana Joshi",
  "Nisha Pawar", "Suman Bai", "Kalpana Iyer", "Deepa Nair", "Savita More", "Jyoti Salunkhe",
  "Manisha Gaikwad", "Sarita Kadam", "Rina Fernandes", "Asha Bhosale", "Komal Waghmare", "Yamuna Reddy",
];

let doctorNameIdx = 0;
let coordinatorNameIdx = 0;

async function wipeDatabase() {
  await db.auditLog.deleteMany();
  await db.notificationTemplate.deleteMany();
  await db.notification.deleteMany();
  await db.followUpTask.deleteMany();
  await db.backReferral.deleteMany();
  await db.administrativeTask.deleteMany();
  await db.benefitEvaluation.deleteMany();
  await db.documentExtraction.deleteMany();
  await db.document.deleteMany();
  await db.transportRequest.deleteMany();
  await db.referralEvent.deleteMany();
  await db.referralCase.deleteMany();
  await db.consent.deleteMany();
  await db.caregiverAccess.deleteMany();
  await db.newbornCase.deleteMany();
  await db.motherCase.deleteMany();
  await db.familyCase.deleteMany();
  await db.patient.deleteMany();
  await db.benefitRule.deleteMany();
  await db.newbornMilestoneTemplate.deleteMany();
  await db.systemSetting.deleteMany();
  await db.user.deleteMany();
  await db.facility.deleteMany();
}

async function seedFacilities() {
  const facilities = [];
  for (const f of FACILITIES) {
    facilities.push(await db.facility.create({ data: f }));
  }
  return facilities;
}

async function seedStaff(facilities: Awaited<ReturnType<typeof seedFacilities>>) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const doctors: Awaited<ReturnType<typeof db.user.create>>[] = [];
  const coordinators: Awaited<ReturnType<typeof db.user.create>>[] = [];

  for (const facility of facilities) {
    const canDoctor = facility.type === "REFERRING" || facility.type === "BOTH";
    const canCoordinate = facility.type === "RECEIVING" || facility.type === "BOTH";
    if (canDoctor) {
      for (let i = 0; i < 2; i++) {
        const name = DOCTOR_NAMES[doctorNameIdx % DOCTOR_NAMES.length];
        doctorNameIdx++;
        doctors.push(
          await db.user.create({
            data: {
              email: `doctor${doctors.length + 1}@demo.local`,
              name,
              role: "DOCTOR",
              passwordHash,
              facilityId: facility.id,
            },
          })
        );
      }
    }
    if (canCoordinate) {
      for (let i = 0; i < 2; i++) {
        const name = COORDINATOR_NAMES[coordinatorNameIdx % COORDINATOR_NAMES.length];
        coordinatorNameIdx++;
        coordinators.push(
          await db.user.create({
            data: {
              email: `coordinator${coordinators.length + 1}@demo.local`,
              name,
              role: "COORDINATOR",
              passwordHash,
              facilityId: facility.id,
            },
          })
        );
      }
    }
  }
  return { doctors, coordinators };
}

async function seedNamedDemoAccounts(facilities: Awaited<ReturnType<typeof seedFacilities>>) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const referringFacility = facilities.find((f) => f.name === "Sunrise Community Health Centre")!;
  const receivingFacility = facilities.find((f) => f.name === "Riverbend Women & Newborn Hospital")!;
  // The fixed evaluation accounts skip the first-time onboarding wizard
  const onboardedAt = new Date();

  const doctor = await db.user.create({
    data: { email: DEMO_USER_EMAILS.doctor, name: "Dr. Meera Kulkarni", role: "DOCTOR", passwordHash, facilityId: referringFacility.id, onboardedAt },
  });
  const coordinator = await db.user.create({
    data: { email: DEMO_USER_EMAILS.coordinator, name: "Arjun Deshmukh", role: "COORDINATOR", passwordHash, facilityId: receivingFacility.id, onboardedAt },
  });
  const patientUser = await db.user.create({
    data: { email: DEMO_USER_EMAILS.patient, name: "Ananya Patil", role: "PATIENT", passwordHash, onboardedAt },
  });
  const caregiverUser = await db.user.create({
    data: { email: DEMO_USER_EMAILS.caregiver, name: "Rakesh Patil", role: "CAREGIVER", passwordHash, onboardedAt },
  });
  const worker = await db.user.create({
    data: { email: DEMO_USER_EMAILS.worker, name: "Meera Bai (ASHA)", role: "FOLLOWUP", passwordHash, onboardedAt },
  });
  const admin = await db.user.create({
    data: { email: DEMO_USER_EMAILS.admin, name: "District Health Admin", role: "ADMIN", passwordHash, onboardedAt },
  });

  return { doctor, coordinator, patientUser, caregiverUser, worker, admin, referringFacility, receivingFacility };
}

async function seedBenefitRules() {
  await db.benefitRule.create({
    data: {
      name: "JSSK",
      state: "National",
      conditions: JSON.stringify({}),
      documentRequirements: JSON.stringify(["Identity proof", "Discharge summary"]),
      sourceUrl: "https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=822&lid=222",
      effectiveDate: new Date("2011-06-01"),
      lastVerified: new Date("2026-01-15"),
      disclaimer: "Verify current eligibility with the relevant facility administration or authority.",
      status: "ACTIVE",
    },
  });
  await db.benefitRule.create({
    data: {
      name: "PMMVY",
      state: "National",
      conditions: JSON.stringify({}),
      documentRequirements: JSON.stringify(["Identity proof", "Bank account proof", "Registration form"]),
      sourceUrl: "https://pmmvy.wcd.gov.in/",
      effectiveDate: new Date("2017-01-01"),
      lastVerified: new Date("2026-01-15"),
      disclaimer: "Verify current eligibility with the relevant facility administration or authority.",
      status: "ACTIVE",
    },
  });
  await db.benefitRule.create({
    data: {
      name: "JSY",
      state: "Maharashtra",
      conditions: JSON.stringify({ applicableStates: ["Maharashtra"] }),
      documentRequirements: JSON.stringify(["Identity proof", "Institutional delivery certificate"]),
      sourceUrl: "https://nhm.gov.in/index1.php?lang=1&level=2&sublinkid=841&lid=309",
      effectiveDate: new Date("2005-04-12"),
      lastVerified: new Date("2026-01-15"),
      disclaimer: "Verify current eligibility with the relevant facility administration or authority.",
      status: "ACTIVE",
    },
  });
}

async function seedNewbornMilestoneTemplates() {
  for (const [i, milestone] of NEWBORN_CONTINUITY_SCHEDULE.entries()) {
    await db.newbornMilestoneTemplate.create({
      data: { ...milestone, sortOrder: i, active: true },
    });
  }
}

const DEMO_PDF = Buffer.from("%PDF-1.4\n% SafeJourney synthetic demo document\n", "utf-8");

async function attachDemoDocuments(referralId: string, uploader: User, typeHint: string, filename: string) {
  const doc = await uploadDocument(referralId, uploader, { buffer: DEMO_PDF, originalName: filename, mimeType: "application/pdf" }, typeHint as never);
  await extractDocument(doc.id, uploader);
  await confirmDocument(doc.id, uploader, {});
  return doc;
}

type Stage =
  | "SENT_FRESH"
  | "SENT_STUCK"
  | "ACKNOWLEDGED"
  | "TRANSPORT_IN_PROGRESS"
  | "ARRIVED"
  | "DISCHARGED"
  | "BACK_REFERRED"
  | "FOLLOW_UP_IN_PROGRESS"
  | "CLOSED"
  | "DECLINED";

async function seedOneReferral(
  stage: Stage,
  doctors: Awaited<ReturnType<typeof db.user.create>>[],
  facilities: Awaited<ReturnType<typeof seedFacilities>>,
  followUpWorkers: Awaited<ReturnType<typeof db.user.create>>[]
) {
  const doctor = choice(doctors);
  const facility = facilities.find((f) => f.id === doctor.facilityId)!;
  const receivingCandidates = facilities.filter(
    (f) => f.id !== facility.id && (f.type === "RECEIVING" || f.type === "BOTH")
  );
  const receivingFacility = choice(receivingCandidates);
  const coordinator = await db.user.findFirst({ where: { facilityId: receivingFacility.id, role: "COORDINATOR" } });
  if (!coordinator) return;

  const patientName = choice(PATIENT_NAMES);
  const transportRequired = Math.random() > 0.4;
  const includeNewborn = Math.random() > 0.6;
  const priority = choice(["ROUTINE", "ROUTINE", "URGENT", "EMERGENCY"] as const);

  const referral = await createReferral({
    doctor,
    patient: { name: patientName, sex: "Female", dateOfBirth: undefined },
    includeNewborn: includeNewborn ? { name: `Baby of ${patientName.split(" ")[0]}`, sex: choice(["Male", "Female"]) } : undefined,
    receivingFacilityId: receivingFacility.id,
    priority,
    transportRequired,
    doctorNote: "Referral created for higher-level maternal/newborn care per clinical assessment. (Synthetic demo note.)",
    adminNotes: "Family to bring identity documents if available.",
  });

  if (stage === "SENT_FRESH") return referral;

  if (stage === "SENT_STUCK") {
    const backdated = daysAgo(1);
    await db.referralCase.update({ where: { id: referral.id }, data: { sentAt: backdated, updatedAt: backdated, createdAt: backdated } });
    return referral;
  }

  if (stage === "DECLINED") {
    await declineReferral(referral.id, coordinator, "Facility at capacity for this case type (demo scenario).");
    return referral;
  }

  await acceptReferral(referral.id, coordinator);
  if (stage === "ACKNOWLEDGED") return referral;

  if (transportRequired) {
    await requestTransport(referral.id, doctor);
    await assignTransport(referral.id, coordinator, `DEMO-AMB-${randomInt(10, 99)}`, randomInt(15, 90));
    if (stage === "TRANSPORT_IN_PROGRESS") {
      await updateTransportProgress(referral.id, coordinator, choice(["EN_ROUTE_TO_PICKUP", "PICKED_UP"] as const));
      return referral;
    }
    await updateTransportProgress(referral.id, coordinator, "IN_TRANSIT");
  } else if (stage === "TRANSPORT_IN_PROGRESS") {
    return referral;
  }

  await confirmArrival(referral.id, coordinator);
  if (stage === "ARRIVED") return referral;

  await attachDemoDocuments(referral.id, coordinator, "DISCHARGE_DOCUMENT", "discharge-summary.pdf");
  await dischargeCase(referral.id, coordinator, {
    destination: "Home",
    note: "Discharge coordination recorded per care team.",
  });
  if (stage === "DISCHARGED") return referral;

  const worker = choice(followUpWorkers);
  const withBackReferral = await generateAndSendBackReferral(referral.id, coordinator, {
    dischargeSummary: `Referral ${referral.referralCode} discharged; routine follow-up requested. (Synthetic demo summary.)`,
  });
  if (stage === "BACK_REFERRED") return withBackReferral;

  // Acknowledgment happens at the *origin* (referring) facility -- `doctor`
  // belongs to `facility`, which is this referral's referringFacilityId.
  const acknowledged = await acknowledgeBackReferral(referral.id, doctor, { followUpAssigneeId: worker.id });

  if (stage === "FOLLOW_UP_IN_PROGRESS") {
    // Complete only the near-term (few-days) handoff tasks and leave any
    // newborn continuity milestones (weeks-to-months out) pending, so the
    // demo shows a referral genuinely mid-journey rather than one that
    // jumps straight from back-referral to fully closed.
    const nearTerm = acknowledged.followUpTasks.filter(
      (t) => t.category === "DISCHARGE_HANDOFF" || t.category === "ADMIN_FOLLOW_UP"
    );
    for (const task of nearTerm) {
      await completeFollowUpTask(task.id, worker, "Completed as part of demo seeding.");
    }
    return acknowledged;
  }

  for (const task of acknowledged.followUpTasks) {
    await completeFollowUpTask(task.id, worker, "Completed as part of demo seeding.");
  }
  return acknowledged;
}

async function main() {
  console.log("[seed] wiping existing data...");
  await wipeDatabase();

  console.log("[seed] creating facilities...");
  const facilities = await seedFacilities();

  console.log("[seed] creating staff...");
  const { doctors: extraDoctors, coordinators: extraCoordinators } = await seedStaff(facilities);

  console.log("[seed] creating named demo accounts...");
  const demo = await seedNamedDemoAccounts(facilities);

  console.log("[seed] creating benefit rules...");
  await seedBenefitRules();
  await seedNewbornMilestoneTemplates();

  // Notification templates are intentionally left unseeded: the app reads
  // NOTIFICATION_TEMPLATE_DEFAULTS (src/lib/notifications/templates.ts)
  // when no override row exists, so the admin panel's "customized" flag
  // stays meaningful (true only once an admin actually edits one) rather
  // than every template appearing pre-"customized" with identical text.

  const allDoctors = [demo.doctor, ...extraDoctors];
  void extraCoordinators;
  const followUpWorkers = [demo.worker];

  console.log("[seed] creating referral cases...");
  const stagePlan: Stage[] = [
    ...Array(6).fill("SENT_FRESH"),
    ...Array(4).fill("SENT_STUCK"),
    ...Array(6).fill("ACKNOWLEDGED"),
    ...Array(6).fill("TRANSPORT_IN_PROGRESS"),
    ...Array(7).fill("ARRIVED"),
    ...Array(7).fill("DISCHARGED"),
    ...Array(5).fill("BACK_REFERRED"),
    ...Array(4).fill("FOLLOW_UP_IN_PROGRESS"),
    ...Array(10).fill("CLOSED"),
    ...Array(3).fill("DECLINED"),
  ];
  for (const stage of stagePlan) {
    try {
      await seedOneReferral(stage, allDoctors, facilities, followUpWorkers);
    } catch (err) {
      console.warn(`[seed] skipped a ${stage} referral due to:`, (err as Error).message);
    }
  }

  console.log("[seed] creating the flagship demo patient's referral (Ananya Patil)...");
  const flagship = await createReferral({
    doctor: demo.doctor,
    patient: { name: "Ananya Patil", sex: "Female" },
    includeNewborn: { name: "Baby of Ananya", sex: "Female" },
    receivingFacilityId: demo.receivingFacility.id,
    priority: "URGENT",
    transportRequired: true,
    doctorNote: "Referred for specialist maternal care and delivery support. (Synthetic demo note.)",
    adminNotes: "Family carrying identity documents and prior antenatal records.",
  });
  await db.patient.update({ where: { id: flagship.patientId }, data: { userId: demo.patientUser.id } });
  await db.caregiverAccess.create({
    data: { patientId: flagship.patientId, userId: demo.caregiverUser.id, permission: "FULL_ADMINISTRATIVE_ASSISTANCE" },
  });
  await db.consent.create({
    data: { patientId: flagship.patientId, grantedToUserId: demo.caregiverUser.id, scope: "CAREGIVER" },
  });
  await db.consent.create({
    data: { patientId: flagship.patientId, grantedToUserId: demo.coordinator.id, scope: "RECEIVING_FACILITY" },
  });
  await attachDemoDocuments(flagship.id, demo.doctor, "REFERRAL_NOTE", "referral-note.pdf");
  await attachDemoDocuments(flagship.id, demo.doctor, "IDENTITY_DOCUMENT", "identity-document.pdf");

  console.log("[seed] done.");
  console.log("");
  console.log("Demo accounts (password: " + DEMO_PASSWORD + "):");
  for (const [role, email] of Object.entries(DEMO_USER_EMAILS)) {
    console.log(`  ${role.padEnd(12)} ${email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
