-- CreateTable
CREATE TABLE "UserReferral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserReferral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserReferral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserReferral_referredUserId_key" ON "UserReferral"("referredUserId");

-- CreateIndex
CREATE INDEX "UserReferral_referrerId_idx" ON "UserReferral"("referrerId");

-- CreateIndex
CREATE INDEX "UserReferral_referralCode_idx" ON "UserReferral"("referralCode");

-- CreateIndex
CREATE INDEX "UserReferral_createdAt_idx" ON "UserReferral"("createdAt");
