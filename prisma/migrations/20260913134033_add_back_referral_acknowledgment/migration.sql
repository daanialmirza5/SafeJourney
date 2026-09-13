-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BackReferral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralId" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "dischargeSummary" TEXT NOT NULL,
    "pendingAdminItems" TEXT NOT NULL,
    "documentPackage" TEXT NOT NULL,
    "assignedFollowUpId" TEXT,
    "familyNotified" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    "acknowledgedById" TEXT,
    CONSTRAINT "BackReferral_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ReferralCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BackReferral_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BackReferral" ("assignedFollowUpId", "dischargeSummary", "documentPackage", "familyNotified", "generatedAt", "id", "pendingAdminItems", "referralId", "sentAt") SELECT "assignedFollowUpId", "dischargeSummary", "documentPackage", "familyNotified", "generatedAt", "id", "pendingAdminItems", "referralId", "sentAt" FROM "BackReferral";
DROP TABLE "BackReferral";
ALTER TABLE "new_BackReferral" RENAME TO "BackReferral";
CREATE UNIQUE INDEX "BackReferral_referralId_key" ON "BackReferral"("referralId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
