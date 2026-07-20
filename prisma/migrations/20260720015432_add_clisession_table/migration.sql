-- CreateTable
CREATE TABLE "SessionGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3FCF8E',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CliSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claudicaroSessionId" TEXT NOT NULL,
    "cli" TEXT NOT NULL,
    "cliSessionId" TEXT NOT NULL,
    "msgIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CliSession_claudicaroSessionId_fkey" FOREIGN KEY ("claudicaroSessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'Nova conversa',
    "orchestratorConfig" TEXT,
    "deletedAt" DATETIME,
    "pinnedAt" DATETIME,
    "groupId" TEXT,
    "workingDir" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SessionGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("createdAt", "id", "orchestratorConfig", "title", "updatedAt") SELECT "createdAt", "id", "orchestratorConfig", "title", "updatedAt" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CliSession_claudicaroSessionId_cli_key" ON "CliSession"("claudicaroSessionId", "cli");
