# Hami Card V2 - Deployment Guide / راهنمای استقرار

این فایل برای آماده سازی Production Readiness است و هیچ Secret واقعی نباید در آن قرار بگیرد.

## Server Requirements / نیازمندی های سرور

- Ubuntu 22.04 یا Ubuntu 24.04
- Node.js 22 LTS
- npm
- git
- nginx
- pm2
- sqlite3
- openssl

نمونه نصب روی Ubuntu:

```bash
sudo apt update
sudo apt install -y git nginx sqlite3 openssl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node -v
npm -v
pm2 -v
```

> نکته: Next.js 16 به Node 20.9+ نیاز دارد. برای Production از Node 22 LTS استفاده کنید؛ Node 18 کافی نیست.

## Clone Repository / دریافت کد

```bash
sudo mkdir -p /var/www
sudo chown -R "$USER":"$USER" /var/www
cd /var/www
git clone <REPOSITORY_URL> hami-card-v2
cd hami-card-v2
```

برای نسخه مشخص:

```bash
git fetch --all --tags
git checkout <BRANCH_OR_TAG>
```

## Environment Setup / تنظیم فایل محیطی

```bash
cp .env.production.example .env
nano .env
```

فقط در فایل `.env` مقدارهای واقعی را وارد کنید. مقادیر زیر باید Secret قوی و متفاوت باشند و حداقل 32 کاراکتر طول داشته باشند:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

متغیرهای ضروری:

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET`
- `TOKEN_PEPPER`
- `NEXT_PUBLIC_APP_URL`

برای SQLite مطمئن شوید مسیر دیتابیس قابل نوشتن است:

```bash
mkdir -p /var/www/hami-card-v2/db
```

## Install And Build / نصب و ساخت

```bash
npm install
npx prisma generate
npm run build
```

اگر نیاز به آماده سازی دیتابیس Production دارید، فقط بعد از تایید برنامه مهاجرت/دیتابیس اجرا شود. این راهنما Prisma schema یا Migration جدید اضافه نمی کند.

## PM2 Start / اجرای سرویس

به دلیل `output: "standalone"` در Next.js، بعد از Build می توان سرور Standalone را اجرا کرد:

```bash
PORT=3000 NODE_ENV=production pm2 start .next/standalone/server.js --name hami-card-v2 --interpreter node --update-env
pm2 save
pm2 startup
```

بررسی وضعیت:

```bash
pm2 status
pm2 logs hami-card-v2
```

## Nginx Reverse Proxy / نمونه پراکسی Nginx

فایل نمونه:

```bash
sudo nano /etc/nginx/sites-available/hami-card-v2
```

نمونه کانفیگ:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

فعال سازی:

```bash
sudo ln -s /etc/nginx/sites-available/hami-card-v2 /etc/nginx/sites-enabled/hami-card-v2
sudo nginx -t
sudo systemctl reload nginx
```

برای HTTPS از Certbot یا ابزار مورد تایید تیم زیرساخت استفاده کنید.

## Common Troubleshooting / خطاهای رایج

- **Node 18 is not enough:** اگر Build یا اجرای Next.js خطای نسخه Node داد، Node 22 LTS نصب کنید و دوباره `npm install` و `npm run build` را اجرا کنید.
- **Prisma binary/network issue:** اگر `npm install` یا `npx prisma generate` به دلیل دانلود Binary یا شبکه شکست خورد، دسترسی اینترنت سرور، DNS، Proxy و Firewall را بررسی کنید و سپس `npx prisma generate` را دوباره اجرا کنید.
- **Service worker/cache issue:** اگر مرورگر نسخه قدیمی را نشان می دهد، Cache و Service Worker را پاک کنید، سپس Hard Refresh بزنید. در صورت نیاز فایل های Static جدید را از `.next` دوباره Deploy کنید.
- **Missing `.env` secrets:** اگر خطای `JWT_SECRET environment variable is required` یا `TOKEN_PEPPER environment variable is required` دیدید، فایل `.env` را بررسی کنید. هر دو مقدار باید حداقل 32 کاراکتر و Secret واقعی باشند.
- **Port 3000 not open:** اگر Nginx پاسخ نمی دهد، اول `pm2 status`، سپس `ss -ltnp | grep 3000` و بعد تنظیمات Firewall/Nginx را بررسی کنید. سرویس Next.js باید روی `127.0.0.1:3000` در دسترس باشد.
