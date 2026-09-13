-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pseudonym" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "sex" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Patient_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Patient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Patient" ("createdAt", "createdById", "dateOfBirth", "facilityId", "id", "name", "pseudonym", "sex", "updatedAt") SELECT "createdAt", "createdById", "dateOfBirth", "facilityId", "id", "name", "pseudonym", "sex", "updatedAt" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");
CREATE INDEX "Patient_facilityId_idx" ON "Patient"("facilityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
