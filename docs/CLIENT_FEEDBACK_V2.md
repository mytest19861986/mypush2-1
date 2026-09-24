# Client Feedback Review Board & Prioritization (Mission 555)

**Mission Status**: ACTIVE 🟢  
**Baseline Release**: `v2.4.6-client-premium-demo-approved` (FROZEN ❄️)  
**Strict Rule**: No feedback is coded directly until formally approved by the Review Board.

---

## 1. Executive Summary & Review Board Mandate
Mission 555 establishes the formal architecture to transition live client evaluation feedback into controlled, prioritized engineering waves for Phase 4.

### Review Board Governance Principles:
1. **Zero Uncontrolled Mutation**: Current stable demo (`92.118.190.101:3001`) and frozen baseline (`:3000`) remain 100% untouched.
2. **Four-Tier Classification**: Every client item is triaged into **Approved**, **Deferred**, **Rejected**, or **Needs Clarification**.
3. **Phase 4 Wave Mapping**: Approved items are partitioned into structured execution waves (Wave 1: High-Impact Stability/Fixes $\to$ Wave 2: Core Enhancements $\to$ Wave 3: Advanced Integrations).

---

## 2. Master Client Feedback Triage Table

| ID | Title / Feedback Summary | Category | Severity | Business Impact | Technical Dependency | Decision Status | Target Wave |
|:---|:---|:---:|:---:|:---:|:---|:---:|:---:|
| **FB-101** | پشتیبانی از ثبت‌نام مستقیم کاربر عادی از صفحه ورود (Self-Registration) | New Feature | Medium | بالا (افزایش جذب کاربر) | نیاز به سرویس OTP پیامکی تجاری (SMS Provider) | **Approved** | Wave 2 |
| **FB-102** | فیلتر پیشرفته طرح‌ها بر اساس درصد تخفیف و بازه قیمت | Improvement | Low | متوسط (تجربه کاربری بهتر) | مستقل (کامپوننت فیلتر کلاینت) | **Approved** | Wave 1 |
| **FB-103** | خروجی اکسل/CSV از فهرست کاربران و پزشکان طرف قرارداد در پنل ادمین | Improvement | Low | بالا (گزارش‌گیری سازمانی) | کتابخانه تولید xlsx در سمت سرور | **Approved** | Wave 1 |
| **FB-104** | تغییر درگاه پرداخت یا پرداخت آفلاین کارت‌به‌کارت برای خرید طرح‌ها | New Feature | High | حیاتی (تسهیل تراکنش) | اتصال وب‌هوک بانکی و جدول لاگ تراکنش | **Needs Clarification** | Wave 3 |
| **FB-105** | تغییر ساختار کلی طرح‌های تخفیفی از حالت اعتباری به مدل اشتراک ماهیانه | Architectural | Critical | بسیار بالا (مدل درآمدی) | نیاز به بازطراحی دیتابیس و قراردادها | **Deferred** | Phase 5 |
| **FB-106** | حذف مرحله احراز هویت با شماره موبایل و استفاده فقط از ایمیل | Architectural | High | منفی (ناسازگار با بازار ایران) | معماری هویتی پروژه | **Rejected** | — |

---

## 3. Phase 4 Execution Wave Roadmap

### 🌊 Wave 1: Immediate UX & Operational Tooling (Starts First)
- **FB-102**: فیلتر پیشرفته طرح‌ها (قیمت و درصد تخفیف)
- **FB-103**: ماژول خروجی اکسل و CSV از جداول کاربران و پزشکان برای ادمین
- *تخمین ریسک*: بسیار کم (توسعه مستقل در سطح UI و اکسپورت).

### 🌊 Wave 2: Self-Service & Onboarding Expansion
- **FB-101**: فرآیند ثبت‌نام سلف‌سرویس کاربر و اختصاص خودکار پروفایل پایه با تایید پیامک
- *تخمین ریسک*: متوسط (نیاز به اتصال درگاه پیامک پایدار).

### 🌊 Wave 3: Enterprise Payment & Settlement Gateway
- **FB-104**: شفاف‌سازی و پیاده‌سازی مکانیزم پرداخت چندگانه (درگاه اختصاصی / کارت‌به‌کارت تاییدمحور)
- *تخمین ریسک*: بالا (وابسته به تصمیم مدیر مالی و مجوزهای بانکی).

---

## 4. Formal Review Board Decisions

### چه مواردی باید ساخته شوند؟ (Approved)
1. **خروجی اکسل و گزارش‌گیری داده‌ها (FB-103)**: ایجاد زیرساخت دانلود امن گزارش‌ها.
2. **فیلترهای پیشرفته در جدول طرح‌ها (FB-102)**: ارتقای تجربه کاربری جستجو.
3. **ثبت‌نام مستقیم کاربران (FB-101)**: باز کردن مسیر آنبوردینگ سلف‌سرویس در Wave 2.

### چه مواردی نباید ساخته شوند؟ (Rejected)
1. **حذف احراز هویت پیامکی به نفع ایمیل (FB-106)**: رد شد به دلیل ریسک تقلب و عدم تطابق با نیازمندی‌های بازار سلامت کشور.

### موارد نیازمند تایید مجدد مدیر (Needs Clarification & Deferred)
1. **مدل پرداخت چندگانه (FB-104)**: نیازمند شفاف‌سازی کارفرما پیرامون قوانین مالیاتی و الزامات شاپرک.
2. **تغییر بنیادین به مدل اشتراک (FB-105)**: به فازهای بعدی پس از بهره‌برداری آزمایشی موکول شد (Deferred).

---

## 5. Release & Production Freeze Integrity Log
- **Active Release Tag**: `v2.4.6-client-premium-demo-approved`
- **Demo Container Port**: `3001` (Clean, 0 errors, HTTP 200 OK)
- **Production Baseline Port**: `3000` (Frozen & Untouched)
- **Production DB Mutation Count**: `0`
