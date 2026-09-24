# Mission 554-A — Client Demo Delivery & Feedback Collection Charter

**Status**: ACTIVE 🟢  
**Approved Baseline Release**: `v2.4.5-client-premium-demo-approved` (Commit `34309fc`)  
**Deployment Target**: `92.118.190.101`  
- Isolated Demo Port: `3001` (Nginx reverse-proxied)
- Production Baseline Port: `3000` (FROZEN & UNTOUCHED)

---

## 1. Official Mission Checklist (Commander Mandate)

1. **بند ۱: تحویل بسته دمو به کارفرما (Client Demo Delivery Package)**:
   - مستندسازی کامل لینک‌های دسترسی عمومی (`http://92.118.190.101/admin/plans`, `/admin/reviews`, `/admin/doctors`, `/admin/users`, `/admin/dashboard`).
   - نام کاربری و رمز عبور ایزوله دموی ادمین: `09999999999` / `Admin@123456`.
   - راهنمای کاربری برای تست سناریوهای تاییدشده (طرح‌ها، نظرات، خروج و ورود).

2. **بند ۲: فریز نگه‌داشتن Release نهایی `v2.4.5-client-premium-demo-approved`**:
   - عدم اعمال هیچ‌گونه تغییر کد روی این نسخه در حین ارزیابی کارفرما.
   - حفظ کامل ایزولاسیون داده‌ها (عدم هرگونه جهش در پایگاه داده پروداکشن: 0 mutations).
   - حفظ انجماد کانتینر اصلی روی پورت ۳۰۰۰.

3. **بند ۳: محدود کردن تست کارفرما به ۵ بخش مصوب (Scoped 5 Demo Sections)**:
   - داشبورد مدیریت (`/admin/dashboard`)
   - مدیریت کاربران (`/admin/users`)
   - پزشکان و مراکز طرف قرارداد (`/admin/doctors`)
   - مدیریت طرح‌ها با ماندگاری کامل پس از رفرش (`/admin/plans`)
   - مدیریت نظرات با تایید و رد ایزوله (`/admin/reviews`)
   - احراز هویت و خروج امن (`/auth/login`)

4. **بند ۴: چارچوب جمع‌آوری بازخوردها (Feedback Collection Framework)**:
   - ساختار ثبت نظرات کارفرما جهت انتقال به فاز توسعه ۳ بدون تداخل با پایداری سیستم.
