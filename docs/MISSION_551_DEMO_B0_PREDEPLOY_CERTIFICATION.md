# MISSION 551-DEMO-B0: Pre-Deployment Artifact Certification & Runbook

**Mission**: HCP-MSN-551-DEMO-B0  
**Target Release**: `v2.4.2-client-premium-demo-approved`  
**Approved Commit SHA**: `c84f516c684a92279bc34bf0bff883a9f4e9685a`  
**Certification Date**: 2026-09-24  
**Target Server**: `92.118.190.101`  
**Demo Runtime Port**: `127.0.0.1:3001`  
**Production Runtime Port**: `127.0.0.1:3000` (100% UNTOUCHED 🔒)

---

## ۱. نتایج راستی‌آزمایی تگ و مخزن گیت (Remote Tag Verification)

| مشخصه | مقدار مورد انتظار | مقدار ثبت‌شده | وضعیت |
| :--- | :--- | :--- | :--- |
| **Git Tag** | `v2.4.2-client-premium-demo-approved` | `v2.4.2-client-premium-demo-approved` | PASS ✅ |
| **Commit SHA** | `c84f516c684a92279bc34bf0bff883a9f4e9685a` | `c84f516c684a92279bc34bf0bff883a9f4e9685a` | PASS ✅ |
| **Clean Worktree** | `git status --short: (empty)` | `(empty)` | PASS ✅ |
| **TypeScript Validation** | `npx tsc --noEmit: exit 0` | `0 errors / exit 0` | PASS ✅ |
| **Production Build** | `106 routes compiled` | `106 routes (100%)` | PASS ✅ |
| **Local Runtime Port** | `127.0.0.1:3001` | `HTTP 200 OK` | PASS ✅ |

---

## ۲. ممیزی مسیرهای دمو روی پورت ۳۰۰۱ (Local Demo Smoke Test)

تمام ۵ روت مجاز فاز ۱ دمو به همراه مسیرهای تفکیک‌شده تحت آزمون قرار گرفتند:

| روت هدف | کد پاسخ HTTP | وضعیت ناوبری | نتیجه کرش یا خطای رانتایم | وضعیت کلی |
| :--- | :--- | :--- | :--- | :--- |
| `/admin/dashboard` | 200 OK | دقیقاً ۵ آیتم (داشبورد Active) | بدون خطا (0) | PASS ✅ |
| `/admin/users` | 200 OK | دقیقاً ۵ آیتم (کاربران Active) | بدون خطا (0) | PASS ✅ |
| `/admin/doctors` | 200 OK | دقیقاً ۵ آیتم (پزشکان Active) | بدون خطا (0) | PASS ✅ |
| `/admin/plans` | 200 OK | دقیقاً ۵ آیتم (طرح‌ها Active) | بدون خطا (0) | PASS ✅ |
| `/admin/reviews` | 200 OK | دقیقاً ۵ آیتم (مدیریت نظرات Active) | بدون خطا (0) | PASS ✅ |
| `/admin/financial-management` | 200 OK | **عدم وجود در سایدبار دمو** | بدون اثر جانبی | PASS ✅ |
| `/admin/commissions` | 200 OK | **عدم وجود در سایدبار دمو** | بدون اثر جانبی | PASS ✅ |
| `/admin/roles` | 200 OK | **عدم وجود در سایدبار دمو** | بدون اثر جانبی | PASS ✅ |
| `/admin/permissions` | 200 OK | **عدم وجود در سایدبار دمو** | بدون اثر جانبی | PASS ✅ |

> **قاعده حاکمیتی**: هیچ‌یک از ۷ آیتم پروداکشن خارج از دمو در Navigation یا Quick Actions دمو در دسترس کاربر قرار ندارند.

---

## ۳. مانیفست استقرار (Deployment Manifest)

```yaml
DeploymentManifest:
  Application: "Hami Card Client Demo"
  ContainerName: "hami-card-client-demo"
  ReleaseTag: "v2.4.2-client-premium-demo-approved"
  CommitSHA: "c84f516c684a92279bc34bf0bff883a9f4e9685a"
  TargetHost: "92.118.190.101"
  HostBindingPort: "127.0.0.1:3001"
  ContainerPort: "3000"
  NodeVersion: "22.x"
  ProductionIsolation:
    ProductionDBConnection: "NONE (Isolated Demo / Mock)"
    ProductionEnvCredentials: "NONE"
    DatabaseMigrations: "FORBIDDEN (0 migrations allowed)"
    ProductionPort: "3000 (UNTOUCHED)"
  HealthCheck:
    Endpoint: "http://127.0.0.1:3001/admin/dashboard"
    ExpectedStatus: 200
```

---

## ۴. برنامه بازگشت سریع به عقب (Rollback Plan)

در صورت بروز هرگونه اخلال حین استقرار در پورت ۳۰۰۱، پلن زیر تضمین می‌کند که پروداکشن بدون کوچک‌ترین تأثیری در امان بماند:

```bash
# ==========================================
# SAFE ROLLBACK PROCEDURE (Demo Isolation)
# ==========================================

# ۱. متوقف‌سازی و حذف منحصربفرد کانتینر دمو
docker stop hami-card-client-demo || true
docker rm hami-card-client-demo || true

# ۲. راستی‌آزمایی پایداری پروداکشن اصلی روی پورت ۳۰۰۰
curl -I http://127.0.0.1:3000/

# ۳. بررسی پروسه‌های فعال
docker ps --filter "name=hami-card-client-demo"

# خطوط قرمز امنیتی:
# ❌ هیچ‌گونه دستور docker system prune مجاز نیست.
# ❌ هیچ والوم مشترک یا دیتابیسی حذف نخواهد شد.
# ❌ سرویس پروداکشن روی پورت ۳۰۰۰ ری‌استارت نخواهد شد.
```

---

## ۵. گواهی عدم وابستگی به پروداکشن (Zero Production Risk Declaration)
- تغییرات در کد: **۰**
- تغییرات در فایل‌های پروداکشن: **۰**
- تغییرات در پایگاه داده یا مایگریشن: **۰**
- تغییرات روی سرور ریموت در این مرحله: **۰**
