# Production Deployment Runbook (V1)

**Application:** Hami Card V2 (حامی‌کارت)  
**Target Artifact:** Release Candidate 1 (RC1)  
**Strategy:** Blue/Green or Symlink Atomic Cutover  

---

## 1. Pre-Deployment Timeline (T Minus)

- **T - 30 min (Backup Verification):**
  - Verify full snapshot of database (`sqlite3 dev.db ".backup backup_pre_deploy.db"`).
  - Verify static assets archive (`tar -czf uploads_backup.tar.gz uploads/`).
  - Confirm integrity and file sizes of backups.

- **T - 15 min (Health & Infrastructure Check):**
  - Verify system memory, CPU load, and disk capacity (> 15GB free disk space).
  - Test TLS certificate validity and expiry dates.
  - Verify DNS routing and Nginx reverse proxy configuration.

- **T - 10 min (Pre-Release Notice):**
  - Enable maintenance notification banner if scheduled downtime is expected.

- **T - 5 min (Artifact Verification):**
  - Check SHA256 checksum of RC1 standalone build directory.
  - Ensure `.env` is loaded with production secrets and `NODE_ENV=production`.

---

## 2. Deployment Execution (T Zero)

- **T0 (Deploy Trigger):**
  - Extract/sync `.next/standalone` to release path `/var/www/hamicard/releases/rc1`.
  - Copy public assets and static directories:
    ```bash
    cp -r public /var/www/hamicard/releases/rc1/public
    cp -r .next/static /var/www/hamicard/releases/rc1/.next/static
    ```
  - Run database migration deploy (if applicable):
    ```bash
    npx prisma migrate deploy
    ```
  - Switch atomic symlink:
    ```bash
    ln -sfn /var/www/hamicard/releases/rc1 /var/www/hamicard/current
    ```
  - Reload service:
    ```bash
    pm2 reload hamicard-v2 --update-env
    ```

---

## 3. Post-Deployment Verification (T Plus)

- **T + 2 min:** Check health endpoint (`curl -f https://example.com/api`).
- **T + 5 min:** Run Authentication smoke test (Login OTP flow with production smoke account).
- **T + 10 min:** Execute critical user journeys (Browse Doctors, View Active Plans, Check Reviews).
- **T + 15 min:** Inspect error logs (`pm2 logs --lines 100`) for any 5xx spikes or unhandled exceptions.
- **T + 30 min:** Final stabilization check and disable maintenance banner.
