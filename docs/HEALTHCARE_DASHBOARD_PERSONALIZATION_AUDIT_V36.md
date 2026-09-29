# Healthcare Dashboard Personalization & Adaptation Experience Audit (Sprint 36)

**تاریخ اجرا:** ۲۹ سپتامبر ۲۰۲۶  
**دامنه مأموریت:** `src/app/user/dashboard/page.tsx` و کامپوننت‌های ماژولار `src/components/dashboard/`  
**وضعیت:** تکمیل ۱۰۰٪، پایدار و آماده تحویل نهایی  

---

## ۱. خلاصه اجرایی و اهداف مأموریت
در این اسپرینت، با رویکرد بنیادین **«LESS UI → BETTER EXPERIENCE»** و بر پایه معماری ۵ بخشی مصوب اسپرینت ۳۵، شخصی‌سازی و تطبیق هوشمند لایه کاربری داشبورد سلامت بدون ایجاد کارت‌های تکراری، بدون افزودن موتور هوش مصنوعی یا تغییرات بک‌اند پیاده‌سازی شد:
1. **Personal Dashboard State Experience**: تعریف و پیاده‌سازی ۴ وضعیت کاربری تفکیک‌شده و پویا.
2. **Dynamic Information Priority Layer**: لایه «آنچه هم‌اکنون بیشترین اهمیت را دارد» (What Matters Most Now) با تعیین دقیق اولویت لحظه‌ای و CTA یگانه.
3. **Dashboard Personal Space**: ارتقای ماژول `MyHealthWorkspaceSection` به پرونده فعال سلامت و کارت دیجیتال.
4. **Empty State Excellence V2**: تحقق استاندارد سه‌گانه وضعیت خالی بدون بن‌بست شناختی.
5. **Final Quality & Responsive Audit**: گذراندن کامل استانداردهای تایپ‌اسکریپت و بیلد پروداکشن Next.js.

---

## ۲. پیاده‌سازی ۴ وضعیت کاربری (Member Journey States)

بر اساس متغیرهای فرانت‌اند (`activePlan`، `visitsCount`، `reviewedVisitCount`) وضعیت کاربر به یکی از ۴ حالت زیر نگاشت و رابط کاربری منطبق با آن تغییر شکل می‌دهد:

| وضعیت کاربری | شرایط تشخیص (UI-Only Logic) | رنگ‌بندی و هویت بصری | اقدام اصلی متمرکز (Single Primary CTA) |
| :--- | :--- | :--- | :--- |
| **۱. New Member** | فاقد طرح فعال (`activePlan == null`) | گرادیانت Teal تیره با برجستگی اکشن | «انتخاب و فعال‌سازی عضویت سلامت» (`/user/plans`) |
| **۲. Active Member** | دارای طرح فعال، بدون ویزیت قبلی (`visits == 0`) | گرادیانت Emerald سبز سلامت | «جستجو و انتخاب پزشک شبکه» (`/doctors`) |
| **۳. Member With Open Path** | دارای ویزیت اخیر فاقد ارزیابی (`reviewed == 0`) | گرادیانت Indigo نظارتی با هشدار ملایم | «ثبت ارزیابی کیفیت و تطبیق تعرفه» (`/user/reviews`) |
| **۴. Long-Term Member** | دارای ویزیت‌ها و ارزیابی‌های ثبت‌شده | گرادیانت Teal-Emerald پایداری | «برنامه‌ریزی چکاپ دوره‌ای شبکه» (`/doctors`) |

---

## ۳. لایه اولویت اطلاعات پویا (What Matters Most Now)
در بخش فوقانی داشبورد (`StatusPrimaryActionSection.tsx`)، بجای نمایش ده‌ها آمار نامرتبط، یک کادر متمرکز و شفاف اولویت لحظه‌ای کاربر را تعیین می‌کند:
- **نشانگر اولویت لحظه‌ای**: عنوان شفاف و تگ رنگی تفکیک‌شده (فعال‌سازی، انتخاب پزشک، ثبت بازخورد، پیشگیری).
- **پاسخ به ۳ سوال بنیادین پیوستگی**:
  1. *کجا بودم؟ (Where I Was)*: آخرین اقدام ثبت‌شده و تثبیت‌شده در پرونده.
  2. *چه چیزی باقی مانده؟ (What Remains)*: تعهد اصلی نیازمند عاملیت کاربر.
  3. *الان چه کنم؟ (Next Action)*: گام ملموس بعدی برای استمرار مراقبت بدون سردرگمی.

---

## ۴. استانداردهای وضعیت‌های خالی (Empty State Excellence V2)
در ماژول فضای کار سلامت شخصی (`MyHealthWorkspaceSection.tsx`)، هر وضعیت خالی بر اساس ساختار استاندارد زیر پیاده‌سازی شده و از هرگونه بن‌بست بصری جلوگیری شده است:
1. **Current Situation (وضعیت فعلی)**: «هنوز ویزیت درمانی ثبت نشده است.»
2. **Why It Matters (چرا اهمیت دارد؟)**: «با اولین مراجعه به پزشک شبکه، صورتحساب درمانی شما با تعرفه تخفیفی مصوب ثبت و کنترل می‌شود.»
3. **Next Possible Action (اقدام بعدی ممکن)**: لینک مستقیم هدایت به فهرست پزشکان و رزرو نوبت (`/doctors`).

---

## ۵. دروازه‌های کیفیت (Quality Gates & Verification)

- **TypeScript Typecheck**:
  ```bash
  npx tsc --noEmit -> Exit code: 0 (0 Errors, 0 Warnings)
  ```
- **Next.js Production Build**:
  ```bash
  npm run build -> Compiled successfully in 24.3s (120/120 routes static/dynamic PASS)
  ```
- **Responsive & Layout Integrity**:
  - ۳۷۵ پیکسل (موبایل کوچک): بدون سرریز افقی (Horizontal Overflow: False)
  - ۳۹۰ پیکسل (موبایل استاندارد): چیدمان تک‌ستونه کامپکت، خوانایی کامل تگ‌ها
  - ۷۶۸ پیکسل (تبلت): گرید دو ستونه بهینه
  - ۱۴۴۰ پیکسل و ۱۹۲۰ پیکسل (دسکتاپ): حداکثر پهنای استاندارد، تعادل فضاهای سفید

- **خطوط قرمز معماری (Strict Invariants)**:
  - Backend Changes: ۰
  - Database Schema Changes: ۰
  - Auth Architecture Changes: ۰
  - Clinical/Medical Logic Changes: ۰
  - External Recommendation AI: ۰ (سازگاری ۱۰۰٪ کلاینت‌ساید بر پایه هویت و داده‌های موجود کاربر).
