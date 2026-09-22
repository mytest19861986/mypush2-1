# System Architecture — Hami Card

## ۱. تکنولوژی‌های فرانت‌اند و بک‌اند
- **Frontend Stack**:
  - Next.js 16 (App Router)
  - React 19
  - TypeScript
  - Tailwind CSS 4 + `@tailwindcss/postcss`
  - Radix UI Primitives + shadcn-style component architecture
  - Zustand (State Management)
  - TanStack Query / Table
  - Framer Motion (انیمیشن‌ها و ترنزیشن‌ها)
- **Backend Stack**:
  - Next.js API Routes & Server Actions
  - Prisma ORM
  - SQLite (محیط Demo) / PostgreSQL (محیط Production)

## ۲. ساختار زیرساخت و سرور دمو
- **سیستم‌عامل**: Ubuntu 24
- **آدرس IP**: `92.118.190.101`
- **دامنه**: `hami-card.com`
- **مسیر پروژه روی سرور**: `/opt/apps/hami-card-verification`
- **جریان اجرا (Runtime Flow)**:
  `Browser -> Nginx (:80) -> Docker Container (node:22-alpine :3000) -> Next.js Standalone`
