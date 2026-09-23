# HAMI CARD CLIENT DEMO SNAPSHOT ARCHIVE
**مأموریت**: HCP-MSN-PH2-DEMO-FREEZE-BACKUP-538  
**تاریخ**: ۱۴۰۵/۰۷/۰۱ (2026-09-24)  
**تگ رسمی گیت**: `v2.4-client-demo-ready`  
**کامیت اسنپ‌شات**: `5df7f08`  
**برنچ توسعه**: `premium-ui-development`  
**برنچ دمو اصلی (فریز شده)**: `demo-phase-1` (`c0ac8f6`)  

---

## ۱. هویت و وضعیت قفل نسخه (Sealed Baseline Identity)
- **Git Commit Hash**: `5df7f0808b...`
- **Git Tag**: `v2.4-client-demo-ready`
- **وضعیت سرور محلی**: در حال اجرا بر روی پورت ۳۰۰۰ (Node.js v24.18.0)
- **وضعیت دیتابیس لوکال**: کاملاً سالم و دست‌نخورده (بدون مایگریشن)
- **پایداری فرانت‌اند**: ۱۰۰٪ تست‌های رندرینگ با پاسخ HTTP 200 OK

---

## ۲. فهرست صفحات ۷ گانه مهر و موم‌شده
1. **داشبورد اصلی پرمیوم**: `/dashboard-premium-preview`
2. **مدیریت کاربران و بیمه‌شدگان**: `/users-premium-preview`
3. **مراکز درمانی و پزشکان همکار**: `/doctors-clinics-premium-preview`
4. **شبکه رشد و نمایندگان فروش**: `/agents-premium-preview`
5. **داشبورد جامع هوش مدیریتی و گزارشات (BI)**: `/reports-bi-premium-preview`
6. **پروفایل و هویت مدیر ارشد**: `/admin-profile-premium-preview`
7. **تنظیمات جامع و پایش زیرساخت**: `/settings-premium-preview`

---

## ۳. آرشیو مستندات تحویل در پوشه `/docs`
- `01_PROJECT_CONTEXT.md`: پیشینه و منطق تجاری محصول
- `02_ARCHITECTURE.md`: ساختار معماری و جداسازی برنچ‌ها
- `07_DESIGN_SYSTEM.md`: راهنمای استانداردهای توکن، رنگ و کامپوننت‌های اشتراکی
- `10_DECISION_LOG.md`: ثبت تصمیمات فنی معماری (ADR-001 تا ADR-005)
- `11_CHANGELOG.md`: لاگ زمانی مأموریت‌ها و ویژگی‌های اضافه شده
- `RESPONSIVE_AUDIT_REPORT.md`: نتایج قبولی ۱۰۰٪ آزمون ۴۲ گانه CDP در ۶ سایز مختلف
- `CLIENT_DEMO_RUNBOOK.md`: سناریوی گام‌به‌گام ارائه، پرسش و پاسخ کارفرما و نکات فروش
- `FUTURE_ROADMAP.md`: نقشه راه فاز ۳ و ۴ جهت توسعه بعدی

---

## ۴. دستورالعمل خروج از فریز برای شروع فاز ۳ (Post-Demo Unfreeze Procedure)
پس از پایان جلسه و ثبت بازخوردهای کارفرما در سند `docs/CLIENT_FEEDBACK_V1.md`:
1. ایجاد برنچ جدید مستقل برای فاز ۳:
   `git checkout -b phase-3-real-data-binding v2.4-client-demo-ready`
2. برنچ `premium-ui-development` و تگ `v2.4-client-demo-ready` بدون تغییر باقی مانده و به عنوان نقطه بازگشت امن (Safe Rollback) محفوظ می‌مانند.
