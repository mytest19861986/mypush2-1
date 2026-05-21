#!/bin/bash
# ╔═══════════════════════════════════════════════════════╗
# ║  cleanup.sh — حذف کامل پروژه از سرور              ║
# ║  پیشگام سلامت                                       ║
# ║  ⚠️  تمام داده‌ها حذف خواهند شد!                    ║
# ╚═══════════════════════════════════════════════════════╝

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/var/www/pishegam"
APP_NAME="pishegam"

echo ""
echo -e "${RED}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║     ⚠️  حذف کامل سامانه تخفیف درمانی               ║${NC}"
echo -e "${RED}║     تمام داده‌ها و تنظیمات حذف خواهند شد!          ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

read -p "آیا مطمئن هستید؟ (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "عملیات لغو شد."
  exit 0
fi

echo ""
echo -e "${YELLOW}🗑️  شروع حذف...${NC}"

# توقف PM2
echo "  ├── توقف سرویس..."
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 save 2>/dev/null || true

# حذف تنظیمات Nginx
echo "  ├── حذف Nginx..."
sudo rm -f /etc/nginx/sites-enabled/pishegam 2>/dev/null || true
sudo rm -f /etc/nginx/sites-available/pishegam 2>/dev/null || true
sudo systemctl reload nginx 2>/dev/null || true

# حذف پوشه پروژه
echo "  ├── حذف پوشه پروژه..."
sudo rm -rf "$APP_DIR"

# حذف فایروال rule
sudo ufw delete allow 80/tcp 2>/dev/null || true

echo -e "${GREEN}  ✅ حذف کامل انجام شد${NC}"
echo ""
echo "سرور پاک شد. برای نصب مجدد:"
echo "  bash deploy.sh"
echo ""
