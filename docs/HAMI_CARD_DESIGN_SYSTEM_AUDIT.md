# گزارش ممیزی جامع دیزاین سیستم (Hami Card Design System Audit)

**تاریخ ممیزی**: 2026-09-22  
**محیط بررسی**: برنچ `premium-ui-development` (منشعب از کامیت پایدار دمو `c0ac8f6`)  
**مأموریت**: HCP-MSN-PH2-PREMIUM-UI-FOUNDATION-526

---

## ۱. ارزیابی توکن‌های طراحی (Design Tokens & globals.css)

### ۱.۱. وضعیت موجود (Current State)
- **موتور استایل**: Tailwind CSS v4 به همراه پلاگین انیمیشن `tw-animate-css`.
- **فضای رنگی**: متغیرهای رنگی با استاندارد مدرن **OKLCH** تعریف شده‌اند که دقت اشباع رنگی و بازتولید یکپارچه در مانیتورهای گوناگون را تضمین می‌کند.
- **تایپوگرافی**: 
  - متغیر فونت متن: `--font-sans: "Vazirmatn", "IRANSans", system-ui, sans-serif;`
  - متغیر فونت عددی و کد: `--font-mono: var(--font-geist-mono);`
- **تم تیره و روشن (Dark / Light)**: کلاس `.dark` با پارامترهای OKLCH مجزا به طور استاندارد پیاده‌سازی شده است.

### ۱.۲. توکن‌های نیازمند بهبود و پولیش پریمیوم
- **رنگ سازمانی Primary**: در حال حاضر مقدار `oklch(0.51 0.17 163)` به عنوان سبز درمانی پایه تعیین شده است. برای لایه‌های تعاملی (Hover, Active, Focus, Subtle Surface) می‌توان پالت‌های فرعی (مانند `primary-subtle` و `primary-hover`) را در سطح کامپوننت‌ها بهینه‌تر کرد.
- **افکت‌های عمق (Elevation & Glassmorphism)**: نیاز به تعریف استاندارد افکت‌های شیشه‌ای ظریف (`backdrop-blur-md`, مرزهای `border-white/10` در تم تیره و `border-black/5` در تم روشن) برای ساخت کارت‌ها و پنل‌های پریمیوم.

---

## ۲. وضعیت کامپوننت‌های موجود (Existing Components Inventory)

مجموعاً **۴۸ کامپوننت پایه** در مسیر `src/components/ui/` شناسایی شدند.

### ۲.۱. کامپوننت‌های کاملاً قابل استفاده مجدد (Ready-to-use / Solid)
این کامپوننت‌ها پیاده‌سازی کامل بر پایه Primitives رادیکس (Radix UI) دارند و **نباید دوباره ساخته شوند**:
1. `dialog.tsx` و `alert-dialog.tsx`
2. `dropdown-menu.tsx` و `context-menu.tsx`
3. `tabs.tsx`
4. `input-otp.tsx`
5. `table.tsx`
6. `sheet.tsx`
7. `popover.tsx` و `tooltip.tsx`
8. `scroll-area.tsx`
9. `sonner.tsx` و `toast.tsx`

### ۲.۲. کامپوننت‌های نیازمند اصلاح و ارتقای پریمیوم (Design Polish Required)
کامپوننت‌های اتمیک زیر اسکلت کاملی دارند اما برای رسیدن به سطح **Premium UI Foundation** نیاز به غنی‌سازی بصری دارند:
1. **`button.tsx`**:
   - افزودن استایل دکمه‌های شیشه‌ای (`glass`) و گرادیان باوقار درمانی.
   - اصلاح حالات ریزانیمیشن (Micro-interactions) و افکت Active/Pressed.
2. **`card.tsx`**:
   - ارتقای سایه‌ها از حالت فلت و خشک به سایه‌های عمیق و شناور (Soft layered shadows).
   - افزودن بوردرهای هایلایت با شیب ملایم (Subtle gradient border).
3. **`badge.tsx`**:
   - ارتقای نشان‌های وضعیت با استایل‌های Glow و Dot indicator (مانند وضعیت فعال/معلق/منقضی در خدمات سلامت).
4. **`input.tsx`**:
   - بهینه‌سازی حالات فوکوس با رینگ‌های نرم و یکنواخت و پشتیبانی بصری زیباتر از آیکون‌های ابتدا و انتهای فیلد.

---

## ۳. اصل بنیادین عدم تغییر منطق (Strict Architectural Invariants)

در فرآیند ارتقای دیزاین به نسخه پریمیوم:
- هیچ تغییر ساختاری در منطق هویت، احراز، درخواست‌های شبکه یا ساختار دیتابیس صورت نخواهد گرفت.
- تمام تغییرات در قالب کلاس‌های Tailwind، ارتقای Variants با `cva` (class-variance-authority) و افزودن ماژول‌های تمیز اتمیک انجام می‌شود.
