-- CreateTable
CREATE TABLE "SalesCustomer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesPartnerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userPlanId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "mobile" TEXT,
    "nationalCode" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "paymentRef" TEXT,
    "paymentDescription" TEXT,
    "paidAt" DATETIME,
    "confirmedAt" DATETIME,
    "returnedAt" DATETIME,
    "returnReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesCustomer_salesPartnerId_fkey" FOREIGN KEY ("salesPartnerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalesCustomer_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DiscountPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalesCustomer_userPlanId_fkey" FOREIGN KEY ("userPlanId") REFERENCES "UserPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesCustomer_userPlanId_key" ON "SalesCustomer"("userPlanId");

-- CreateIndex
CREATE INDEX "SalesCustomer_salesPartnerId_idx" ON "SalesCustomer"("salesPartnerId");

-- CreateIndex
CREATE INDEX "SalesCustomer_planId_idx" ON "SalesCustomer"("planId");

-- CreateIndex
CREATE INDEX "SalesCustomer_status_idx" ON "SalesCustomer"("status");

-- CreateIndex
CREATE INDEX "SalesCustomer_nationalCode_idx" ON "SalesCustomer"("nationalCode");

-- CreateIndex
CREATE INDEX "SalesCustomer_paidAt_idx" ON "SalesCustomer"("paidAt");

-- CreateIndex
CREATE INDEX "SalesCustomer_confirmedAt_idx" ON "SalesCustomer"("confirmedAt");

-- CreateIndex
CREATE INDEX "SalesCustomer_returnedAt_idx" ON "SalesCustomer"("returnedAt");
