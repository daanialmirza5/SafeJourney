-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "phone" TEXT,
    "facilityId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pseudonym" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "sex" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Patient_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Patient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaregiverAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'VIEW_ONLY',
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "CaregiverAccess_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaregiverAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FamilyCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyCase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MotherCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyCaseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MotherCase_familyCaseId_fkey" FOREIGN KEY ("familyCaseId") REFERENCES "FamilyCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewbornCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyCaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sex" TEXT,
    "birthDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewbornCase_familyCaseId_fkey" FOREIGN KEY ("familyCaseId") REFERENCES "FamilyCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "grantedToUserId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "Consent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Consent_grantedToUserId_fkey" FOREIGN KEY ("grantedToUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReferralCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralCode" TEXT NOT NULL,
    "passportToken" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "referringFacilityId" TEXT NOT NULL,
    "receivingFacilityId" TEXT NOT NULL,
    "referringDoctorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "operationalStatus" TEXT NOT NULL DEFAULT 'ON_TRACK',
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "transportRequired" BOOLEAN NOT NULL DEFAULT false,
    "doctorNote" TEXT NOT NULL,
    "adminNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "acknowledgedAt" DATETIME,
    "arrivedAt" DATETIME,
    "dischargedAt" DATETIME,
    "backReferredAt" DATETIME,
    "closedAt" DATETIME,
    "cancelledAt" DATETIME,
    "stuckSince" DATETIME,
    CONSTRAINT "ReferralCase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReferralCase_referringFacilityId_fkey" FOREIGN KEY ("referringFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReferralCase_receivingFacilityId_fkey" FOREIGN KEY ("receivingFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReferralCase_referringDoctorId_fkey" FOREIGN KEY ("referringDoctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReferralEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralEvent_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ReferralCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReferralEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackReferral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralId" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "dischargeSummary" TEXT NOT NULL,
    "pendingAdminItems" TEXT NOT NULL,
    "documentPackage" TEXT NOT NULL,
    "assignedFollowUpId" TEXT,
    "familyNotified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BackReferral_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ReferralCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransportRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "pickupFacilityId" TEXT NOT NULL,
    "destinationFacilityId" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedVehiclePseudo" TEXT,
    "etaMinutes" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransportRequest_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ReferralCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransportRequest_pickupFacilityId_fkey" FOREIGN KEY ("pickupFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransportRequest_destinationFacilityId_fkey" FOREIGN KEY ("destinationFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ReferralCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentExtraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fields" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "warnings" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentExtraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BenefitRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "facilityType" TEXT,
    "conditions" TEXT NOT NULL,
    "documentRequirements" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "lastVerified" DATETIME NOT NULL,
    "disclaimer" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BenefitEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralId" TEXT NOT NULL,
    "benefitRuleId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requiredDocuments" TEXT NOT NULL,
    "nextActions" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BenefitEvaluation_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ReferralCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BenefitEvaluation_benefitRuleId_fkey" FOREIGN KEY ("benefitRuleId") REFERENCES "BenefitRule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdministrativeTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdministrativeTask_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ReferralCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedToId" TEXT,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUpTask_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ReferralCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FollowUpTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FollowUpTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "referralId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ReferralCase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actorRole" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_facilityId_idx" ON "User"("facilityId");

-- CreateIndex
CREATE INDEX "Facility_type_idx" ON "Facility"("type");

-- CreateIndex
CREATE INDEX "Patient_facilityId_idx" ON "Patient"("facilityId");

-- CreateIndex
CREATE INDEX "CaregiverAccess_patientId_idx" ON "CaregiverAccess"("patientId");

-- CreateIndex
CREATE INDEX "CaregiverAccess_userId_idx" ON "CaregiverAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyCase_patientId_key" ON "FamilyCase"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "MotherCase_familyCaseId_key" ON "MotherCase"("familyCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "NewbornCase_familyCaseId_key" ON "NewbornCase"("familyCaseId");

-- CreateIndex
CREATE INDEX "Consent_patientId_idx" ON "Consent"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCase_referralCode_key" ON "ReferralCase"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCase_passportToken_key" ON "ReferralCase"("passportToken");

-- CreateIndex
CREATE INDEX "ReferralCase_status_idx" ON "ReferralCase"("status");

-- CreateIndex
CREATE INDEX "ReferralCase_patientId_idx" ON "ReferralCase"("patientId");

-- CreateIndex
CREATE INDEX "ReferralCase_referringFacilityId_idx" ON "ReferralCase"("referringFacilityId");

-- CreateIndex
CREATE INDEX "ReferralCase_receivingFacilityId_idx" ON "ReferralCase"("receivingFacilityId");

-- CreateIndex
CREATE INDEX "ReferralCase_createdAt_idx" ON "ReferralCase"("createdAt");

-- CreateIndex
CREATE INDEX "ReferralEvent_referralId_idx" ON "ReferralEvent"("referralId");

-- CreateIndex
CREATE INDEX "ReferralEvent_createdAt_idx" ON "ReferralEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BackReferral_referralId_key" ON "BackReferral"("referralId");

-- CreateIndex
CREATE INDEX "TransportRequest_referralId_idx" ON "TransportRequest"("referralId");

-- CreateIndex
CREATE INDEX "Document_referralId_idx" ON "Document"("referralId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentExtraction_documentId_key" ON "DocumentExtraction"("documentId");

-- CreateIndex
CREATE INDEX "BenefitEvaluation_referralId_idx" ON "BenefitEvaluation"("referralId");

-- CreateIndex
CREATE INDEX "AdministrativeTask_referralId_idx" ON "AdministrativeTask"("referralId");

-- CreateIndex
CREATE INDEX "FollowUpTask_referralId_idx" ON "FollowUpTask"("referralId");

-- CreateIndex
CREATE INDEX "FollowUpTask_assignedToId_idx" ON "FollowUpTask"("assignedToId");

-- CreateIndex
CREATE INDEX "FollowUpTask_status_idx" ON "FollowUpTask"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");
