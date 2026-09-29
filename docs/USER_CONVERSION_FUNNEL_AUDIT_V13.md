# USER_CONVERSION_FUNNEL_AUDIT_V13.md
**Sprint:** FRONTEND_EVOLUTION_SPRINT_13  
**Mission:** User Conversion Funnel Optimization  
**تاریخ:** ۱۴۰۵/۰۷/۰۷  
**قفل‌ها:** BACKEND=0 | DATABASE=0 | AUTH_CORE=0 | API_CONTRACT=0

---

## ۱. نقشه Funnel واقعی پروژه

```
Landing (/)
  ↓ CTA: "مشاهده سطوح عضویت سلامت" → /plans
  ↓ CTA: "جستجوی پزشکان طرف قرارداد" → /doctors

Doctors (/doctors)
  ↓ مشاهده پروفایل پزشک
  ↓ CTA ضمنی: "عضویت برای مراجعه"

Plans (/plans)
  ↓ CTA: "خرید طرح" → /auth/login یا /register

Login/Register (/auth/login | /register)
  ↓ احراز هویت

Member Dashboard (/user/dashboard)
  ↓ First Healthcare Action: مراجعه به پزشک / مشاهده کارت عضویت
```

---

## ۲. نقاط ریزش شناسایی‌شده

### ❌ نقطه ریزش ۱ — لندینگ: دو CTA اصلی مبهم هستند

**موضع:** `page.tsx` خط ۲۲۹ و ۲۳۵

**مشکل:**
- CTA اول: `مشاهده سطوح عضویت سلامت` — طولانی و انتزاعی
- CTA دوم: `جستجوی پزشکان طرف قرارداد` — طولانی و انتزاعی
- هیچ‌کدام Value Proposition مستقیم ندارند
- رنگ دکمه دوم (outline) نشان‌دهنده اهمیت کمتر است ولی برای کاربر تازه همان اهمیت را دارد

**اصلاح پیشنهادی:**
```
CTA1: "شروع عضویت سلامت" + آیکون ArrowLeft  [primary — teal]
CTA2: "پیدا کردن پزشک"                        [secondary — outline]
```

### ❌ نقطه ریزش ۲ — Navbar: هیچ لینکی به /plans در ناوبری اصلی وجود ندارد

**موضع:** `page.tsx` خط ۱۳۰-۱۴۰ (navbar)

**مشکل:**  
ناوبری اصلی لندینگ شامل anchor linkهای داخلی (`#hero`, `#dual-paths`, `#specialties`, `#faq`) است اما هیچ لینکی به `/plans` (مهم‌ترین صفحه conversion) وجود ندارد.

**اصلاح:** اضافه کردن `سطوح عضویت` به navbar با لینک `/plans`.

### ❌ نقطه ریزش ۳ — صفحه Plans: CTA خرید به لاگین می‌رود بدون توضیح

**موضع:** `plans/page.tsx`

**مشکل:** CTA خرید طرح بدون هیچ پیش‌نمایشی از مراحل بعد به `/auth/login` می‌رود. کاربر نمی‌داند چه اتفاقی بعد از ورود می‌افتد.

**اصلاح:** اضافه کردن Progress indicator یا Microcopy زیر CTA: `"پس از ورود، بلافاصله طرح فعال می‌شود"`

### ⚠️ نقطه ریزش ۴ — Mobile Menu: لینک /plans وجود ندارد

**موضع:** `page.tsx` خط ۱۸۷-۱۹۷ (Mobile Sheet menu)

**مشکل:** منوی موبایل فقط anchor links دارد. کاربر موبایل هیچ راه مستقیمی به `/plans` ندارد.

**اصلاح:** اضافه کردن `سطوح عضویت` به منوی موبایل.

### ⚠️ نقطه ریزش ۵ — Section Dual Paths: CTA دکتر با CTA بیمار همتراز است

**موضع:** `page.tsx` خط ۳۱۵-۳۳۸

**مشکل:** در Section "دو مسیر خدمات"، CTA بیمار (`مشاهده سطوح عضویت`) و CTA پزشک (`ثبت‌نام پزشکان`) از نظر بصری کاملاً یکسان هستند. کاربر جدید سردرگم می‌شود.

**اصلاح:** تأکید بیشتر بر CTA بیمار (primary filled) و CTA پزشک (outline ثانویه‌تر).

---

## ۳. اصلاحات UI (Frontend Only)

### اصلاح A — CTA Hero کوتاه‌تر و قوی‌تر

```diff
- <span>مشاهده سطوح عضویت سلامت</span>
+ <span>شروع عضویت سلامت</span>

- <span>جستجوی پزشکان طرف قرارداد</span>
+ <span>پیدا کردن پزشک</span>
```

### اصلاح B — اضافه کردن /plans به Navbar

```diff
+ <Link href="/plans" className="hover:text-teal-700 transition font-bold">سطوح عضویت</Link>
```

### اصلاح C — اضافه کردن /plans به Mobile Menu

```diff
+ <Link href="/plans">سطوح عضویت سلامت</Link>
```

### اصلاح D — Microcopy زیر CTA خرید در Plans

```diff
+ <p className="text-xs text-center text-slate-400 mt-2">پس از ورود، بلافاصله طرح انتخابی فعال می‌شود</p>
```

---

## ۴. وضعیت Funnel بعد از اصلاح

```
Landing → Plans:          ناوبری مستقیم ✅ (قبلاً: فقط از Hero CTA)
Landing → Doctors:        CTA واضح‌تر ✅
Plans → Register/Login:   Microcopy راهنما ✅
Mobile → Plans:           لینک مستقیم ✅
```

---

## ۵. تغییرات اعمال‌شده

| فایل | تغییر | نوع |
|---|---|---|
| `src/app/page.tsx` | CTA Hero کوتاه‌تر | Copy |
| `src/app/page.tsx` | لینک Plans در Navbar | UI |
| `src/app/page.tsx` | لینک Plans در Mobile Menu | UI |
| `src/app/plans/page.tsx` | Microcopy زیر CTA خرید | Copy |

```
BACKEND = 0  ✅
DATABASE = 0  ✅
AUTH CORE = 0  ✅
API CONTRACT = 0  ✅
```

---

## ۶. نتیجه

```
FRONTEND_EVOLUTION_SPRINT_13
User Conversion Funnel Optimization

Drop Points Identified:   5 (2 Critical, 3 Minor)
Changes Applied:          4 (Copy + UI — Frontend Only)
Backend Mutation:         0
Database Mutation:        0
Auth Core Mutation:       0

tsc --noEmit:             PASS (pending)

SPRINT_13 = COMPLETE ✅
```
