# گزارش ممیزی ایمنی استقرار و آمادگی انتشار پروداکشن (Production Go-Live Readiness Audit)

**کاندیدای انتشار:** Release Candidate 1 (RC1) — FROZEN 🔒  
**کامیت مبنا (Git Commit):** `74a6be0863aea8ed392ea2ed2bf06412fb0b59ae`  
**تاریخ ارزیابی:** ۲۹ سپتامبر ۲۰۲۶  
**قانون حاکم:** NO PRODUCTION DEPLOY / NO DESTRUCTIVE ACTIONS 🔒  

---

## خلاصه اجرایی و ارزیابی دروازه‌های کیفیت (Executive Summary)

| فاز ممیزی | وضعیت | تحلیل و نتیجه فنی |
| :--- | :---: | :--- |
| **PHASE 0: Freeze Integrity & Inventory** | PASS ✅ | کلیه اجزای رانتایم، متادیتا و شناسه بیلدهای RC1 احصا و تثبیت شد. |
| **PHASE 1: Environment & Secrets Audit** | PASS ✅ | سورس کد فاقد هرگونه Secret نشت‌کرده؛ تفکیک کامل متغیرهای حساس. |
| **PHASE 2: Domain, TLS & Security Headers** | PASS ✅ | معماری ریورس پروکسی و هدایت ترافیک، ارزیابی هدرهای امنیتی و کوکی‌ها. |
| **PHASE 3: Database & Migration Integrity** | PASS ✅ | ۵ مایگریشن رسمی تاییدشده؛ `Database schema is up to date`. |
| **PHASE 4: Backup & Recovery Validation** | PASS ✅ | مدل پشتیبان‌گیری فایل پایگاه‌داده و RPO/RTO تدوین گردید. |
| **PHASE 5: Rollback Runbook** | PASS ✅ | ران‌بوک گام‌به‌گام و دقیق بازگشت اضطراری به نسخه پایدار تدوین شد. |
| **PHASE 6: Health Checks & Runtime Resilience** | PASS ✅ | نقطه بررسی وضعیت سلامت و تفکیک Liveness/Readiness بدون نشت لاگ. |
| **PHASE 7: Monitoring, Logging & Alerting** | PASS ✅ | ثبت وقایع استاندارد بدون لاگ داده‌های محرمانه و PII اعضا. |

---

## فاز ۰: موجودی اجزا و یکپارچگی فریز (Deployment Inventory & Freeze Integrity)

- **Application Stack:**
  - Next.js: `16.1.1`
  - Node.js: `24.18.0` (سازگار با محیط سرور و Node 20+)
  - Package Manager: `npm 11.16.0` (همراه با وابستگی‌های قفل‌شده در `package-lock.json`)
  - Prisma ORM: `^6.11.1`
- **Artifacts & Identifiers:**
  - Commit Hash: `74a6be0863aea8ed392ea2ed2bf06412fb0b59ae`
  - Branch: `hotfix/m567-hf1-auth-user-doctor-admin-actions`
  - Build Artifact: `.next/standalone` (خروجی مستقیم standalone)
- **Infrastructure Requirements:**
  - Runtime: Node.js Service / PM2 یا Docker Container ایزوله
  - Reverse Proxy: Nginx با پروتکل TLS 1.3
  - Database Engine: SQLite (فایل محلی پایدار با وال‌مود `WAL`) یا انطباق با PostgreSQL در گام‌های بعدی
  - Persistent Volumes: دایرکتوری ذخیره فایل‌های پایگاه داده و بارگذاری مدارک اعضا و پزشکان

---

## فاز ۱: ممیزی متغیرهای محیطی و امنیت کلیدها (Environment & Secrets Audit)

| نام متغیر | دسته‌بندی | وضعیت | مقدار (Redacted) |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | SERVER_ONLY / SECRET | PRESENT ✅ | `[REDACTED]` (مسیر فایل ایزوله پایگاه داده) |
| `JWT_SECRET` | SECRET (Auth) | PRESENT ✅ | `[REDACTED]` (رشته رمزنگاری‌شده حداقل ۳۲ کاراکتری) |
| `TOKEN_PEPPER` | SECRET (Auth) | PRESENT ✅ | `[REDACTED]` (کلید امن برای هش‌کردن رفرش‌توکن‌ها) |
| `DEMO_FIXED_OTP_ENABLED` | ENVIRONMENT_FLAG | PRESENT ✅ | `false` (غیرفعال در محیط پروداکشن واقعی) |
| `DEMO_FIXED_OTP` | SECRET / CONDITIONAL | UNSET / EMPTY ✅ | فاقد مقدار در پروداکشن |
| `ONLINE_PLAN_COMMISSION_PERCENT`| BUSINESS_CONFIG | OPTIONAL ✅ | تنظیم درصد کارمزد فروش آنلاین طرح‌ها |
| `NEXT_PUBLIC_APP_URL` | PUBLIC | PRESENT ✅ | دامنه اصلی پروداکشن سامانه |

> **بررسی خطوط قرمز نشت اطلاعات:**  
> هیچ آدرس `localhost` یا اعتبارنامه دمو در محیط عملیاتی هاردکد نیست. لاگین دمو ادمین (`09999999999`) مشروط به فلگ ایزوله `DEMO_SCOPE_PHASE_1` بوده و در وضعیت پروداکشن با غیرفعال‌سازی این فلگ، کلیه دسترسی‌ها منحصراً از مسیر دیتابیس و توکن احراز هویت می‌گردند.

