/*
  Warnings:

  - Added the required column `sessionId` to the `CanvasCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `CanvasLink` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CanvasCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "cli" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL DEFAULT 480,
    "height" REAL NOT NULL DEFAULT 360,
    "ptyAlive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CanvasCard_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CanvasCard" ("cli", "createdAt", "height", "id", "ptyAlive", "width", "x", "y") SELECT "cli", "createdAt", "height", "id", "ptyAlive", "width", "x", "y" FROM "CanvasCard";
DROP TABLE "CanvasCard";
ALTER TABLE "new_CanvasCard" RENAME TO "CanvasCard";
CREATE TABLE "new_CanvasLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "fromCardId" TEXT NOT NULL,
    "toCardId" TEXT NOT NULL,
    "contextSummary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CanvasLink_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CanvasLink" ("contextSummary", "createdAt", "fromCardId", "id", "toCardId") SELECT "contextSummary", "createdAt", "fromCardId", "id", "toCardId" FROM "CanvasLink";
DROP TABLE "CanvasLink";
ALTER TABLE "new_CanvasLink" RENAME TO "CanvasLink";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
