-- Local-only preparation. Applying this to a live database requires separate approval.
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordedById" TEXT NOT NULL,
    "subjectUserId" TEXT,
    "clientRequestId" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" TEXT NOT NULL CHECK ("direction" IN ('INBOUND', 'OUTBOUND')),
    "topic" TEXT NOT NULL CHECK ("topic" IN ('REGISTRATION', 'DOCUMENTS', 'PAYMENT', 'SUPPORT', 'OTHER')),
    "outcome" TEXT NOT NULL CHECK ("outcome" IN ('COMPLETED', 'NO_ANSWER', 'FOLLOW_UP', 'CANCELLED')),
    "followUpStatus" TEXT NOT NULL DEFAULT 'NONE' CHECK ("followUpStatus" IN ('NONE', 'PENDING', 'DONE')),
    "followUpAt" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CallLog_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CallLog_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CallLog_recordedById_clientRequestId_key" ON "CallLog"("recordedById", "clientRequestId");
CREATE INDEX "CallLog_occurredAt_idx" ON "CallLog"("occurredAt");
CREATE INDEX "CallLog_subjectUserId_occurredAt_idx" ON "CallLog"("subjectUserId", "occurredAt");
CREATE INDEX "CallLog_followUpStatus_followUpAt_idx" ON "CallLog"("followUpStatus", "followUpAt");
-- Define permissions without assigning or expanding any user's access.
INSERT INTO "Permission" ("id", "name", "module", "title") VALUES
('hami_permission_view_call_logs', 'view_call_logs', 'call_logs', 'مشاهده تماس‌های ثبت‌شده'),
('hami_permission_manage_call_logs', 'manage_call_logs', 'call_logs', 'ثبت تماس و پیگیری')
ON CONFLICT("name") DO NOTHING;