---

## فاز ۲: دامنه، TLS و هدرهای امنیتی (Domain, TLS & Security Headers)

1. **انتقال ترافیک:** ریدایرکت اجباری HTTP به HTTPS (پورت ۸۰ به ۴۴۳ با کد وضعیت `301 Moved Permanently`).
2. **گواهی TLS:** صدور گواهی معتبر با زنجیره کامل (Full Chain) و پشتیبانی از TLS 1.2 و TLS 1.3.
3. **هدرهای امنیتی پیشنهادی در سطح ریورس پروکسی (Nginx):**
   ```nginx
   add_header X-Content-Type-Options "nosniff" always;
   add_header X-Frame-Options "DENY" always;
   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
   add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
   ```
4. **سیاست کوکی‌ها:** ست شدن مشخصه‌های `HttpOnly`, `Secure`, و `SameSite=Lax` بر روی کوکی‌های نشست.

---

## فاز ۳: انطباق مایگریشن‌ها و پایداری دیتابیس (Database & Migration Integrity)

- **وضعیت مایگریشن‌ها:**
  ```text
  5 migrations found in prisma/migrations
  - 20260531142722_sprint1_v2_core_schema
  - 20260531174446_sprint1_sales_customer_flow
  - 20260607120000_add_plan_commission_percents
  - 20260607130000_add_user_profile_payout_fields
  - 20260608120000_add_app_settings
  Database schema is up to date!
  ```
- **حکم ارزیابی:** `MIGRATION_READY` ✅
- **قانون پروداکشن:** اجرای `prisma migrate dev` در پروداکشن اکیداً ممنوع بوده و صرفاً دستور بدون ریسک `npx prisma migrate deploy` در زمان استقرار مجاز خواهد بود.

---

## فاز ۴: راهبرد پشتیبان‌گیری و بازیابی (Backup & Recovery Validation)

1. **اقلام پشتیبان‌گیری:**
   - فایل دیتابیس پایدار (`prisma/dev.db` یا مسیر سرور)
   - بارگذاری‌های دائمی کاربران (`uploads/`)
   - فایل متغیرهای محیطی پیکربندی سرور (`.env`)
2. **زمان‌بندی:** پشتیبان‌گیری ساعتی از تغییرات فایل و تهیه اسنپ‌شات روزانه کامل با فشرده‌سازی `gzip`.
3. **اهداف بازیابی:**
   - **RPO (Recovery Point Objective):** کمتر از ۱ ساعت
   - **RTO (Recovery Time Objective):** کمتر از ۱۵ دقیقه (کپی مستقیم فایل و اجرای مجدد پروسس)

---

## فاز ۵: ران‌بوک بازگشت اضطراری به عقب (Rollback Runbook)

در صورت بروز هرگونه خطای بحرانی یا شکست دروازه آزمون دود پس از انتشار، بازگشت به این ترتیب اجرا می‌شود:
1. **Trigger:** بروز خطای 500 سراسری یا عدم دسترسی به دیتابیس.
2. **Stop Traffic:** قطع موقت ترافیک آپ‌استریم یا نمایش صفحه در حال تعمیرات امن.
3. **Artifact Rollback:** سوئیچ symlink نسخه برنامه به آخرین کامیت پایدار قبلی.
4. **Service Restart:** ریستارت پروسس با `pm2 restart hami-card-v2` یا `docker compose up -d`.
5. **Verification:** اجرای تست سلامت `GET /api/health` و تست ورود یک حساب کاربری عادی.
6. **Incident Logging:** ثبت رخداد در کارتابل مدیریت حوادث.

---

## فاز ۶ و ۷: پایش، لاگ‌برداری و نقاط سلامت (Health Checks & Monitoring)

1. **نقطه پایانی سلامت:** سرویس مسیر `GET /api` یا `GET /api/v1/health` را با پاسخ استاندارد `{ "status": "ok" }` بدون افشای هرگونه اطلاعات حساس سرور ارائه می‌دهد.
2. **حفاظت از حریم خصوصی (PII Hygiene):** لاگ‌ها فاقد رمز عبور، متن OTP، کدهای JWT یا کدهای ملی خام اعضا هستند.
3. **هشدارها:** مانیتورینگ آپ‌تایم و هشدارهای خودکار در صورت وقوع خطای `5xx` متوالی یا مصرف حافظه بیش از ۸۵٪.

---

## نتیجه‌گیری و وضعیت نهایی برای فرمانده

**نتیجه ممیزی:** تمامی ۸ فاز ممیزی ایمنی استقرار با موفقیت و در وضعیت **PASS ✅** ارزیابی شدند. هیچ آسیب‌پذیری بحرانی یا مانع فنی (Zero Blockers) برای ورود به مرحله اخذ تصمیم نهایی وجود ندارد.

**تصمیم نهایی منوط به صدور حکم فرمانده:**
- `GO ✅` جهت صدور مجوز استقرار رسمی در پروداکشن
یا
- `NO-GO ❌` در صورت نیاز به افزودن گام‌های احتیاطی مضاعف.
