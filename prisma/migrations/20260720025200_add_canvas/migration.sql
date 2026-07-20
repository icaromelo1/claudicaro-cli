-- CreateTable
CREATE TABLE "CanvasCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cli" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL DEFAULT 480,
    "height" REAL NOT NULL DEFAULT 360,
    "ptyAlive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CanvasLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromCardId" TEXT NOT NULL,
    "toCardId" TEXT NOT NULL,
    "contextSummary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
