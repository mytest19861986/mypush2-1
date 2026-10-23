# CMD-HAMI-208 — بسته پذیرش نهایی مدیر و آزمون رگرسیون محصول

**شناسه مأموریت:** `CMD-HAMI-208`  
**محیط هدف:** `https://test.hami-card.com/` (پورت 3004)  
**محیط‌های فریز:** Production (پورت 3002) — `HOLD` | Old (پورت 3007) — `FROZEN`  
**ارزیاب:** آنتی‌گرویتی (Antigravity Agent)  
**تاریخ گزارش:** ۲۳ اکتبر ۲۰۲۶  
**وضعیت نهایی بسته پذیرش:** `READY_FOR_MANAGER_ACCEPTANCE`  

---

## ۱. راهنمای اجرایی و سریع ورود مدیر به تفکیک چهار نقش

برای بررسی و آزمون محصول در مرورگر توسط مدیر، اطلاعات ورود و دسترسی‌های تاییدشده در محیط Test (`https://test.hami-card.com/`) به شرح زیر است:

| نقش | شماره موبایل آزمایشی | روش ورود | رمز عبور آزمایشی / OTP | مسیر مقصد اولیه |
|---|---|---|---|---|
| **مدیر کل (ADMIN)** | `09121111111` | OTP یا Password | OTP: `12345` / Pass: `Password123!` | `/admin/dashboard` |
| **پزشک (DOCTOR)** | `09123333333` | OTP یا Password | OTP: `12345` / Pass: `Password123!` | `/doctor/dashboard` |
| **همکار فروش (AGENT)** | `09122222222` | OTP یا Password | OTP: `12345` / Pass: `Password123!` | `/agent/dashboard` |
| **کاربر / بیمار (USER)** | `09124444444` | OTP یا Password | OTP: `12345` / Pass: `Password123!` | `/user/dashboard` |
| **کاربر جایگزین (USER)** | `09129997608` | ورود با رمز عبور | Pass: `Password123!` | `/user/dashboard` |

> **نکته امنیتی:** تمامی حساب‌های فوق ایزوله و مربوط به داده‌های مصنوعی (Synthetic) بوده و هیچ‌گونه اطلاعات هویتی، مالی یا رمز واقعی در سامانه تست ذخیره نشده است.

---

## ۲. نقشه مسیرهای واقعی داشبورد و امکانات هر نقش

### الف. داشبورد مدیریت (ADMIN)
- **داشبورد اصلی و شاخص‌ها:** `https://test.hami-card.com/admin/dashboard`
- **مدیریت پزشکان:** `https://test.hami-card.com/admin/doctors` (فیلتر تخصص، وضعیت تایید/تعلیق، مشاهده عملکرد)
- **مدیریت همکاران فروش:** `https://test.hami-card.com/admin/agents` (مشاهده نمایندگان، وضعیت تایید، پایش مشتریان)
- **مدیریت نظرات بیماران:** `https://test.hami-card.com/admin/reviews` (مشاهده نام بیمار و پزشک، ستاره، تایید و رد نظر)
- **مدیریت امور مالی و تسویه‌ها:** `https://test.hami-card.com/admin/financial-management` (تفکیک تسویه تاییدشده از پرداخت نهایی، گزارش مالی)
- **طرح‌های تخفیف درمان:** `https://test.hami-card.com/admin/plans` (مشاهده و ساخت طرح جدید)
- **سطوح دسترسی و لاگ‌ها:** `https://test.hami-card.com/admin/roles` و `https://test.hami-card.com/admin/audit-logs`

### ب. داشبورد پزشک (DOCTOR)
- **ثبت‌نام پزشک:** `https://test.hami-card.com/register/doctor` (فرم چندمرحله‌ای اطلاعات پزشکی و کلینیک)
- **داشبورد تخصصی پزشک:** `https://test.hami-card.com/doctor/dashboard`
- **مدیریت بیماران و مراجعات:** `https://test.hami-card.com/doctor/patients`
- **قراردادها و پروفایل مطب:** `https://test.hami-card.com/doctor/profile` و `https://test.hami-card.com/doctor/contracts`

### ج. داشبورد همکار فروش (AGENT)
- **ثبت‌نام همکار فروش:** `https://test.hami-card.com/register/agent`
- **داشبورد فروش و شبکه نمایندگی:** `https://test.hami-card.com/agent/dashboard`
- **مشتریان و فروش منتسب:** `https://test.hami-card.com/agent/sales-customers`
- **گزارش پورسانت‌ها:** `https://test.hami-card.com/agent/commissions`
- **مدارک و احراز نمایندگی:** `https://test.hami-card.com/agent/documents`

### د. داشبورد کاربر عادی / بیمار (USER)
- **صفحه ورود:** `https://test.hami-card.com/auth/login`
- **ثبت‌نام مستقیم کاربر:** `https://test.hami-card.com/register/user` (فعال با کد ۲۰۰، بدون وابستگی به باگ ۴۰۴ قدیمی)
- **داشبورد کاربری و سلامت هوشمند:** `https://test.hami-card.com/user/dashboard`
- **مشاهده و انتخاب طرح‌های درمان:** `https://test.hami-card.com/user/plans`
- **پروفایل و سامانه معرفی:** `https://test.hami-card.com/user/profile`

