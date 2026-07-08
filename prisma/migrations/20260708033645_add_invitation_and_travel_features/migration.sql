/*
  Warnings:

  - You are about to drop the column `usedById` on the `Invitation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `TravelMember` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "travelId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "multiUse" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Invitation" ("code", "createdAt", "email", "expiresAt", "id", "travelId") SELECT "code", "createdAt", "email", "expiresAt", "id", "travelId" FROM "Invitation";
DROP TABLE "Invitation";
ALTER TABLE "new_Invitation" RENAME TO "Invitation";
CREATE UNIQUE INDEX "Invitation_code_key" ON "Invitation"("code");
CREATE TABLE "new_Travel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "startDate" TEXT,
    "endDate" TEXT,
    "mainCurrency" TEXT NOT NULL DEFAULT 'USD',
    "currencies" TEXT NOT NULL DEFAULT '[]',
    "expensePermission" INTEGER NOT NULL DEFAULT 1,
    "allowMemberCreate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Travel" ("createdAt", "currencies", "endDate", "expensePermission", "id", "mainCurrency", "name", "prefix", "startDate", "updatedAt") SELECT "createdAt", "currencies", "endDate", "expensePermission", "id", "mainCurrency", "name", "prefix", "startDate", "updatedAt" FROM "Travel";
DROP TABLE "Travel";
ALTER TABLE "new_Travel" RENAME TO "Travel";
CREATE UNIQUE INDEX "Travel_prefix_key" ON "Travel"("prefix");
CREATE TABLE "new_TravelMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "travelId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "groupId" TEXT,
    CONSTRAINT "TravelMember_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TravelMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TravelMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MemberGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TravelMember" ("groupId", "id", "isAdmin", "name", "travelId", "userId") SELECT "groupId", "id", "isAdmin", "name", "travelId", "userId" FROM "TravelMember";
DROP TABLE "TravelMember";
ALTER TABLE "new_TravelMember" RENAME TO "TravelMember";
CREATE UNIQUE INDEX "TravelMember_travelId_userId_key" ON "TravelMember"("travelId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
