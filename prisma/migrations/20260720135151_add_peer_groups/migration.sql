-- CreateTable
CREATE TABLE "PeerGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "turnOrder" TEXT NOT NULL DEFAULT 'roundtable',
    "maxRounds" INTEGER NOT NULL DEFAULT 5,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PeerGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PeerGroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    CONSTRAINT "PeerGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PeerGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PeerTurn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CanvasCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "cli" TEXT NOT NULL,
    "engine" TEXT NOT NULL DEFAULT 'pty',
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL DEFAULT 480,
    "height" REAL NOT NULL DEFAULT 360,
    "ptyAlive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CanvasCard_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CanvasCard" ("cli", "createdAt", "height", "id", "ptyAlive", "sessionId", "width", "x", "y") SELECT "cli", "createdAt", "height", "id", "ptyAlive", "sessionId", "width", "x", "y" FROM "CanvasCard";
DROP TABLE "CanvasCard";
ALTER TABLE "new_CanvasCard" RENAME TO "CanvasCard";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
