-- CreateTable
CREATE TABLE "MemberGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "travelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberGroup_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
INSERT INTO "new_TravelMember" ("id", "isAdmin", "name", "travelId", "userId") SELECT "id", "isAdmin", "name", "travelId", "userId" FROM "TravelMember";
DROP TABLE "TravelMember";
ALTER TABLE "new_TravelMember" RENAME TO "TravelMember";
CREATE UNIQUE INDEX "TravelMember_travelId_userId_key" ON "TravelMember"("travelId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
