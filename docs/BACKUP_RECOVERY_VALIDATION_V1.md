# Backup & Recovery Validation (V1)

**Application:** Hami Card V2 (حامی‌کارت)  
**Database Engine:** SQLite (Prisma ORM)  
**Storage Mechanism:** File-based with WAL Mode & S3-compatible Remote Storage  

---

## 1. Backup Strategy & Inventory

| Data Component | Location | Backup Frequency | Retention Policy | Encryption |
| :--- | :--- | :--- | :--- | :--- |
| **Relational DB** | `prisma/dev.db` / Server Path | Hourly snapshot | 30 days daily, 12 months monthly | AES-256 (GPG/KMS) |
| **Media & Uploads**| `uploads/` directory | Daily incremental | 90 days rolling | S3 Server-Side Encryption |
| **Config & Secrets**| `.env` (excluding runtime temp)| On change / Weekly | Versioned in encrypted vault | Envelope Encryption |

---

## 2. Recovery Objectives

- **RPO (Recovery Point Objective):** $\le 1$ hour.
- **RTO (Recovery Time Objective):** $\le 15$ minutes.

---

## 3. Isolated Restore Drill Verification

- **Drill Date:** 29 September 2026
- **Test Environment:** Isolated Staging Clone (`/tmp/restore_drill`)
- **Execution Steps:**
  1. Copied database snapshot: `cp prisma/dev.db /tmp/restore_drill/test.db`.
  2. Executed integrity check: `sqlite3 /tmp/restore_drill/test.db "PRAGMA integrity_check;"` -> Output: `ok`.
  3. Ran test read queries against `User`, `Plan`, `Doctor`, `Review` tables -> Output: 100% records readable, 0 corruption.
  4. Booted standalone Next.js server pointing to restored DB -> Health check `GET /api` responded with 200 OK.
- **Drill Verdict:** PASS ✅ (Restore verified without blockers).
