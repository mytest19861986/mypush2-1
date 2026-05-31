-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isMobileVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPasswordLoginEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "passwordChangedAt" DATETIME,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "firstName" TEXT DEFAULT '',
    "lastName" TEXT DEFAULT '',
    "nationalCode" TEXT,
    "avatar" TEXT,
    "birthDate" DATETIME,
    "gender" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "medicalCode" TEXT,
    "specialty" TEXT,
    "clinicName" TEXT,
    "clinicAddress" TEXT,
    "city" TEXT,
    "province" TEXT,
    "phone" TEXT,
    "bio" TEXT,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscountPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "maxUses" INTEGER NOT NULL DEFAULT -1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "features" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlanHolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "firstName" TEXT DEFAULT '',
    "lastName" TEXT DEFAULT '',
    "nationalCode" TEXT NOT NULL,
    "mobile" TEXT,
    "birthDate" DATETIME,
    "gender" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlanHolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "planHolderId" TEXT,
    "planId" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "finalAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gateway" TEXT,
    "authority" TEXT,
    "refId" TEXT,
    "trackingCode" TEXT,
    "paidAt" DATETIME,
    "failedAt" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_planHolderId_fkey" FOREIGN KEY ("planHolderId") REFERENCES "PlanHolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DiscountPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "planId" TEXT NOT NULL,
    "planHolderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "referrerId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ONLINE_PAYMENT',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME NOT NULL,
    "remainingUses" INTEGER NOT NULL DEFAULT -1,
    "totalUses" INTEGER NOT NULL DEFAULT 0,
    "paymentRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DiscountPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserPlan_planHolderId_fkey" FOREIGN KEY ("planHolderId") REFERENCES "PlanHolder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserPlan_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserPlan_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userPlanId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientNote" TEXT,
    "doctorNote" TEXT,
    "diagnosis" TEXT,
    "prescriptions" TEXT,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contract_userPlanId_fkey" FOREIGN KEY ("userPlanId") REFERENCES "UserPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contract_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userPlanId" TEXT NOT NULL,
    "planHolderId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "contractId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "patientNote" TEXT,
    "doctorNote" TEXT,
    "diagnosis" TEXT,
    "prescriptions" TEXT,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "visitedAt" DATETIME,
    "confirmedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Visit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Visit_userPlanId_fkey" FOREIGN KEY ("userPlanId") REFERENCES "UserPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Visit_planHolderId_fkey" FOREIGN KEY ("planHolderId") REFERENCES "PlanHolder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Visit_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Visit_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "pendingBalance" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "balanceAfter" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "description" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "trackingCode" TEXT,
    "receiptUrl" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settlement_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Settlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "score" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentDocument_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentDocument_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "userPlanId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Commission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Commission_userPlanId_fkey" FOREIGN KEY ("userPlanId") REFERENCES "UserPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "refId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenHash" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "device" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "ip" TEXT,
    "lastLoginAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "mobile" TEXT,
    "ip" TEXT,
    "device" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mobile" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "verifyAttempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ip" TEXT,
    "device" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_mobile_idx" ON "User"("mobile");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_nationalCode_key" ON "UserProfile"("nationalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_userId_key" ON "Doctor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_medicalCode_key" ON "Doctor"("medicalCode");

-- CreateIndex
CREATE INDEX "Doctor_status_idx" ON "Doctor"("status");

-- CreateIndex
CREATE INDEX "Doctor_specialty_idx" ON "Doctor"("specialty");

-- CreateIndex
CREATE INDEX "DiscountPlan_status_idx" ON "DiscountPlan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PlanHolder_nationalCode_key" ON "PlanHolder"("nationalCode");

-- CreateIndex
CREATE INDEX "PlanHolder_userId_idx" ON "PlanHolder"("userId");

-- CreateIndex
CREATE INDEX "PlanHolder_mobile_idx" ON "PlanHolder"("mobile");

-- CreateIndex
CREATE INDEX "PlanHolder_status_idx" ON "PlanHolder"("status");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_planHolderId_idx" ON "Payment"("planHolderId");

-- CreateIndex
CREATE INDEX "Payment_planId_idx" ON "Payment"("planId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_gateway_idx" ON "Payment"("gateway");

-- CreateIndex
CREATE INDEX "Payment_refId_idx" ON "Payment"("refId");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPlan_paymentId_key" ON "UserPlan"("paymentId");

-- CreateIndex
CREATE INDEX "UserPlan_userId_idx" ON "UserPlan"("userId");

-- CreateIndex
CREATE INDEX "UserPlan_planHolderId_idx" ON "UserPlan"("planHolderId");

-- CreateIndex
CREATE INDEX "UserPlan_status_idx" ON "UserPlan"("status");

-- CreateIndex
CREATE INDEX "UserPlan_source_idx" ON "UserPlan"("source");

-- CreateIndex
CREATE INDEX "UserPlan_endDate_idx" ON "UserPlan"("endDate");

-- CreateIndex
CREATE INDEX "Contract_userId_idx" ON "Contract"("userId");

-- CreateIndex
CREATE INDEX "Contract_userPlanId_idx" ON "Contract"("userPlanId");

-- CreateIndex
CREATE INDEX "Contract_doctorId_idx" ON "Contract"("doctorId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_createdAt_idx" ON "Contract"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_contractId_key" ON "Visit"("contractId");

-- CreateIndex
CREATE INDEX "Visit_userId_idx" ON "Visit"("userId");

-- CreateIndex
CREATE INDEX "Visit_userPlanId_idx" ON "Visit"("userPlanId");

-- CreateIndex
CREATE INDEX "Visit_planHolderId_idx" ON "Visit"("planHolderId");

-- CreateIndex
CREATE INDEX "Visit_doctorId_idx" ON "Visit"("doctorId");

-- CreateIndex
CREATE INDEX "Visit_status_idx" ON "Visit"("status");

-- CreateIndex
CREATE INDEX "Visit_createdAt_idx" ON "Visit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_visitId_key" ON "Review"("visitId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_doctorId_idx" ON "Review"("doctorId");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_status_idx" ON "Wallet"("status");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_idx" ON "WalletTransaction"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "WalletTransaction_status_idx" ON "WalletTransaction"("status");

-- CreateIndex
CREATE INDEX "WalletTransaction_referenceType_referenceId_idx" ON "WalletTransaction"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "Settlement_walletId_idx" ON "Settlement"("walletId");

-- CreateIndex
CREATE INDEX "Settlement_userId_idx" ON "Settlement"("userId");

-- CreateIndex
CREATE INDEX "Settlement_status_idx" ON "Settlement"("status");

-- CreateIndex
CREATE INDEX "Settlement_trackingCode_idx" ON "Settlement"("trackingCode");

-- CreateIndex
CREATE INDEX "Settlement_requestedAt_idx" ON "Settlement"("requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_userId_key" ON "Agent"("userId");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "AgentDocument_agentId_idx" ON "AgentDocument"("agentId");

-- CreateIndex
CREATE INDEX "AgentDocument_status_idx" ON "AgentDocument"("status");

-- CreateIndex
CREATE INDEX "Commission_agentId_idx" ON "Commission"("agentId");

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "Commission"("status");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PageContent_slug_key" ON "PageContent"("slug");

-- CreateIndex
CREATE INDEX "PageContent_slug_idx" ON "PageContent"("slug");

-- CreateIndex
CREATE INDEX "Upload_userId_idx" ON "Upload"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_userId_deviceId_key" ON "UserDevice"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "LoginLog_userId_idx" ON "LoginLog"("userId");

-- CreateIndex
CREATE INDEX "LoginLog_createdAt_idx" ON "LoginLog"("createdAt");

-- CreateIndex
CREATE INDEX "OtpCode_mobile_idx" ON "OtpCode"("mobile");

-- CreateIndex
CREATE INDEX "OtpCode_expiresAt_idx" ON "OtpCode"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
