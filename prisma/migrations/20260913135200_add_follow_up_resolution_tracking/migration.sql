-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FollowUpTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedToId" TEXT,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "category" TEXT NOT NULL DEFAULT 'DISCHARGE_HANDOFF',
    "source" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "completedAt" DATETIME,
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUpTask_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "ReferralCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FollowUpTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FollowUpTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FollowUpTask_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FollowUpTask" ("assignedToId", "category", "completedAt", "createdAt", "createdById", "description", "dueDate", "id", "referralId", "source", "status", "title", "updatedAt") SELECT "assignedToId", "category", "completedAt", "createdAt", "createdById", "description", "dueDate", "id", "referralId", "source", "status", "title", "updatedAt" FROM "FollowUpTask";
DROP TABLE "FollowUpTask";
ALTER TABLE "new_FollowUpTask" RENAME TO "FollowUpTask";
CREATE INDEX "FollowUpTask_referralId_idx" ON "FollowUpTask"("referralId");
CREATE INDEX "FollowUpTask_assignedToId_idx" ON "FollowUpTask"("assignedToId");
CREATE INDEX "FollowUpTask_status_idx" ON "FollowUpTask"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
