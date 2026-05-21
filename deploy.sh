#!/bin/bash
# ╔═══════════════════════════════════════════════════════╗
# ║  deploy.sh — نصب اولیه سامانه تخفیف درمانی         ║
# ║  پیشگام سلامت                                       ║
# ║  سرور: 107.173.47.76 — پورت: 80                    ║
# ║  فقط یک بار روی سرور خام اجرا شود                  ║
# ╚═══════════════════════════════════════════════════════╝

set -e

# ─── رنگ‌ها ───
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── متغیرهای پروژه ───
APP_DIR="/var/www/pishegam"
APP_NAME="pishegam"
APP_PORT=3000
NGINX_PORT=80
SERVER_IP="107.173.47.76"
REPO_URL="${1:-https://github.com/mytest19861986/mypush2.git}"
BRANCH="${2:-main}"

clear
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🏥 سامانه تخفیف درمانی — پیشگام سلامت         ║${NC}"
echo -e "${CYAN}║     🚀 اسکریپت نصب و راه‌اندازی اولیه               ║${NC}"
echo -e "${CYAN}║     📡 سرور: $SERVER_IP                            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۰: توقف و پاک‌سازی کامل سرور
# ═══════════════════════════════════════
echo -e "${YELLOW}🧹 مرحله ۰: پاک‌سازی کامل سرور...${NC}"
echo "تمام پروژه‌ها و سرویس‌های قبلی حذف می‌شوند..."

# توقف همه PM2
if command -v pm2 &> /dev/null; then
  echo "  ├── توقف PM2..."
  pm2 kill 2>/dev/null || true
  pm2 delete all 2>/dev/null || true
fi

