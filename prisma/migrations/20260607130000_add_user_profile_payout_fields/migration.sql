-- Minimal owner profile payout fields for manual commission settlement.
ALTER TABLE "UserProfile" ADD COLUMN "payoutCardNumber" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "payoutSheba" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "payoutAccountOwnerName" TEXT;
