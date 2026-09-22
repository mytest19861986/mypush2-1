# Design System Guidelines — Hami Card Premium

## ۱. فلسفه دیزاین سیستم
طراحی پایدار، مدرن و باوقار در حوزه خدمات سلامت و پزشکی بر پایه:
- ادراک حس اعتماد، امنیت و آرامش
- سیستم رنگی پیشرفته OKLCH با کنتراست استاندارد WCAG AAA
- تایپوگرافی روان و فارسی استاندارد (Vazirmatn / IRANSans)
- ساختار ماژولار کامپوننت‌ها (Atomic / shadcn style)

## ۲. پالت رنگ پایه (OKLCH)
- **Primary**: `oklch(0.51 0.17 163)` (سبز درمانی/پزشکی غنی)
- **Secondary**: `oklch(0.96 0.01 160)`
- **Background**: `oklch(0.99 0.002 155)` (Light) / `oklch(0.13 0.015 160)` (Dark)
- **Card**: `oklch(1 0 0)` (Light) / `oklch(0.18 0.015 160)` (Dark)
- **Muted**: `oklch(0.96 0.01 160)`

## ۳. استاندارد کامپوننت‌های اتمیک
- **Buttons**: کلیدهای با کنتراست بالا، شعاع گوشه هماهنگ (`rounded-xl` / `rounded-lg`)، ترنزیشن‌های نرم و حالات Disabled/Loading مشخص به همراه واریانت‌های `premium` و `glass`.
- **Cards**: سایه‌های ملایم لایه‌ای (Layered Soft elevation)، بوردرهای مرزی با غلظت شفاف (`border-border/50`)، واریانت‌های `premium`, `glass`, `subtle`.
- **Badges**: وضعیت‌های فعال، معلق، منقضی با فونت‌های سایز کوچک و نشانگرهای معنایی (`success`, `warning`, `premium`, `destructive`).
- **Inputs & Forms**: فیلدهای ورودی با بوردرهای متوازن، آیکون‌های درون‌فیلدی و فوکوس با رینگ نرم.

## ۴. استانداردهای صفحات ماژولار و جداول (Data-Dense Tables Pattern)
- **Avatar System**: نمادهای کاربری گرادیانی مبتنی بر هویت و نام با نسبت ۱:۱ و گوشه‌های گرد نرم (`rounded-xl`).
- **Status Mapping**: نگاشت مستقیم وضعیت‌های دیتابیس به پالت معنایی دیزاین سیستم (Active -> Success Badge, Pending -> Warning Badge, Suspended -> Destructive Badge).
- **Search & Filter Bars**: کارت‌های شناور با پس‌زمینه شیشه‌ای (`Card variant="glass"`)، تعبیه فیلترهای چندگانه تب‌مانند در دسترس سریع کاربر.
