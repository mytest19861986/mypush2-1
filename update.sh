#!/bin/bash
# ╔═══════════════════════════════════════════════════════╗
# ║  update.sh — آپدیت سامانه تخفیف درمانی            ║
# ║  پیشگام سلامت                                       ║
# ║  هر بار که کد تغییر کرد اجرا شود                    ║
# ╚═══════════════════════════════════════════════════════╝

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_DIR="/var/www/pishegam"
APP_NAME="pishegam"

cd "$APP_DIR" || {
  echo -e "${RED}❌ پوشه پروژه پیدا نشد: $APP_DIR${NC}"
  echo "ابتدا اسکریپت deploy.sh را اجرا کنید"
  exit 1
}

clear
echo ""
echo -e "${CYAN}🔄 آپدیت سامانه تخفیف درمانی — پیشگام سلامت${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۱: دریافت تغییرات
# ═══════════════════════════════════════
echo -e "${YELLOW}📦 مرحله ۱: دریافت تغییرات از گیت‌هاب...${NC}"
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo -e "${GREEN}  ✅ پروژه آپدیت است — تغییر جدیدی وجود ندارد${NC}"
else
  echo "  ├── تغییرات جدید یافت شد، اعمال کردن..."
  git pull origin main
  echo -e "${GREEN}  ✅ تغییرات اعمال شد${NC}"
fi
echo ""

# ═══════════════════════════════════════
# مرحله ۲: نصب وابستگی‌های جدید
# ═══════════════════════════════════════
echo -e "${YELLOW}📦 مرحله ۲: نصب وابستگی‌ها...${NC}"
if command -v bun &> /dev/null; then
  bun install
else
  npm install --legacy-peer-deps
fi
echo -e "${GREEN}  ✅ وابستگی‌ها نصب شدند${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۳: به‌روزرسانی دیتابیس
# ═══════════════════════════════════════
echo -e "${YELLOW}🗄️  مرحله ۳: به‌روزرسانی دیتابیس...${NC}"
npx prisma generate
npx prisma db push --skip-generate
echo -e "${GREEN}  ✅ دیتابیس به‌روز شد${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۴: بیلد
# ═══════════════════════════════════════
echo -e "${YELLOW}🔨 مرحله ۴: بیلد پروژه...${NC}"
# پاک‌سازی کش قبلی
rm -rf .next/cache
NODE_OPTIONS="--max-old-space-size=512" npm run build
echo -e "${GREEN}  ✅ بیلد انجام شد${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۵: ریستارت
# ═══════════════════════════════════════
echo -e "${YELLOW}🔄 مرحله ۵: ریستارت سرویس...${NC}"
pm2 restart "$APP_NAME" --update-env 2>/dev/null || {
  # اگر PM2 پردازش پیدا نکرد، دوباره بساز
  NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 \
    pm2 start .next/standalone/server.js \
    --name "$APP_NAME" \
    --max-memory-restart 400M
}
pm2 save
echo -e "${GREEN}  ✅ سرویس ریستارت شد${NC}"
echo ""

# ═══════════════════════════════════════
# مرحله ۶: پاک‌سازی
# ═══════════════════════════════════════
echo -e "${YELLOW}🧹 مرحله ۶: پاک‌سازی حافظه...${NC}"
sync && sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches' 2>/dev/null || true
echo -e "${GREEN}  ✅ کش سیستم پاک شد${NC}"
echo ""

# ═══════════════════════════════════════
# تمام!
# ═══════════════════════════════════════
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ آپدیت با موفقیت انجام شد!                    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📍 ${CYAN}آدرس سایت:${NC}     http://107.173.47.76"
echo -e "  📊 ${CYAN}وضعیت:${NC}         pm2 status"
echo -e "  📋 ${CYAN}لاگ:${NC}           pm2 logs $APP_NAME"
echo ""
