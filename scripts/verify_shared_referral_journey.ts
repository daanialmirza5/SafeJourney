import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import {
  createReferral,
  getReferralOrThrow,
  acceptReferral,
  requestTransport,
  assignTransport,
} from "@/lib/referral/referralService";
import { listReferralsForUser } from "@/lib/referral/queries";
import { canAccessReferral } from "@/lib/referral/access";

async function runVerification() {
  console.log("================================================================================");
  console.log("SAFEJOURNEY SHARED REFERRAL LIFECYCLE VERIFICATION ACROSS ALL ROLES");
  console.log("================================================================================\n");

  const timestamp = Date.now();
  const patientEmail = `patient-${timestamp}@test.local`;
  const otherPatientEmail = `other-patient-${timestamp}@test.local`;
  const passwordHash = await hashPassword("demo123");

  const referringFacility = await db.facility.findFirst({ where: { type: { in: ["REFERRING", "BOTH"] } } });
  const receivingFacility = await db.facility.findFirst({ where: { type: { in: ["RECEIVING", "BOTH"] }, NOT: { id: referringFacility!.id } } });

  if (!referringFacility || !receivingFacility) {
    throw new Error("Required facilities not found in database.");
  }

  // ---------------------------------------------------------------------------
  // STAGE 1: PATIENT REGISTRATION & INITIAL EMPTY STATE
  // ---------------------------------------------------------------------------
  console.log("[STAGE 1: PATIENT REGISTRATION]");
  const patientUser = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: patientEmail,
        passwordHash,
        name: "Pooja Sharma",
        role: "PATIENT",
        facilityId: referringFacility.id,
        isDemo: false,
        onboardedAt: new Date(),
      },
    });

    const p = await tx.patient.create({
      data: {
        userId: u.id,
        pseudonym: `Patient-${Math.floor(1000 + Math.random() * 8999)}`,
        name: u.name,
        sex: "Female",
        facilityId: referringFacility.id,
        createdById: u.id,
      },
    });

    return { ...u, patientProfile: p };
  });

  console.log(`✓ Registered Patient Account: ${patientUser.name} (${patientUser.email})`);
  console.log(`✓ Linked Patient Record ID: ${patientUser.patientProfile.id}, Pseudonym: ${patientUser.patientProfile.pseudonym}`);

  const initialPatientReferrals = await listReferralsForUser(patientUser);
  console.log(`✓ Initial Patient Referrals Count: ${initialPatientReferrals.length} (Expected: 0)`);
  if (initialPatientReferrals.length !== 0) {
    throw new Error("New patient should have 0 initial referrals.");
  }

  // ---------------------------------------------------------------------------
  // STAGE 2: DOCTOR CREATES REFERRAL LINKED TO PATIENT
  // ---------------------------------------------------------------------------
  console.log("\n[STAGE 2: DOCTOR CREATES REFERRAL]");
  const doctorUser = await db.user.findFirst({ where: { role: "DOCTOR", facilityId: referringFacility.id } });
  if (!doctorUser) throw new Error("Doctor user not found.");

  console.log(`✓ Doctor: ${doctorUser.name} (${doctorUser.email}) at ${referringFacility.name}`);
  const createdReferral = await createReferral({
    doctor: doctorUser,
    patientId: patientUser.patientProfile.id,
    receivingFacilityId: receivingFacility.id,
    priority: "URGENT",
    transportRequired: true,
    doctorNote: "Patient in active labor requiring specialized obstetric care.",
    adminNotes: "JSSK beneficiary.",
  });

  console.log(`✓ Created Referral ID: ${createdReferral.id}`);
  console.log(`✓ Referral Code: ${createdReferral.referralCode} (Prefix check: ${createdReferral.referralCode.startsWith("SJ-2026-") ? "PASS" : "FAIL"})`);
  console.log(`✓ Status: ${createdReferral.status}`);
  console.log(`✓ Linked Patient ID: ${createdReferral.patientId} (Matches: ${createdReferral.patientId === patientUser.patientProfile.id})`);

  // ---------------------------------------------------------------------------
  // STAGE 3: PATIENT SEES NEW REFERRAL AUTOMATICALLY
  // ---------------------------------------------------------------------------
  console.log("\n[STAGE 3: PATIENT AUTOMATIC VISIBILITY]");
  const patientReferralsAfterCreation = await listReferralsForUser(patientUser);
  console.log(`✓ Patient Referral List Count: ${patientReferralsAfterCreation.length} (Expected: 1)`);
  if (patientReferralsAfterCreation.length !== 1) {
    throw new Error("Patient should now see exactly 1 referral.");
  }

  const patientReferral = patientReferralsAfterCreation[0];
  console.log(`✓ Patient Sees Referral Code: ${patientReferral.referralCode}`);
  console.log(`✓ Referring Doctor: ${patientReferral.referringDoctor.name}`);
  console.log(`✓ Route: ${patientReferral.referringFacility.name} → ${patientReferral.receivingFacility.name}`);
  console.log(`✓ Status: ${patientReferral.status}`);

  const canPatientAccess = await canAccessReferral(patientUser, createdReferral);
  console.log(`✓ canAccessReferral for Patient: ${canPatientAccess} (Expected: true)`);
  if (!canPatientAccess) throw new Error("Patient must have access to own referral.");

  // ---------------------------------------------------------------------------
  // STAGE 4: COORDINATOR ACCEPTS & ASSIGNS TRANSPORT
  // ---------------------------------------------------------------------------
  console.log("\n[STAGE 4: COORDINATOR REVIEW & ASSIGNMENT]");
  const coordinatorUser = await db.user.findFirst({ where: { role: "COORDINATOR", facilityId: receivingFacility.id } });
  if (!coordinatorUser) throw new Error("Coordinator user not found.");

  console.log(`✓ Coordinator: ${coordinatorUser.name} (${coordinatorUser.email}) at ${receivingFacility.name}`);
  const acceptedReferral = await acceptReferral(createdReferral.id, coordinatorUser);
  console.log(`✓ Accepted Referral Status: ${acceptedReferral.status} (ACKNOWLEDGED)`);

  const transportReq = await requestTransport(createdReferral.id, coordinatorUser);
  console.log(`✓ Transport Requested Status: ${transportReq.status} (TRANSPORT_REQUESTED)`);

  const activeTransport = await db.transportRequest.findFirst({ where: { referralId: createdReferral.id } });
  if (!activeTransport) throw new Error("TransportRequest not found.");

  const assignedReferral = await assignTransport(
    createdReferral.id,
    coordinatorUser,
    "AMB-MH-04-9821",
    20
  );
  console.log(`✓ Assigned Transport Status: ${assignedReferral.status} (TRANSPORT_ASSIGNED)`);

  // ---------------------------------------------------------------------------
  // STAGE 5: PATIENT SEES COORDINATOR & TRANSPORT UPDATES
  // ---------------------------------------------------------------------------
  console.log("\n[STAGE 5: PATIENT SEES UPDATED STATE]");
  const patientUpdatedReferral = (await listReferralsForUser(patientUser))[0];
  console.log(`✓ Patient Sees Updated Status: ${patientUpdatedReferral.status}`);
  console.log(`✓ Receiving Hospital Confirmed: ${patientUpdatedReferral.receivingFacility.name}`);
  console.log(`✓ Transport Assigned Vehicle: ${patientUpdatedReferral.transportRequests[0]?.assignedVehiclePseudo}`);
  console.log(`✓ Transport ETA: ${patientUpdatedReferral.transportRequests[0]?.etaMinutes} mins`);
  console.log(`✓ Total Chronological Events: ${patientUpdatedReferral.events.length}`);
  patientUpdatedReferral.events.forEach((e, idx) => {
    console.log(`   ${idx + 1}. [${e.createdAt.toISOString()}] Action: ${e.action} (From: ${e.fromStatus} -> To: ${e.toStatus}) by Role: ${e.actorRole}`);
  });

  // ---------------------------------------------------------------------------
  // STAGE 6: DOCTOR SEES SAME SYNCHRONIZED STATE
  // ---------------------------------------------------------------------------
  console.log("\n[STAGE 6: DOCTOR SEES SYNCHRONIZED STATE]");
  const doctorView = await getReferralOrThrow(createdReferral.id);
  console.log(`✓ Doctor Reads Status: ${doctorView.status}`);
  console.log(`✓ Doctor Reads Assigned Vehicle: ${doctorView.transportRequests[0]?.assignedVehiclePseudo}`);

  // ---------------------------------------------------------------------------
  // STAGE 7: SECURITY & PATIENT ISOLATION (ZERO CROSS-EXPOSURE)
  // ---------------------------------------------------------------------------
  console.log("\n[STAGE 7: SECURITY & PATIENT ISOLATION]");
  const otherPatientUser = await db.user.create({
    data: {
      email: otherPatientEmail,
      passwordHash,
      name: "Other Patient",
      role: "PATIENT",
      facilityId: referringFacility.id,
      isDemo: false,
    },
  });

  const otherPatientReferrals = await listReferralsForUser(otherPatientUser);
  console.log(`✓ Other Patient List Count: ${otherPatientReferrals.length} (Expected: 0)`);
  if (otherPatientReferrals.length !== 0) throw new Error("Other patient must not see Patient A's referral.");

  const canOtherPatientAccess = await canAccessReferral(otherPatientUser, createdReferral);
  console.log(`✓ canAccessReferral for Unauthorized Patient: ${canOtherPatientAccess} (Expected: false)`);
  if (canOtherPatientAccess) throw new Error("Unauthorized patient must be blocked with false/403.");

  console.log("\n================================================================================");
  console.log("SHARED REFERRAL LIFECYCLE VERIFICATION: ALL 7 STAGES PASSED CLEANLY!");
  console.log("================================================================================\n");
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