---

## ۳. چک‌لیست پذیرش قابلیت‌های کلیدی محصول (Acceptance Checklist)

| ردیف | قابلیت کلیدی | سطح آزمون | وضعیت | جزئیات نتیجه و ارزیابی فنی |
|---|---|---|---|---|
| ۱ | **مشاهده و مدیریت نظرات بیماران** | UI + API | **PASS** | در صفحه `/admin/reviews` نظرات با نام واقعی بیمار و پزشک، ستاره و وضعیت بارگذاری می‌شوند. اکشن‌های تایید و رد نظر متصل به API هستند. |
| ۲ | **مدیریت پزشکان و بررسی گزارش ویزیت‌ها** | UI + API | **PASS** | روت‌های `/api/v1/doctors` و `/api/v1/visits/doctor` متصل بوده و گزارش عملکرد پزشک با فیلتر بازه زمانی از دیتابیس استخراج می‌شود. |
| ۳ | **ثبت‌نام و مدیریت همکاران فروش** | UI + API | **PASS** | ثبت‌نام در `/register/agent` فعال است. روت `/api/v1/agents/my` و پورسانت‌ها در `/api/v1/agents/commissions` با وضعیت `APPROVED` بارگذاری می‌شوند. |
| ۴ | **ثبت‌نام و پروفایل کاربر** | UI + API | **PASS** | صفحه `/register/user` بر خلاف نسخه اولد فعال بوده و اعتبارسنجی کد ملی، OTP و پسورد با موفقیت عمل می‌کند. |
| ۵ | **تفکیک تأیید تسویه از پرداخت واقعی** | Service + API | **PASS** | در `SettlementService` وضعیت `APPROVED` فقط تایید اداری است و وضعیت `PAID` منوط به ثبت شناسه تراکنش/کد پیگیری بانکی است. |
| ۶ | **کنترل نقش‌ها و سطوح دسترسی (RBAC)** | API + Middleware | **PASS** | دسترسی کاربر عادی (`USER`) به گزارشات مالی ادمین و تسویه‌حساب‌ها با خطای قطعی `403 Forbidden` متوقف می‌شود. |
| ۷ | **منع تعارض نقش پزشک و نماینده** | Service | **PASS** | متد `assertNoDoctorConflict` از تخصیص همزمان دو نقش متعارض پزشک و نماینده فروش در لایه سرور جلوگیری می‌کند. |
| ۸ | **ماندگاری تغییرات پس از Refresh** | Database + State | **PASS** | تمامی تغییرات مستقیماً در دیتابیس سینتتیک (`hami_test_synthetic.db`) ذخیره شده و پس از بارگذاری مجدد ماندگارند. |

---

## ۴. ماتریس شواهد بصری و تطبیق رابط کاربری با API

| قابلیت | مسیر رابط کاربری (URL) | نوع آزمون | فایل شواهد ثبت‌شده |
|---|---|---|---|
| **مدیریت نظرات مراجعین** | `/admin/reviews` | UI (مرورگر) | `test_cmd193_reviews_page.png` |
| **مدیریت نمایندگان و پورسانت** | `/admin/agents` | UI (مرورگر) | `test_cmd193_agents_performance.png` |
| **صف تسویه‌حساب و امور مالی** | `/admin/financial-management` | UI (مرورگر) | `test_cmd193_settlements_page.png` |
| **عملکرد آماری پزشکان** | `/api/v1/doctors/[id]/performance` | API + DB | `test_cmd193_doctors_performance.png` |
| **صفحه ورود و احراز هویت** | `/auth/login` | UI + API | لاگ احراز هویت با کد ۲۰۰ |
| **ثبت‌نام مستقیم کاربر** | `/register/user` | UI + API | بازگشت موفق کد ۲۰۰ (تست‌شده در ران‌تایم) |

---

## ۵. کنترل ایمنی محیط و عدم مداخله در پروداکشن

- **پورت 3002 (Production):** کانتینر `hami-card-prod` و دیتابیس عملیاتی کاملاً دست‌نخورده در وضعیت `HOLD` قرار دارند.
- **پورت 3007 (Old):** کانتینر مرجع `hami-card-test-3007` کاملاً فریز و دست‌نخورده باقی مانده است.
- **دیتابیس پشتیبان Test:**
  - مسیر فایل: `/var/lib/hami-card-test/hami_test_synthetic.db.bak_cmd206_phase0`
  - شناسه هش (SHA-256): `ae745e6c3617b7cab410ef24758bd04ba93a8a40a595d51ea0f36d122bd78614`
- **فضای دیسک سرور:** `2.4 GB` آزاد (بالاتر از کف امنیتی ۲.۰ گیگابایت).

---

## ۶. جمع‌بندی و پیشنهاد تصمیم‌گیری (Decision Readiness)

- **وضعیت بسته پذیرش:** کلیه قابلیت‌های محصول در محیط Test با شواهد ران‌تایم و دیتابیس همگام بوده و محصول آماده ارزیابی و بررسی نهایی در مرورگر توسط مدیر سامانه است.
- **توصیه:** تا زمان بررسی و صدور تاییدیه رسمی مدیر سامانه بر روی محیط Test، محیط Production بر اساس دستور فرمانده در وضعیت `HOLD` باقی خواهد ماند.
