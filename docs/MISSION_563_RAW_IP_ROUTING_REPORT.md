# Mission 563: Raw IP Exclusive Routing to Hami Card & Infrastructure Audit Report

**تاریخ ارزیابی و اجرا**: ۱۴۰۵/۰۷/۰۳ (2026-09-25)  
**مأموریت**: Mission 563 — Raw IP Exclusive Routing to Hami Card  
**وضعیت مجوز**: AUTHORIZED ✅  

---

## ۱. اقدامات پیش‌نیاز و پشتیبان‌گیری کامل (Pre-flight Backup)

پشتیبان کامل از کلیه تنظیمات Nginx قبل از هرگونه تغییر یا تحلیل ایجاد شد:
```bash
sudo mkdir -p /opt/backups/nginx-pre-m563
sudo cp -a /etc/nginx/sites-available /opt/backups/nginx-pre-m563/
sudo cp -a /etc/nginx/sites-enabled /opt/backups/nginx-pre-m563/
```
- مسیر پشتیبان: `/opt/backups/nginx-pre-m563/` (شامل `sites-available` و `sites-enabled`)

---

## ۲. ممیزی وضعیت Listenها، Virtual Hostها و Routing فعلی

خروجی دقیق تحلیل پیکربندی فعال Nginx (`sudo nginx -T`):
1. **پورت 80 (HTTP)**:
   - `server_name codesho.ir www.codesho.ir;` $\to$ ریدایرکت دائمی ۳۰۱ به `https://codesho.ir$request_uri`.
   - `server_name demo.hami-card.com;` $\to$ فوروارد به `http://127.0.0.1:3000` (Baseline Bringup).
   - `server_name _;` با فلگ **`default_server`** در فایل `demo.hami-card.com.conf` $\to$ فوروارد به `http://127.0.0.1:3001` (Hami Card Client Demo).
   - **نتیجه HTTP**: ترافیک Raw IP پورت 80 به صورت انحصاری و با معماری امن به Hami Card روی پورت ۳۰۰۱ می‌رسد.

2. **پورت 443 (HTTPS) و بررسی گواهینامه‌های SSL**:
   - تنها گواهینامه موجود در کل سرور:
     * مسیر: `/etc/letsencrypt/live/codesho.ir/`
     * دامنه‌ها: `DNS:codesho.ir, DNS:www.codesho.ir`
     * صادرکننده: `Let's Encrypt Authority (YE2)`
   - هیچ گواهینامه SSL برای آدرس IP خام (`92.118.190.101`) در سرور وجود ندارد.
   - وضعیت SSL Raw IP: **`HTTPS_RAW_IP_CERTIFICATE = BLOCKED`**
   - طبق دستور اکید فرمانده: هیچ گواهینامه جعلی (Self-signed) یا گواهینامه دامنه دیگر (`codesho.ir`) برای IP استفاده نشد تا تداخل SNI یا خطای نامعتبر بودن زنجیره اعتماد پیش نیاید.

---

## ۳. ماتریس آزمون‌های پذیرش (Acceptance Test Matrix)

| ردیف | سناریوی آزمون | دستور تست | نتیجه مورد انتظار | نتیجه واقعی | وضعیت |
|---|---|---|---|---|---|
| ۱ | **Raw IP HTTP Routing** | `curl -sI http://92.118.190.101/` | هدایت به Hami Card (:3001) | HTTP 200 OK (Hami Card Landing) | **PASS ✅** |
| ۲ | **Hami Plans Page** | `curl -sI http://92.118.190.101/admin/plans` | هدایت به Hami Card (:3001) | HTTP 200 OK (Plans & Filters) | **PASS ✅** |
| ۳ | **Hami Direct Register** | `curl -sI http://92.118.190.101/register/user` | هدایت به Hami Card (:3001) | HTTP 200 OK (Register Page) | **PASS ✅** |
| ۴ | **Hami Admin Login** | `curl -sI http://92.118.190.101/auth/login` | هدایت به Hami Card (:3001) | HTTP 200 OK (Login Page) | **PASS ✅** |
| ۵ | **Codesho Host Isolation** | `curl -sI -H "Host: codesho.ir" http://127.0.0.1/` | ریدایرکت به دامنه خود کُدشو | HTTP 301 $\to$ `https://codesho.ir/` | **PASS ✅** |
| ۶ | **Codesho HTTPS Host** | `curl -sI -H "Host: codesho.ir" https://127.0.0.1/ -k` | سرویس‌دهی از کانتینر کُدشو (:18080) | HTTP 200 OK (Codesho App) | **PASS ✅** |
| ۷ | **Raw IP $\to$ Codesho Isolation** | درخواست با IP خام روی پورت 80 | **عدم مشاهده کُدشو با Raw IP** | کاملاً ایزوله؛ به Hami Card می‌رسد | **PASS ✅** |
| ۸ | **Nginx Config Integrity** | `sudo nginx -t` | Syntax OK | syntax is ok & test is successful | **PASS ✅** |

---

## ۴. وضعیت قفل‌های سخت‌افزاری و زیرساخت (Hard Locks Compliance)

- **Hami Card (:3001)**: فعال و بدون قطعی (`Up 9 hours / v2.6.0-client-premium-demo-approved`) ✅
- **Baseline Bringup (:3000)**: کاملاً دست‌نخورده و فریز 🔒 (`NO CHANGE`)
- **دیتابیس اصلی پروداکشن**: کاملاً دست‌نخورده 🔒 (`0 Mutation`)
- **مایگریشن دیتابیس**: ۰ (`0 DB Migration`)
- **کد اپلیکیشن و تگ گیت**: کاملاً منجمد روی `cb291b2` و `v2.6.0-client-premium-demo-approved` 🔒
- **کانتینرهای کُدشو (`codesho_staging-*`)**: کاملاً دست‌نخورده و در حال کار روی دامنه اختصاصی 🔒
- **سایر مسیرهای مجازی (Virtual Hosts)**: کاملاً حفظ شدند ✅
- **Nginx Reload**: پیکربندی صحیح، آماده و تست‌شده بدون نیاز به restart سرویس.

---

## ۵. گزارش وضعیت گواهینامه امنیتی IP خام (HTTPS Status)

```
HTTPS_RAW_IP_CERTIFICATE = BLOCKED
دلیل: گواهینامه معتبر مخصوص IP برای 92.118.190.101 روی سرور وجود ندارد.
طبق دستور صریح فرمانده، هیچ گواهینامه ناسازگار یا جعلی نصب نشد تا در مأموریت‌های بعدی تصمیم‌گیری گردد.
```
