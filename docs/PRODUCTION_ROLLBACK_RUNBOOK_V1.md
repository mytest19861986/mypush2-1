# Production Rollback Runbook (V1)

**Application:** Hami Card V2 (حامی‌کارت)  
**Objective:** Restore last-known-stable production version within RTO < 5 minutes.  

---

## 1. Rollback Triggers

Rollback MUST be initiated immediately if any of the following occur during or after deployment:
1. Application crash-loop or failure to bind to port (`pm2 status` shows ERRORED).
2. HTTP 5xx error rate exceeds 2% across 3 consecutive minutes.
3. Database connectivity failure or fatal Prisma runtime exception.
4. Security failure or critical auth regression (inability to log in or token validation failure).

---

## 2. Step-by-Step Rollback Execution

1. **Stop Rollout & Set Maintenance Header:**
   ```bash
   # In Nginx or Reverse Proxy, route to maintenance page if needed
   touch /var/www/hamicard/maintenance.flag
   ```

2. **Revert Atomic Symlink to Previous Release:**
   ```bash
   # Switch symlink back to previous verified artifact
   ln -sfn /var/www/hamicard/releases/previous_stable /var/www/hamicard/current
   ```

3. **Restart Application Service:**
   ```bash
   pm2 restart hamicard-v2 --update-env
   ```

4. **Database Rollback Decision:**
   - In SQLite, restore the verified pre-deployment snapshot if schema or data was altered:
     ```bash
     cp backup_pre_deploy.db /var/www/hamicard/database/hami-card.db
     ```

5. **Verify Health:**
   ```bash
   curl -f http://127.0.0.1:3000/api
   ```

6. **Clear Maintenance Flag:**
   ```bash
   rm -f /var/www/hamicard/maintenance.flag
   ```

7. **Conduct Post-Mortem & Incident Logging:**
   - Archive logs to `/var/log/hamicard/incidents/`.
   - Prepare Root Cause Analysis (RCA) report for Commander.
