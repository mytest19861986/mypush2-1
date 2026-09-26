# Mission 567 — Production Operations Baseline & Monitoring Report

## Executive Summary
Mission 567 has been executed strictly within the operational governance bounds defined by the Commander. We have established an automated, lightweight, read-only monitoring baseline for the Hami Card production ecosystem on server `92.118.190.101`.

The health checks operate on an isolated 5-minute periodic schedule via systemd (`hami-card-monitor.timer`), logging in structured JSON format with automated log rotation (`/etc/logrotate.d/hami-card-monitor`).

---

## 1. Operations Baseline Metrics

| Metric / Check | Target / Boundary | Current Measured Value | Status |
|---|---|---|---|
| Hami HTTPS Health | `https://92.118.190.101/` | `200 OK` | PASS ✅ |
| Canonical Redirect | `http://92.118.190.101/` | `301 Moved Permanently` | PASS ✅ |
| Hami Container | `hami-card-client-demo` | Up / Running | PASS ✅ |
| Baseline Container | `hami-card-bringup` (:3000) | Up / Running | PASS ✅ |
| Codesho Isolation | `https://codesho.ir/` (:18080) | `200 OK` | PASS ✅ |
| Nginx Reverse Proxy | Service active | `active` | PASS ✅ |
| TLS Certificate SAN | `IP:92.118.190.101` | Valid / Match | PASS ✅ |
| Certbot Renew Timer | `snap.certbot.renew.timer` | Active | PASS ✅ |
| Certificate Remaining | > 0 days | ~5 days (Auto-renews daily) | PASS ✅ |
| Disk Usage | < 85% | 41% (34GB Available) | PASS ✅ |
| Memory Available | > 500MB | 5,715 MB Available | PASS ✅ |
| Container Restarts | Count = 0 | 0 Restarts | PASS ✅ |
| HTTP 5xx Found | 0 Critical Runtime 5xx | 0 Found | PASS ✅ |

---

## 2. Monitoring & Logging Infrastructure
1. **Health Script**: `/opt/ops/hami-card/health-check.sh`
   - *Nature*: 100% Read-Only. No mutations, no restarts, no writes to database.
   - *Execution*: Generates JSON-formatted logs to `/var/log/hami-card-monitor/health.log`.
2. **Scheduled Timer**:
   - `hami-card-monitor.service`: Runs `/opt/ops/hami-card/health-check.sh`.
   - `hami-card-monitor.timer`: Runs every 5 minutes (`OnUnitActiveSec=5min`).
3. **Log Rotation**:
   - `/etc/logrotate.d/hami-card-monitor`: Retains 4 weekly compressed logs, copytruncate enabled.

---

## 3. Hard Locks Compliance
- **Hami Application Code**: NO CHANGE 🔒
- **Hami :3001 Deployment**: NO CHANGE 🔒
- **Baseline :3000**: NO CHANGE 🔒
- **Production DB**: NO CHANGE 🔒
- **Database Schema & Migrations**: 0 🔒
- **Nginx & TLS Routing**: NO CHANGE 🔒
- **Codesho Application**: NO CHANGE 🔒
- **Git Tags**: NO CHANGE 🔒
