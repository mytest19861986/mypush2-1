# Hami Card V2 - Release Checklist / چک لیست انتشار

## Pre-Deploy Checks / قبل از استقرار

- [ ] `git status` clean است و تغییر ناخواسته وجود ندارد.
- [ ] `npx.cmd tsc --noEmit` بدون خطا اجرا شده است.
- [ ] `npm.cmd run build` بدون خطا اجرا شده است.
- [ ] Manual QA پاس شده است.
- [ ] `.env` واقعی در Git قرار نگرفته است.
- [ ] `.env.production.example` فقط Placeholder امن دارد.
- [ ] `JWT_SECRET` و `TOKEN_PEPPER` در سرور حداقل 32 کاراکتر و متفاوت هستند.
- [ ] نسخه Node سرور `22.x` است.
- [ ] مسیر SQLite و Upload ها قابل خواندن/نوشتن توسط Process هستند.

## Deployment Checks / هنگام استقرار

- [ ] Repository روی سرور Clone یا Pull شده است.
- [ ] `.env.production.example` به `.env` کپی شده و مقدارهای واقعی فقط روی سرور وارد شده اند.
- [ ] `npm install` اجرا شده است.
- [ ] `npx prisma generate` اجرا شده است.
- [ ] `npm run build` اجرا شده است.
- [ ] PM2 با نام `hami-card-v2` اجرا شده است.
- [ ] `pm2 save` اجرا شده است.
- [ ] Nginx reverse proxy به `127.0.0.1:3000` تنظیم شده است.
- [ ] `sudo nginx -t` موفق است.
- [ ] HTTPS و دامنه Production بررسی شده اند.

## Post-Deploy Smoke Test / تست سریع بعد از استقرار

- [ ] `/auth/login`
- [ ] `/doctors`
- [ ] `/user/dashboard`
- [ ] `/doctor/profile`
- [ ] `/agent/dashboard`
- [ ] `/admin/dashboard`
- [ ] Upload/download ها کار می کنند.
- [ ] Logout کار می کند و Session پاک می شود.
- [ ] Refresh صفحه های اصلی خطای 500/404 نمی دهد.
- [ ] مرورگر بعد از پاک کردن Cache نسخه جدید را نمایش می دهد.
