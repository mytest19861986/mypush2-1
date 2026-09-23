'use client'

import React, { useState } from 'react'
import {
  Settings,
  Shield,
  CreditCard,
  Bell,
  Activity,
  Sliders,
  Save,
  CheckCircle2,
  Lock,
  Users,
  Smartphone,
  Mail,
  Globe,
  Database,
  Server,
  RefreshCw,
  Sparkles,
  Key,
  BadgeAlert,
  ArrowRight,
  Eye,
  FileText
} from 'lucide-react'
import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'
import { PremiumMetricCard } from '@/components/shared/premium-metric-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function SettingsPremiumPreviewPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'access' | 'payment' | 'notification' | 'system'>('general')

  // Mock Settings Form State (Presentation Layer Only)
  const [generalSettings, setGeneralSettings] = useState({
    platformName: 'سامانه جامع تخفیف درمانی حامی‌کارت',
    tagline: 'همراه سلامت، برای همه',
    supportPhone: '۰۲۱-۸۸۸۸۰۰۰۰',
    supportEmail: 'support@hamicard.ir',
    defaultDiscountCap: '۴۰٪',
    autoApproveUsers: true
  })

  // Mock Roles and Permissions
  const roleDefinitions = [
    {
      role: 'مدیر کل (Super Admin)',
      badge: 'دسترسی کامل',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      usersCount: 2,
      permissions: ['مدیریت کل سیستم', 'تراکنش‌های مالی شاپرک', 'تعریف و تغییر تعرفه‌ها', 'پیکربندی امنیت']
    },
    {
      role: 'کارشناس پذیرش سلامت',
      badge: 'دسترسی درمانی',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      usersCount: 8,
      permissions: ['بررسی مدارک مراکز درمانی', 'تأیید پذیرش مراجعین', 'گزارش‌گیری خدمات پزشکی']
    },
    {
      role: 'مدیر شبکه نمایندگان و فروش',
      badge: 'دسترسی بازرگانی',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      usersCount: 5,
      permissions: ['تخصیص سهمیه نمایندگان', 'مشاهده گردش کمیسیون', 'صدور کدهای بازاریابی']
    },
    {
      role: 'حسابدار و امور مالی',
      badge: 'دسترسی مالی',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      usersCount: 3,
      permissions: ['دریافت گزارشات شاپرک', 'تسویه حساب مراکز و نمایندگان', 'صدور فاکتور رسمی']
    }
  ]

  // Mock Payment Gateways
  const paymentGateways = [
    {
      id: 'shaparak-sep',
      name: 'درگاه پرداخت الکترونیک سامان (SEP)',
      provider: 'شبکه شاپرک',
      terminalId: '۸۹۱۰۴۴۳۲',
      merchantId: '۱۰۴۴۳۲۰-HAMI',
      status: 'ACTIVE',
      statusLabel: 'متصل و فعال',
      successRate: '۹۹.۴٪',
      type: 'مستقیم بانکی'
    },
    {
      id: 'shaparak-mellat',
      name: 'درگاه پرداخت به‌پرداخت ملت',
      provider: 'شبکه شاپرک',
      terminalId: '۴۳۲۱۰۹۸۸',
      merchantId: '۲۱۰۹۸۸۰-HAMI',
      status: 'STANDBY',
      statusLabel: 'پشتیبان فعال',
      successRate: '۹۸.۹٪',
      type: 'درگاه ثانویه پشتیبان'
    }
  ]

  // Mock System Health Metrics
  const systemServices = [
    { name: 'پایگاه داده اصلی (SQLite Local Instance)', status: 'HEALTHY', latency: '۲ میلی‌ثانیه', load: '۱۴٪' },
    { name: 'سرویس پیامک و احراز هویت OTP (کاوه نگار / ملی‌پیامک)', status: 'HEALTHY', latency: '۱۴۰ میلی‌ثانیه', load: '۲۲٪' },
    { name: 'سرویس مسیریابی و گیت‌وی وب (Next.js App Server)', status: 'HEALTHY', latency: '۵ میلی‌ثانیه', load: '۱۸٪' },
    { name: 'سرویس صدور کارت و فایل‌های PDF سلامت', status: 'HEALTHY', latency: '۳۵ میلی‌ثانیه', load: '۹٪' }
  ]

  return (
    <DashboardAppShell activeMenu="settings">
      <div className="space-y-8">
        {/* ─── Header & Section Intro ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF5F2] text-[#0D5C58] border border-[#0D5C58]/20">
                پیکربندی سازمانی
              </span>
              <span className="text-xs text-slate-400">مرکز تنظیمات کلان و سطوح دسترسی</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">تنظیمات جامع و زیرساخت سامانه</h1>
            <p className="text-sm text-slate-500 mt-1">
              مدیریت هویت سازمانی، سیاست‌های امنیتی و دسترسی، درگاه‌های شاپرک، رویدادها و پایش سلامت سرویس‌ها
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              className="rounded-xl bg-[#0D5C58] hover:bg-[#0a4845] text-white text-xs font-bold gap-1.5 h-10 px-4 shadow-sm"
            >
              <Save className="size-4" />
              ذخیره تغییرات پیکربندی
            </Button>
          </div>
        </div>

        {/* ─── Metric Summary Row ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PremiumMetricCard
            title="وضعیت سلامت کلی زیرساخت"
            value="۱۰۰٪ عملیاتی"
            trend="۴ از ۴ سرویس فعال"
            isUp={true}
            description="پایش بلادرنگ سرورها"
            variant="green"
            icon={Activity}
          />
          <PremiumMetricCard
            title="نقش‌های سازمانی تعریف‌شده"
            value="۴ رده دسترسی"
            trend="۱۸ کاربر دارای نقش"
            isUp={true}
            description="تفکیک دقیق اختیارات"
            variant="blue"
            icon={Shield}
          />
          <PremiumMetricCard
            title="پایداری درگاه‌های پرداخت"
            value="۹۹.۴٪ نرخ موفقیت"
            trend="متصل به شاپرک"
            isUp={true}
            description="سامان و به‌پرداخت ملت"
            variant="purple"
            icon={CreditCard}
          />
          <PremiumMetricCard
            title="تحویل رویدادهای پیامکی"
            value="۹۸.۷٪ نرخ تحویل"
            trend="پوشش احراز هویت"
            isUp={true}
            description="OTP و اطلاعیه پذیرش"
            variant="amber"
            icon={Bell}
          />
        </div>

        {/* ─── Navigation Tabs Strip ─── */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'general'
                ? 'bg-[#0D5C58] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Sliders className="size-4" />
            تنظیمات عمومی و برند
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'access'
                ? 'bg-[#0D5C58] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Shield className="size-4" />
            مرکز کنترل دسترسی و نقش‌ها
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'payment'
                ? 'bg-[#0D5C58] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CreditCard className="size-4" />
            درگاه‌های پرداخت و تسویه
          </button>
          <button
            onClick={() => setActiveTab('notification')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'notification'
                ? 'bg-[#0D5C58] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Bell className="size-4" />
            مرکز اعلان‌ها و سامانه پیامک
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'system'
                ? 'bg-[#0D5C58] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Server className="size-4" />
            پایش سلامت زیرساخت (Health)
          </button>
        </div>

        {/* ─── بخش 1: General Settings ─── */}
        {activeTab === 'general' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">تنظیمات عمومی سامانه و برندینگ</h2>
                <p className="text-xs text-slate-500">پیکربندی عناوین، اطلاعات تماس پشتیبانی و پارامترهای پیش‌فرض طرح‌ها</p>
              </div>
              <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                نسخه سیستم: v2.4-Premium
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">نام رسمی سامانه</label>
                <input
                  type="text"
                  value={generalSettings.platformName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, platformName: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D5C58]/20 focus:border-[#0D5C58]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">شعار برند (Tagline)</label>
                <input
                  type="text"
                  value={generalSettings.tagline}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, tagline: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D5C58]/20 focus:border-[#0D5C58]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">تلفن مرکز پشتیبانی و پذیرش</label>
                <input
                  type="text"
                  value={generalSettings.supportPhone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, supportPhone: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0D5C58]/20 focus:border-[#0D5C58]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">پست الکترونیکی پشتیبانی رسمی</label>
                <input
                  type="email"
                  value={generalSettings.supportEmail}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0D5C58]/20 focus:border-[#0D5C58]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">سقف تخفیف استاندارد حامی‌کارت در مراکز</label>
                <input
                  type="text"
                  value={generalSettings.defaultDiscountCap}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, defaultDiscountCap: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D5C58]/20 focus:border-[#0D5C58]"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 self-end h-11">
                <span className="text-xs font-bold text-slate-700">تأیید خودکار ثبت‌نام کاربران آنلاین</span>
                <span className="text-xs font-black text-emerald-600 bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
                  فعال
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─── بخش 2: Access Control Center ─── */}
        {activeTab === 'access' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">مرکز کنترل سطوح دسترسی و اختیارات سازمانی</h2>
                <p className="text-xs text-slate-500">تفکیک نقش‌های مدیریتی، مالی، پذیرش و شبکه فروش بر اساس سیاست‌های انترپرایز</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold border-slate-200">
                تعریف نقش جدید
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roleDefinitions.map((item, idx) => (
                <div key={idx} className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">{item.role}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.usersCount} کاربر تخصیص‌یافته</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 block">مجوزها و اختیارات:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.permissions.map((perm, pIdx) => (
                        <span key={pIdx} className="text-[11px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                          ✓ {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── بخش 3: Payment Configuration ─── */}
        {activeTab === 'payment' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">درگاه‌های پرداخت الکترونیک و تسویه شاپرک</h2>
                <p className="text-xs text-slate-500">پیکربندی ترمینال‌های پرداخت خرید اشتراک و گردش کارمزدهای ارجاعی</p>
              </div>
              <Badge className="bg-[#EAF5F2] text-[#0D5C58] border border-[#0D5C58]/20 text-xs font-bold">
                پروتکل امن SSL / شاپرک فعال
              </Badge>
            </div>

            <div className="space-y-4">
              {paymentGateways.map((gw) => (
                <div key={gw.id} className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="size-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0D5C58] shadow-2xs shrink-0">
                      <CreditCard className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm">{gw.name}</h3>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {gw.statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono">
                        کد ترمینال: {gw.terminalId} • شناسه پذیرنده: {gw.merchantId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-left">
                      <span className="text-xs text-slate-400 block font-medium">نرخ موفقیت</span>
                      <span className="text-xs font-black text-emerald-600 font-mono">{gw.successRate}</span>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-lg text-xs font-bold border-slate-200">
                      تنظیمات درگاه
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── بخش 4: Notification Center ─── */}
        {activeTab === 'notification' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">مرکز اعلان‌ها و سامانه‌های پیام‌رسانی</h2>
                <p className="text-xs text-slate-500">پیکربندی الگوهای پیامک OTP، صدور کارت و هشدارهای سررسید قراردادها</p>
              </div>
              <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                اعتبار باقی‌مانده: ۴۵,۰۰۰ پیامک
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                <div className="size-8 rounded-lg bg-[#EAF5F2] text-[#0D5C58] flex items-center justify-center">
                  <Smartphone className="size-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-xs">پیامک احراز هویت (OTP)</h3>
                <p className="text-[11px] text-slate-500">
                  ارسال آنی کد یکبار مصرف ورود به سامانه با خط خدماتی بدون بلک‌لیست
                </p>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-400">وضعیت الگو</span>
                  <span className="text-emerald-600 font-bold">تأییدشده</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                <div className="size-8 rounded-lg bg-[#EBF3FC] text-[#1D68BD] flex items-center justify-center">
                  <Bell className="size-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-xs">اطلاعیه پذیرش در مراکز</h3>
                <p className="text-[11px] text-slate-500">
                  ارسال پیامک خوش‌آمد و ثبت تخفیف به بیمار بلافاصله پس از ثبت در کلینیک
                </p>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-400">وضعیت الگو</span>
                  <span className="text-emerald-600 font-bold">تأییدشده</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                <div className="size-8 rounded-lg bg-[#FEF7EA] text-[#B57314] flex items-center justify-center">
                  <Mail className="size-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-xs">ایمیل‌های رسمی مدیریتی</h3>
                <p className="text-[11px] text-slate-500">
                  ارسال خلاصه هفتگی هوش کسب‌وکار (BI) و هشدارهای امنیتی ورود به مدیر ارشد
                </p>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-400">وضعیت سرویس</span>
                  <span className="text-emerald-600 font-bold">متصل</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── بخش 5: System Health ─── */}
        {activeTab === 'system' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-[#EAF5F2] text-[#0D5C58] flex items-center justify-center">
                  <Activity className="size-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base">پایش بلادرنگ سلامت زیرساخت و سرویس‌ها</h2>
                  <p className="text-xs text-slate-500">وضعیت لایه‌های پایگاه داده، درگاه‌های ارتباطی و هسته اجرایی</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold border-slate-200 gap-1.5">
                <RefreshCw className="size-3.5" />
                بررسی مجدد سلامت
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {systemServices.map((service, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{service.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">زمان پاسخ: {service.latency}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 font-mono">میزان بار: {service.load}</span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      سالم (OK)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardAppShell>
  )
}