# حذف Nginx تنظیمات قبلی
echo "  ├── حذف تنظیمات Nginx قبلی..."
sudo rm -f /etc/nginx/sites-enabled/* 2>/dev/null || true
sudo rm -f /etc/nginx/sites-available/* 2>/dev/null || true

# حذف پروژه‌های قبلی
echo "  ├── حذف پروژه‌های قبلی..."
sudo rm -rf /var/www/* 2>/dev/null || true

# حذف تنظیمات قبلی فایروال
echo "  ├── ریست فایروال..."
sudo ufw --force reset 2>/dev/null || true

# پاک‌سازی کش
echo "  ├── پاک‌سازی کش سیستم..."
sync && sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches' 2>/dev/null || true

echo -e "${GREEN}  ✅ پاک‌سازی کامل انجام شد${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۱: Swap
# ═══════════════════════════════════════
echo -e "${YELLOW}📦 مرحله ۱: ساخت Swap (اگر وجود ندارد)...${NC}"
if [ ! -f /swapfile ]; then
  echo "  ├── ساخت Swap 2 گیگابایت..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
  fi
  # بهینه‌سازی swappiness
  sudo sysctl vm.swappiness=10
  if ! grep -q 'vm.swappiness' /etc/sysctl.conf; then
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf > /dev/null
  fi
  echo -e "${GREEN}  ✅ Swap 2GB ساخته شد (swappiness=10)${NC}"
else
  echo -e "${GREEN}  ✅ Swap از قبل وجود دارد${NC}"
fi
echo ""

# ═══════════════════════════════════════
# مرحله ۲: نصب پیش‌نیازها
# ═══════════════════════════════════════
echo -e "${YELLOW}📦 مرحله ۲: نصب پیش‌نیازها...${NC}"

# آپدیت سیستم
echo "  ├── آپدیت سیستم..."
sudo apt update -qq && sudo apt upgrade -y -qq

# Node.js 20
if command -v node &> /dev/null; then
  echo -e "  ✅ Node.js $(node -v) نصب شده"
else
  echo "  ├── نصب Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null
  sudo apt install -y nodejs > /dev/null 2>&1
  echo -e "${GREEN}  ✅ Node.js $(node -v) نصب شد${NC}"
fi

# ابزارهای ضروری
echo "  ├── نصب ابزارها..."
sudo apt install -y nginx git build-essential curl wget unzip > /dev/null 2>&1

# PM2
if command -v pm2 &> /dev/null; then
  echo -e "  ✅ PM2 نصب شده"
else
  echo "  ├── نصب PM2..."
  sudo npm install -g pm2 > /dev/null 2>&1
  pm2 startup systemd -u $USER --hp /home/$USER 2>/dev/null || true
  pm2 save 2>/dev/null || true
  echo -e "${GREEN}  ✅ PM2 نصب شد${NC}"
fi

# Bun (اختیاری - سریع‌تر از npm)
if command -v bun &> /dev/null; then
  echo -e "  ✅ Bun نصب شده"
else
  echo "  ├── نصب Bun..."
  curl -fsSL https://bun.sh/install | bash 2>/dev/null
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  echo -e "${GREEN}  ✅ Bun نصب شد${NC}"
fi
echo ""

# ═══════════════════════════════════════
# مرحله ۳: کلون پروژه
# ═══════════════════════════════════════
echo -e "${YELLOW}📦 مرحله ۳: کلون پروژه...${NC}"
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
  echo "  ├── پروژه وجود دارد، دریافت آخرین تغییرات..."
  cd "$APP_DIR"
  git fetch origin
  git reset --hard "origin/$BRANCH"
else
  echo "  ├── کلون از $REPO_URL (شاخه: $BRANCH)..."
  cd "$APP_DIR"
  git clone -b "$BRANCH" "$REPO_URL" .
fi
echo -e "${GREEN}  ✅ پروژه آماده شد${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۴: نصب وابستگی‌ها
# ═══════════════════════════════════════
echo -e "${YELLOW}📦 مرحله ۴: نصب وابستگی‌ها...${NC}"
cd "$APP_DIR"

if command -v bun &> /dev/null; then
  echo "  ├── نصب با Bun..."
  bun install
else
  echo "  ├── نصب با npm..."
  npm install --legacy-peer-deps
fi
echo -e "${GREEN}  ✅ وابستگی‌ها نصب شدند${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۵: تنظیمات محیط
# ═══════════════════════════════════════
echo -e "${YELLOW}⚙️  مرحله ۵: تنظیمات محیط...${NC}"
cd "$APP_DIR"

mkdir -p db private-uploads

if [ ! -f .env ]; then
  # تولید JWT_SECRET تصادفی
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "CHANGE_THIS_$(date +%s)_RANDOM")

  cat > .env << ENVEOF
# ═══ تنظیمات دیتابیس ═══
DATABASE_URL="file:./db/production.db"

# ═══ امنیت ═══
JWT_SECRET="$JWT_SECRET"

# ═══ آدرس سرور ═══
NEXT_PUBLIC_APP_URL="http://$SERVER_IP"
NEXT_PUBLIC_SERVER_URL="http://$SERVER_IP"

# ═══ پورت ═══
PORT=$APP_PORT
HOSTNAME=0.0.0.0
ENVEOF
  chmod 600 .env
  echo -e "${GREEN}  ✅ فایل .env ساخته شد (JWT_SECRET تصادفی)${NC}"
else
  echo -e "${GREEN}  ✅ فایل .env از قبل وجود دارد${NC}"
fi
echo ""

# ═══════════════════════════════════════
# مرحله ۶: دیتابیس
# ═══════════════════════════════════════
echo -e "${YELLOW}🗄️  مرحله ۶: تنظیم دیتابیس...${NC}"
cd "$APP_DIR"

npx prisma generate
npx prisma db push --skip-generate

# دیتای اولیه
if [ -f prisma/seed.ts ]; then
  echo "  ├── درج داده‌های اولیه..."
  npx prisma db seed 2>/dev/null || echo "  ⚠️ خطا در seed (نادیده گرفته شد)"
fi
echo -e "${GREEN}  ✅ دیتابیس آماده شد${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۷: بیلد پروژه
# ═══════════════════════════════════════
echo -e "${YELLOW}🔨 مرحله ۷: بیلد پروژه...${NC}"
cd "$APP_DIR"

NODE_OPTIONS="--max-old-space-size=512" npm run build
echo -e "${GREEN}  ✅ بیلد انجام شد${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۸: اجرا با PM2
# ═══════════════════════════════════════
echo -e "${YELLOW}🚀 مرحله ۸: اجرا با PM2...${NC}"
cd "$APP_DIR"

pm2 delete "$APP_NAME" 2>/dev/null || true

NODE_ENV=production \
HOSTNAME=0.0.0.0 \
PORT=$APP_PORT \
pm2 start .next/standalone/server.js \
  --name "$APP_NAME" \
  --max-memory-restart 400M

pm2 save
echo -e "${GREEN}  ✅ سرویس روی پورت $APP_PORT اجرا شد${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۹: تنظیم Nginx (پورت ۸۰)
# ═══════════════════════════════════════
echo -e "${YELLOW}🔧 مرحله ۹: تنظیم Nginx روی پورت $NGINX_PORT...${NC}"

sudo tee /etc/nginx/sites-available/pishegam > /dev/null << EOF
# ═══════════════════════════════════════
# سامانه تخفیف درمانی — پیشگام سلامت
# سرور: $SERVER_IP:$NGINX_PORT
# ═══════════════════════════════════════
server {
    listen $NGINX_PORT;
    server_name $SERVER_IP;

    client_max_body_size 10M;

    # فایل‌های استاتیک کش شود
    location /_next/static {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }

    # Service Worker — نباید کش شود
    location /sw.js {
        proxy_pass http://127.0.0.1:$APP_PORT;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # manifest.json — نباید کش شود
    location /manifest.json {
        proxy_pass http://127.0.0.1:$APP_PORT;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # آیکون‌ها — کش بلندمدت
    location ~* /icon-.*\\.png\$ {
        proxy_pass http://127.0.0.1:$APP_PORT;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # سایر درخواست‌ها
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$upgrade;
    }
}
EOF

# حذف default اگر وجود دارد
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

sudo ln -sf /etc/nginx/sites-available/pishegam /etc/nginx/sites-enabled/pishegam
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl reload nginx
echo -e "${GREEN}  ✅ Nginx روی پورت $NGINX_PORT تنظیم شد${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۱۰: فایروال
# ═══════════════════════════════════════
echo -e "${YELLOW}🛡️  مرحله ۱۰: تنظیم فایروال...${NC}"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow $NGINX_PORT/tcp
sudo ufw --force enable
echo -e "${GREEN}  ✅ فایروال: فقط SSH و پورت $NGINX_PORT باز است${NC}"
echo ""

# ═══════════════════════════════════════
# تمام!
# ═══════════════════════════════════════
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                     ║${NC}"
echo -e "${GREEN}║     ✅ نصب با موفقیت انجام شد!                      ║${NC}"
echo -e "${GREEN}║                                                     ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📍 ${CYAN}آدرس سایت:${NC}     http://$SERVER_IP"
echo -e "  📊 ${CYAN}وضعیت سرویس:${NC}   pm2 status"
echo -e "  📋 ${CYAN}لاگ‌های زنده:${NC}    pm2 logs $APP_NAME"
echo -e "  🔄 ${CYAN}آپدیت:${NC}         cd $APP_DIR && bash update.sh"
echo -e "  🗑️  ${CYAN}حذف کامل:${NC}      bash $APP_DIR/cleanup.sh"
echo ""
echo -e "  ${YELLOW}⚠️  حساب مدیریت: موبایل 09123456789 / رمز admin123${NC}"
echo ""
