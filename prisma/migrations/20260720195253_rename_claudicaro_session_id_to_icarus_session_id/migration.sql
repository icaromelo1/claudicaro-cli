-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CliSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "icarusSessionId" TEXT NOT NULL,
    "cli" TEXT NOT NULL,
    "cliSessionId" TEXT NOT NULL,
    "msgIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CliSession_icarusSessionId_fkey" FOREIGN KEY ("icarusSessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CliSession" ("id", "icarusSessionId", "cli", "cliSessionId", "msgIndex", "createdAt", "updatedAt")
SELECT "id", "claudicaroSessionId", "cli", "cliSessionId", "msgIndex", "createdAt", "updatedAt" FROM "CliSession";
DROP TABLE "CliSession";
ALTER TABLE "new_CliSession" RENAME TO "CliSession";
CREATE UNIQUE INDEX "CliSession_icarusSessionId_cli_key" ON "CliSession"("icarusSessionId", "cli");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
