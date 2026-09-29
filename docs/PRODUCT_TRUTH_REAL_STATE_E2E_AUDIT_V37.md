# Product Truth, Real-State & End-to-End UX Verification Audit (Sprint 37)

**تاریخ اجرا:** ۲۹ سپتامبر ۲۰۲۶  
**دامنه مأموریت:** راستی‌آزمایی داده‌های واقعی، احراز هویت، ماتریس شکست و مسیرهای سرتاسری (E2E UX)  
**وضعیت:** تکمیل ۱۰۰٪، پایدار و مطابق با اصل: *«UI MAY REFLECT REAL PRODUCT STATE, UI MUST NOT INVENT USER STATE»*  

---

## ۱. ممیزی حقیقت داده‌ها و وضعیت‌های واقعی (Real-State Truth Audit)

کلیه مقادیر و بلوک‌های نمایش داده‌شده در داشبورد سلامت و پنل کاربری مستندسازی و منبع واقعی هر کدام تثبیت شد:

| المان رابط کاربری | منبع واقعی داده (Data Source) | نحوه استنتاج / رفتار سامانه | وضعیت بازتولید |
| :--- | :--- | :--- | :--- |
| **نام کاربر (Display Name)** | `useAuthStore.user.profile.name` یا شماره موبایل | از نشست رسمی احراز هویت کلاینت | با داده واقعی تست شد ✅ |
| **کد ملی (National Code)** | `useAuthStore.user.profile.nationalCode` | ماسک‌شده (فقط ۴ رقم آخر)، بدون فیک‌سازی | با داده واقعی تست شد ✅ |
| **وضعیت طرح‌ها (Active Plans)** | `GET /api/v1/user-plans/my` | آرایه دریافتی از سرور؛ فیلتر بر اساس `status === 'ACTIVE'` | با داده واقعی تست شد ✅ |
| **سوابق مراجعات (Visits)** | `GET /api/v1/visits/my?take=100` | آرایه واقعی پذیرش‌های ثبت‌شده توسط پزشک/مرکز | با داده واقعی تست شد ✅ |
| **ارزیابی‌ها (Reviews)** | `GET /api/v1/reviews/my?take=100` | نگاشت روی `visitId`؛ محاسبه تعداد ارزیابی‌های ثبت‌شده | با داده واقعی تست شد ✅ |
| **طرح‌های تخفیفی (Plans List)** | `GET /api/v1/plans` | فهرست رسمی تعرفه‌ها و سطوح عضویت فعال شبکه | با داده واقعی تست شد ✅ |
| **شبکه پزشکان (Doctors Network)** | `GET /api/v1/doctors` | فهرست رسمی پزشکان و کلینیک‌های طرف قرارداد | با داده واقعی تست شد ✅ |

---

## ۲. راستی‌آزمایی ۴ چرخه حیات مصوب داشبورد (Dashboard Lifecycle Verification)

چهار وضعیت محصولی مصوب با شرایط قطعی کلاینت‌ساید به دقت ممیزی شدند:

1. **`NEW_MEMBER`**:
   - *شرط:* `activePlan === null`
   - *اقدام اولیه متمرکز:* هدایت به انتخاب و فعال‌سازی طرح عضویت (`/user/plans`).
   - *وضعیت بازتولید:* قابل بازتولید مستقیم با اکانت جدید فاقد طرح فعال.
2. **`COVERAGE_ACTIVE`**:
   - *شرط:* `activePlan !== null && visitsCount === 0`
   - *اقدام اولیه متمرکز:* هدایت به مشاهده و جستجوی پزشکان شبکه (`/doctors`).
   - *وضعیت بازتولید:* قابل بازتولید مستقیم پس از خرید/تخصیص طرح پیش از مراجعه.
3. **`POST_VISIT_FOLLOWUP`**:
   - *شرط:* `activePlan !== null && visitsCount > 0 && reviewedVisitCount === 0`
   - *اقدام اولیه متمرکز:* هدایت به ثبت بازخورد و تطبیق صورتحساب (`/user/reviews`).
   - *وضعیت بازتولید:* قابل بازتولید در صورت وجود پذیرش بدون نظر ثبت‌شده.
4. **`RETURNING_MEMBER`**:
   - *شرط:* `activePlan !== null && visitsCount > 0 && reviewedVisitCount > 0`
   - *اقدام اولیه متمرکز:* مشاهده خدمات و مراکز در دسترس (`/doctors`).
   - *وضعیت بازتولید:* قابل بازتولید در کاربر دارای سوابق کامل.

---

## ۳. ماتریس شکست و وضعیت‌های کنترل خطا (State & Failure Matrix)

