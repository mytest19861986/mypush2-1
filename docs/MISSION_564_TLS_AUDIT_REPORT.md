# Mission 564: Raw IP HTTPS Feasibility & TLS Infrastructure Audit Report

**تاریخ مأموریت**: ۱۴۰۵/۰۷/۰۳ (2026-09-25)  
**مأموریت**: Mission 564 — Raw IP HTTPS Feasibility & TLS Audit  
**وضعیت مجوز**: AUTHORIZED ✅  
**نوع مأموریت**: صرفاً ممیزی و امکان‌سنجی فنی (Zero Mutation / Audit Only)  

---

## ۱. نتایج ممیزی نرم‌افزاری و نسخه‌ها (Environment & Version Audit)

- **Certbot Version**: `certbot 2.9.0` (نصب از طریق مخازن اوبونتو به همراه پکیج‌های `python3-certbot` و `python3-certbot-nginx`)
- **OpenSSL Version**: `OpenSSL 3.0.13` (30 Jan 2024)
- **Nginx Version**: `nginx/1.24.0` (Ubuntu)

---

## ۲. امکان‌سنجی صدور گواهینامه معتبر عمومی برای IP خام (Public IP Certificate Feasibility)

### تحلیل مرجع‌های گواهی عمومی (Public Certificate Authorities):
1. **Let's Encrypt**:
   - سرویس Let's Encrypt بر اساس پروتکل ACME در حال حاضر **به هیچ وجه گواهینامه برای IP Addresses (IPv4/IPv6) صادر نمی‌کند** و صرفاً از Fully Qualified Domain Names (FQDN) پشتیبانی می‌نماید. بنابراین صدور مستقیم با `certbot --nginx` برای `92.118.190.101` امکان‌پذیر **نیست**.
2. **ZeroSSL / Google Trust Services (GTS)**:
   - مراجع ZeroSSL و GTS از صدور گواهینامه TLS برای آدرس‌های IP عمومی (مانند `92.118.190.101`) از طریق پروتکل ACME پشتیبانی می‌کنند.
   - الزامات راه‌اندازی: نیازمند ابزار `acme.sh` و ایجاد حساب با EAB (External Account Binding) و احراز مالکیت از طریق `http-01` روی پورت 80.
   - مدت اعتبار: گواهینامه‌های ۹۰ روزه رایگان با قابلیت تمدید خودکار (Auto-renewal).
3. **CA تجاری (Commercial SSL)**:
   - مراجع تجاری نظیر Sectigo، DigiCert و GoDaddy گواهینامه‌های تجاری ۱ ساله برای Public IP صادر می‌کنند که مستلزم خرید لایسنس تجاری و احراز مالکیت IP است.

---

## ۳. تحلیل وضعیت پورت 443 و معماری SNI (Port 443 & SNI Routing Analysis)

### وضعیت فعلی سرور:
- در فایل `/etc/nginx/sites-available/codesho.ir` بلوک زیر تعریف شده است:
  ```nginx
  server {
      listen 443 ssl;
      listen [::]:443 ssl;
      server_name codesho.ir www.codesho.ir;
      ssl_certificate /etc/letsencrypt/live/codesho.ir/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/codesho.ir/privkey.pem;
      ...
  }
  ```
- **وضعیت فعلی پیش‌فرض**: چون هیچ بلوک `default_server` دیگری برای پورت 443 وجود ندارد، در صورت اتصال مستقیم کلاینت به `https://92.118.190.101/` (بدون SNI یا با IP)، انجین‌ایکس بر اساس رفتار پیش‌فرض خود درخواست را به اولین بلوک پورت 443 (یعنی `codesho.ir`) می‌فرستد که موجب افشای گواهینامه کُدشو می‌گردد.

### تحلیل ریسک تداخل SNI و اثر بر کُدشو (SNI Conflict Risk):
- **ریسک تداخل SNI**: **LOW (بسیار پایین)** — در صورت تعریف یک بلوک مستقل `default_server` روی پورت 443 برای `server_name _;`:
  * کلاینت‌هایی که با هدر SNI برابر `codesho.ir` مراجعه کنند، مستقیماً به بلوک کُدشو می‌روند و هیچ تداخلی پیش نمی‌آید.
  * کلاینت‌هایی که با IP خام یا هر نام ناشناخته مراجعه کنند، به بلوک `default_server` پورت 443 حامی‌کارت هدایت می‌شوند.
- **اثر بر کُدشو (Codesho Impact)**: **NONE (صفر اثر منفی)** — ایزولاسیون کامل دامنه‌های کُدشو حفظ می‌گردد.
- **اثر بر حامی‌کارت (Hami Impact)**: دسترسی ایمن HTTPS روی IP عمومی به پورت ۳۰۰۱ برقرار می‌شود.

---

## ۴. تغییرات مورد نیاز Nginx در صورت صدور مجوز (Required Nginx Configuration)

بلوک مورد نیاز برای تعریف `default_server` روی پورت 443 در فایل `demo.hami-card.com.conf`:
```nginx
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;

    server_name _;

    ssl_certificate /path/to/ip_certificate/fullchain.pem;
    ssl_certificate_key /path/to/ip_certificate/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## ۵. طرح بازگشت سریع (Rollback Plan)

- نسخه پشتیبان در `/opt/backups/nginx-pre-m563/` موجود است.
- در صورت بروز هرگونه ناسازگاری، بازگردانی در کمتر از ۱۰ ثانیه با دستورات زیر امکان‌پذیر است:
  ```bash
  sudo cp -a /opt/backups/nginx-pre-m563/sites-available/* /etc/nginx/sites-available/
  sudo cp -a /opt/backups/nginx-pre-m563/sites-enabled/* /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
  ```

---

## ۶. رعایت کامل قفل‌های سخت‌افزاری (Hard Locks Compliance)

- **تغییرات در Nginx**: **۰ (Zero Mutation)**
- **نصب یا تغییر Certificate**: **۰**
- **تغییر پورت 443**: **۰**
- **تغییر پورت 3000**: **۰ 🔒**
- **تغییر پورت 3001**: **۰ 🔒**
- **تغییر دیتابیس پروداکشن**: **۰ 🔒**
- **تغییر کدهای پروژه**: **۰**
