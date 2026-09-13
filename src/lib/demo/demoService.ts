import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { db } from "@/lib/db";
import { createReferral, getReferralOrThrow } from "@/lib/referral/referralService";
import { uploadDocument, extractDocument, confirmDocument } from "@/lib/documents/documentService";
import { DEMO_USER_EMAILS } from "@/lib/config";
import { NotFoundError, ConflictError } from "@/lib/apiError";
import type { User } from "@prisma/client";

const execFileAsync = promisify(execFile);

/** Re-runs the full demo data seed (spec section 36). This shells out to
 * the same `prisma/seed.ts` used for local setup so there is a single
 * source of truth for demo data generation. */
export async function resetDemoData(): Promise<{ log: string }> {
  const cwd = process.cwd();
  const seedPath = path.join(cwd, "prisma", "seed.ts");
  try {
    const { stdout, stderr } = await execFileAsync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["tsx", seedPath],
      { cwd, timeout: 120000, shell: process.platform === "win32" }
    );
    return { log: `${stdout}\n${stderr}` };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    throw new ConflictError(`Demo reset failed: ${e.stderr || e.message}`);
  }
}

const DEMO_PDF = Buffer.from("%PDF-1.4\n% SafeJourney synthetic demo document\n", "utf-8");

async function findDemoDoctor(): Promise<User> {
  const doctor = await db.user.findUnique({ where: { email: DEMO_USER_EMAILS.doctor } });
  if (!doctor) throw new NotFoundError("Demo doctor account not found. Reset demo data first.");
  return doctor;
}

/** "Launch Judge Demo" (spec section 37): sets up the ideal end-to-end
 * demonstration referral, ready for a judge to walk through acceptance,
 * transport, arrival, discharge, back-referral, maternal/newborn follow-up,
 * and the newborn six-to-eight-month continuity journey by hand. Includes
 * a linked newborn case specifically so that once back-referral happens,
 * the continuity milestones (Stages 2-4's largest feature) are actually
 * visible to walk through -- previously this scenario had no newborn case
 * at all. */
export async function launchJudgeDemoScenario() {
  const doctor = await findDemoDoctor();
  const receivingFacility = await db.facility.findFirst({ where: { name: "Metro Maternal Demo Hospital" } });
  if (!receivingFacility) throw new NotFoundError("Demo receiving facility not found. Reset demo data first.");

  const referral = await createReferral({
    doctor,
    patient: { name: "Ananya Patil", sex: "Female" },
    includeNewborn: { name: "Baby of Ananya", sex: "Female" },
    receivingFacilityId: receivingFacility.id,
    priority: "URGENT",
    transportRequired: true,
    doctorNote: "Referred for specialist maternal care and delivery support. (Judge demo scenario.)",
    adminNotes: "Family carrying identity documents and prior antenatal records.",
  });

  const referralNote = await uploadDocument(
    referral.id,
    doctor,
    { buffer: DEMO_PDF, originalName: "referral-note.pdf", mimeType: "application/pdf" },
    "REFERRAL_NOTE"
  );
  await extractDocument(referralNote.id, doctor);

  const identityDoc = await uploadDocument(
    referral.id,
    doctor,
    { buffer: DEMO_PDF, originalName: "identity-document.pdf", mimeType: "application/pdf" },
    "IDENTITY_DOCUMENT"
  );
  await extractDocument(identityDoc.id, doctor);
  await confirmDocument(identityDoc.id, doctor, {});

  return getReferralOrThrow(referral.id);
}

/** "Demo Rescue Scenario" (spec section 37): creates a referral that is
 * immediately STUCK because the receiving facility has not acknowledged it
 * within the configured timeout, so the Referral Rescue Engine triggers
 * right away. */
export async function launchRescueScenario() {
  const doctor = await findDemoDoctor();
  const receivingFacility = await db.facility.findFirst({ where: { name: "Central Demo Referral Hospital" } });
  if (!receivingFacility) throw new NotFoundError("Demo receiving facility not found. Reset demo data first.");

  const referral = await createReferral({
    doctor,
    patient: { name: "Priya Sharma", sex: "Female" },
    includeNewborn: undefined,
    receivingFacilityId: receivingFacility.id,
    priority: "EMERGENCY",
    transportRequired: false,
    doctorNote: "Urgent referral requiring prompt acknowledgement. (Rescue demo scenario.)",
    adminNotes: undefined,
  });

  const backdated = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  await db.referralCase.update({
    where: { id: referral.id },
    data: { sentAt: backdated, updatedAt: backdated, createdAt: backdated },
  });

  return referral;
}
