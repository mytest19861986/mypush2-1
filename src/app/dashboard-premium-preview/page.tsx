'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Building2,
  FileCheck2,
  TrendingUp,
  UserPlus,
  Settings2,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  CreditCard,
  Stethoscope,
  ChevronRight,
  Filter,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toPersianNum } from '@/utils/formatters'

export default function DashboardPremiumPreviewPage() {
  const [activeTimeRange, setActiveTimeRange] = useState<'today' | 'week' | 'month'>('week')

  const kpis = [
    {
      title: 'کاربران و اعضای فعال',
      value: '۲,۸۴۵',
      growth: '+۱۲.۴٪',
      isUp: true,
      description: 'افزایش نسبت به ماه گذشته',
      icon: Users,
      glow: 'from-emerald-500/20 to-teal-500/5',
      accentColor: 'text-emerald-600 dark:text-emerald-400',
      badge: 'رشد فعال'
    },
    {
      title: 'مراکز درمانی و مطب‌ها',
      value: '۱۴۲',
      growth: '+۴ مرکز',
      isUp: true,
      description: 'قرارداد رسمی تاییدشده',
      icon: Building2,
      glow: 'from-blue-500/20 to-indigo-500/5',
      accentColor: 'text-blue-600 dark:text-blue-400',
      badge: 'پوشش استانی'
    },
    {
      title: 'درخواست‌های فعال و نوبت‌ها',
      value: '۳۸۹',
      growth: '-۲.۱٪',
      isUp: false,
      description: '۹۸٪ پاسخ‌گویی در کمتر از ۱۰ دقیقه',
      icon: FileCheck2,
      glow: 'from-amber-500/20 to-orange-500/5',
      accentColor: 'text-amber-600 dark:text-amber-400',
      badge: 'در حال بررسی'
    },
    {
      title: 'گردش مالی و کمیسیون‌ها',
      value: '۴۱۸,۹۰۰,۰۰۰',
      unit: 'تومان',
      growth: '+۱۸.۷٪',
      isUp: true,
      description: 'مجموع حق اشتراک و تعرفه',
      icon: TrendingUp,
      glow: 'from-teal-500/20 to-emerald-500/5',
      accentColor: 'text-teal-600 dark:text-teal-400',
      badge: 'تایید شاپرک'
    },
  ]

  const quickActions = [
    {
      title: 'ثبت پزشک یا مرکز جدید',
      description: 'تخصیص تعرفه، سهمیه و احراز مجوزهای نظام پزشکی',
      icon: Stethoscope,
      badge: 'اقدام فوری',
      href: '#',
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    },
    {
      title: 'مدیریت و اعتبارسنجی کاربران',
      description: 'احراز هویت، تمدید اشتراک‌ها و صدور کارت درمانی',
      icon: UserPlus,
      badge: 'کاربران',
      href: '#',
      color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
    },
    {
      title: 'گزارش عملکرد و BI تله‌متری',
      description: 'آنالیز داده‌های مراجعات پزشکی، تراکنش‌ها و شعب',
      icon: BarChart3,
      badge: 'تحلیلی',
      href: '#',
      color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
    },
    {
      title: 'پیکربندی طرح‌ها و تعرفه‌ها',
      description: 'تنظیم سقف تخفیف دندانپزشکی، بسته‌های طلایی و نقره‌ای',
      icon: Settings2,
      badge: 'تعرفه‌ها',
      href: '#',
      color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
    },
  ]

  const activityFeed = [
    {
      id: 1,
      title: 'خرید اشتراک طلایی یک‌ساله',
      user: 'سارا میرزایی (۰۹۱۲***۸۸۱۱)',
      time: '۵ دقیقه پیش',
      status: 'پرداخت موفق',
      variant: 'success' as const,
      icon: CreditCard,
      amount: '۲,۵۰۰,۰۰۰ تومان'
    },
    {
      id: 2,
      title: 'تکمیل مدارک و ثبت پزشک همکار',
      user: 'دکتر علیرضا افشارزاده (فک و صورت)',
      time: '۲۸ دقیقه پیش',
      status: 'تایید اولیه',
      variant: 'premium' as const,
      icon: Stethoscope,
      amount: 'قرارداد ونک'
    },
    {
      id: 3,
      title: 'درخواست همکاری نمایندگی فروش',
      user: 'شرکت خدمات رفاهی نوین مهر',
      time: '۱ ساعت پیش',
      status: 'در صف بررسی',
      variant: 'warning' as const,
      icon: Building2,
      amount: 'کد نماینده: AG-104'
    },
    {
      id: 4,
      title: 'ثبت تراکنش تخفیف درمانی در کلینیک',
      user: 'کلینیک دندانپزشکی مهرگان',
      time: '۲ ساعت پیش',
      status: 'تسویه شد',
      variant: 'default' as const,
      icon: CheckCircle,
      amount: 'تخفیف ۴۰٪ اعمال شد'
    },
  ]

  return (
    <div className="min-h-screen bg-background/95 p-4 sm:p-6 lg:p-10 space-y-8" dir="rtl">
      {/* ─── Top Premium Header & Greeting ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/50 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              داشبورد هوش تجاری و تله‌متری حامی‌کارت
            </h1>
            <Badge variant="premium" className="hidden sm:inline-flex">
              <Sparkles className="size-3.5 text-primary" />
              <span>SaaS Business Intelligence v2</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span>درود، مدیر ارشد سامانه. خوش آمدید.</span>
            <span>•</span>
            <Clock className="size-3.5" />
            <span>آخرین به‌روزرسانی زنده داده‌ها: امروز، ساعت ۱۸:۴۵</span>
          </p>
        </div>

        {/* Time range selector & status */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-muted/60 p-1 border border-border/40">
            <button
              onClick={() => setActiveTimeRange('today')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTimeRange === 'today'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              امروز
            </button>
            <button
              onClick={() => setActiveTimeRange('week')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTimeRange === 'week'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ۷ روز اخیر
            </button>
            <button
              onClick={() => setActiveTimeRange('month')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTimeRange === 'month'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ماه جاری
            </button>
          </div>

          <Button variant="premium" size="sm" className="hidden sm:flex gap-1.5 shadow-sm">
            <ShieldCheck className="size-4" />
            <span>خروجی مدیریتی</span>
          </Button>
        </div>
      </div>

      {/* ─── Section 1: KPI Cards Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <Card key={idx} variant="premium" className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              {/* Subtle top ambient glow */}
              <div className={`absolute -top-12 -right-12 size-28 rounded-full bg-gradient-to-br ${kpi.glow} blur-2xl group-hover:scale-150 transition-transform duration-500`} />
              
              <CardContent className="p-6 relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs ring-1 ring-primary/20">
                    <Icon className="size-5" />
                  </div>
                  <Badge variant="outline" className="text-[11px] font-normal border-border/60">
                    {kpi.badge}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-foreground">
                      {kpi.value}
                    </span>
                    {kpi.unit && (
                      <span className="text-xs font-semibold text-muted-foreground">{kpi.unit}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border/30">
                  <span className={`font-semibold flex items-center gap-0.5 ${kpi.isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    <ArrowUpRight className={`size-3.5 ${!kpi.isUp && 'rotate-90'}`} />
                    <span dir="ltr">{kpi.growth}</span>
                  </span>
                  <span className="text-muted-foreground truncate">{kpi.description}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ─── Section 2: Quick Actions Hub ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span>مرکز عملیات و دسترسی سریع (Quick Actions)</span>
          </h2>
          <span className="text-xs text-muted-foreground">۴ اقدام پرتکرار مدیریتی</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon
            return (
              <Card
                key={idx}
                variant="glass"
                className="group cursor-pointer hover:border-primary/40 hover:bg-card/90 transition-all duration-200"
              >
                <CardContent className="p-5 flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`size-8 rounded-lg flex items-center justify-center ${action.color}`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {action.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-0.5 transition-all shrink-0 mt-2" />
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ─── Section 3: Activity Feed & Health Overview ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <span>جریان فعالیت‌های زنده (Live Activity Feed)</span>
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
              مشاهده تاریخچه کامل
            </Button>
          </div>

          <Card variant="glass">
            <CardContent className="p-0 divide-y divide-border/40">
              {activityFeed.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                        <Icon className="size-5" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.user}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-left hidden sm:block">
                        <p className="text-xs font-mono font-bold text-foreground">{item.amount}</p>
                        <p className="text-[11px] text-muted-foreground">{item.time}</p>
                      </div>
                      <Badge variant={item.variant}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* System Health & Guarantee Panel (1 Col) */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>وضعیت سلامت و پایداری</span>
          </h2>

          <Card variant="premium" className="space-y-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">سرویس‌های عملیاتی حامی‌کارت</CardTitle>
              <CardDescription>بررسی تله‌متری نودهای سرور و درگاه‌ها</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <span className="text-muted-foreground">سرور دمو (Ubuntu 24):</span>
                <Badge variant="success">92.118.190.101 : OK</Badge>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <span className="text-muted-foreground">سرویس احراز پیامکی (OTP):</span>
                <Badge variant="success">پاسخگویی ۹۹.۹٪</Badge>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <span className="text-muted-foreground">دیتابیس تراکنش‌ها:</span>
                <Badge variant="success">پایدار و امن</Badge>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-xs text-foreground/80 leading-relaxed border border-primary/20">
                💡 تمام تغییرات بصری در لایه فرانت‌اند منطبق بر الگوی Premium اجرا شده و هیچ وابستگی شکستنی در پایگاه داده ایجاد نکرده است.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