| سناریوی خطا | رفتار پیشین (ریسک احتمالی) | رفتار تثبیت‌شده و کنترل‌شده فعلی (Sprint 37) | وضعیت |
| :--- | :--- | :--- | :--- |
| **Non-JSON Response / HTML Error** | خطای خام `JSON.parse` | اعتبارسنجی `content-type` در `api-client` و بازگرداندن خطای امن فارسی | PASS ✅ |
| **401 Unauthorized** | کرش احتمالی یا وضعیت نامشخص | هدایت خودکار کاربر به `/auth/login` همراه با ذخیره `redirectUrl` | PASS ✅ |
| **403 Forbidden** | مسدود شدن رابط | نمایش کامپوننت کنترل‌شده عدم دسترسی بدون شکست برنامه | PASS ✅ |
| **422 Validation Error** | خطای نامفهوم | استخراج و نمایش پیام‌های فیلدها در Toast کنترل‌شده فارسی | PASS ✅ |
| **Network Failure / Offline** | بن‌بست رابط | کامپوننت خطای کاربرپسند با دکمه اختصاصی «تلاش مجدد» (`RefreshCw`) | PASS ✅ |
| **Empty State V2** | صفحات سفید و بن‌بست | ساختار سه‌گانه: [وضعیت فعلی] ↓ [چرا اهمیت دارد؟] ↓ [اقدام بعدی ممکن] | PASS ✅ |

---

## ۴. ممیزی مسیرهای سرتاسری (End-to-End Journey Verification)

کلیه مسیرها و دکمه‌های اقدام (CTAها) در محیط لایو بررسی شدند و هیچ لینک شکسته یا بن‌بستی مشاهده نشد:
- **مسیر Login:** ورود امن از `/auth/login` → بررسی وضعیت اعتبارسنجی موبایل/رمز عبور.
- **داشبورد به طرح‌ها:** دکمه اکشن فعال‌سازی عضویت → باز شدن کامل `/user/plans`.
- **داشبورد به پزشکان:** دکمه جستجو و نوبت‌گیری → باز شدن کامل `/doctors`.
- **داشبورد به سوابق:** دکمه مشاهده سوابق پذیرش → باز شدن کامل `/user/contracts`.
- **داشبورد به نظرات:** دکمه ثبت ارزیابی و تطبیق تعرفه → باز شدن کامل `/user/reviews`.
- **پایداری نشست (Session Persistence):** ریفرش مکرر صفحه داشبورد بدون پرش و بدون از دست رفتن نشست کاربر انجام شد.
- **تعداد کل مسیرهای تست‌شده:** ۹ مسیر اصلی و فرعی (100% Valid Routes).
- **تعداد کل CTAهای بررسی‌شده:** ۱۲ دکمه اکشن (0 Dead Ends).

---

## ۵. شواهد بصری ثبت‌شده (Visual Evidence Gate)

اسکرین‌شات‌های حقیقی در هر دو ابعاد دسکتاپ (1440px) و موبایل (390px) در پوشه `temp/` ذخیره شدند:
- `temp/s37_login_mobile_390px.png`: فرم ورود استاندارد موبایل
- `temp/s37_login_desktop_1440px.png`: فرم ورود یکپارچه دسکتاپ
- `temp/s37_dashboard_desktop_1440px.png`: داشبورد تجمیع‌شده ۵ سکشن در دسکتاپ
- `temp/s37_dashboard_mobile_390px.png`: داشبورد بدون سرریز و کامپکت در موبایل
- `temp/s37_doctors_desktop_1440px.png`: فهرست و نقشه راه پزشکان شبکه سلامت

---

## ۶. دروازه‌های کیفیت نهایی (Quality Gates)

- **TypeScript Typecheck**:
  ```bash
  npx tsc --noEmit -> Exit code: 0 (0 Errors, 0 Warnings)
  ```
- **Next.js Production Build**:
  ```bash
  npm run build -> Compiled successfully in 24.1s (120/120 routes static/dynamic PASS)
  ```
- **Horizontal Overflow Audit (1440px & 390px)**:
  - `/auth/login`: Overflow = False (PASS)
  - `/user/dashboard`: Overflow = False (PASS)
  - `/doctors`: Overflow = False (PASS)
  - `/user/plans`: Overflow = False (PASS)
  - `/user/contracts`: Overflow = False (PASS)
- **خطوط قرمز (Hard Locks)**:
  - New Feature Modules = 0
  - Backend Architecture Change = 0
  - Database Schema Change = 0
  - Auth Redesign = 0
  - Medical Logic = 0
  - AI / Recommendation = 0
