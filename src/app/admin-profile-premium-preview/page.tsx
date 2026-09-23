'use client'

import React, { useState } from 'react'
import {
  ShieldCheck,
  Building,
  Mail,
  Phone,
  Calendar,
  Lock,
  Smartphone,
  History,
  KeyRound,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  LogOut,
  UserCheck,
  Award,
  Layers,
  FileText,
  BadgeCheck,
  ChevronLeft,
  Laptop,
  Globe
} from 'lucide-react'
import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'
import { PremiumMetricCard } from '@/components/shared/premium-metric-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function AdminProfilePremiumPreviewPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'activity'>('overview')

  // Mock Active Sessions
  const activeSessions = [
    {
      id: 'SES-01',
      device: 'سیستم شخصی (Windows / Chrome 124)',
      ip: '192.168.1.105 (تهران، ایران)',
      current: true,
      lastActive: 'هم‌اکنون فعال',
      icon: Laptop
    },
    {
      id: 'SES-02',
      device: 'گوشی همراه (iOS / Safari Mobile)',
      ip: '5.200.84.12 (همراه اول)',
      current: false,
      lastActive: '۲ ساعت پیش',
      icon: Smartphone
    }
  ]

  // Mock Admin Activity Timeline
  const activityTimeline = [
    {
      id: 1,
      title: 'تأیید قرارداد بیمارستان تخصصی پارس',
      time: 'امروز، ۱۰:۴۵',
      type: 'approval',
      description: 'قرارداد سطح طلایی با نرخ تخفیف ۳۵٪ توسط مدیر سیستم تأیید گردید.'
    },
    {
      id: 2,
      title: 'ورود موفق به سامانه',
      time: 'امروز، ۰۸:۳۰',
      type: 'auth',
      description: 'احراز هویت دو مرحله‌ای (SMS OTP) از آی‌پی 192.168.1.105 با موفقیت تأیید شد.'
    },
    {
      id: 3,
      title: 'صدور مجوز همکاری نماینده ارشد (سارا کاظمی)',
      time: 'دیروز، ۱۶:۲۰',
      type: 'agent',
      description: 'دسترسی مدیریت شبکه فروش استان تهران و البرز فعال شد.'
    },
    {
      id: 4,
      title: 'تغییر تنظیمات درصد تعرفه خدمات دندانپزشکی',
      time: '۲ روز پیش، ۱۴:۱۰',
      type: 'settings',
      description: 'سقف تخفیف استاندارد برای کلینیک‌های ویژه از ۳۰٪ به ۳۵٪ افزایش یافت.'
    },
    {
      id: 5,
      title: 'دریافت خروجی گزارش مالی شاپرک',
      time: '۳ روز پیش، ۱۱:۰۵',
      type: 'export',
      description: 'فایل اکسل تسویه حساب هفتگی جهت ارسال به امور مالی دانلود شد.'
    }
  ]

  return (
    <DashboardAppShell activeMenu="settings">
      <div className="space-y-8">
        {/* ─── بخش 1: Profile Hero ─── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Top Banner Gradient */}
          <div className="h-32 bg-gradient-to-r from-[#0D5C58] via-[#12827B] to-teal-700 relative">
            <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
            <div className="absolute top-4 start-6">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white backdrop-blur-md border border-white/20">
                شناسه پرسنلی: HAMI-ADM-001
              </span>
            </div>
          </div>

          {/* Profile Details Container */}
          <div className="px-6 pb-6 pt-0 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-12">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
                {/* Large Avatar */}
                <div className="size-24 rounded-2xl bg-gradient-to-br from-[#0D5C58] to-teal-500 border-4 border-white text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                  م‌س
                </div>

                <div className="text-center sm:text-right space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">مهندس مهدی رضایی</h1>
                    <Badge className="bg-[#EAF5F2] text-[#0D5C58] border border-[#0D5C58]/20 text-xs font-bold gap-1 py-0.5">
                      <ShieldCheck className="size-3.5" />
                      مدیر ارشد پلتفرم (Super Admin)
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    مدیریت شبکه سلامت، تخصیص مجوزهای کشوری و نظارت بر گردش مالی شاپرک
                  </p>
                </div>
              </div>

              {/* Status and Last Login Capsule */}
              <div className="flex items-center justify-center gap-3 shrink-0">
                <div className="text-center sm:text-left">
                  <span className="text-[11px] text-slate-400 block font-medium">وضعیت حساب کاربری</span>
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start text-xs font-bold text-emerald-600">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    فعال و تأییدشده
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                <div className="text-center sm:text-left">
                  <span className="text-[11px] text-slate-400 block font-medium">آخرین ورود به سیستم</span>
                  <span className="text-xs font-bold text-slate-700">امروز، ساعت ۰۸:۳۰</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-100 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'overview'
                    ? 'bg-[#0D5C58] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <BadgeCheck className="size-4" />
                شناسنامه و هویت سازمانی
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'security'
                    ? 'bg-[#0D5C58] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Lock className="size-4" />
                مرکز امنیت و نشست‌ها
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'activity'
                    ? 'bg-[#0D5C58] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <History className="size-4" />
                تاریخچه اقدامات مدیریتی
              </button>
            </div>
          </div>
        </div>

        {/* ─── Metric Summary Row ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PremiumMetricCard
            title="سطح دسترسی سامانه"
            value="دسترسی ریشه (Root)"
            trend="۱۰۰٪ مجاز"
            isUp={true}
            description="پوشش تمامی زیرسیستم‌ها"
            variant="green"
            icon={ShieldCheck}
          />
          <PremiumMetricCard
            title="نشست‌های همزمان"
            value="۲ دستگاه فعال"
            trend="تحت نظارت"
            isUp={true}
            description="موبایل و کامپیوتر شخصی"
            variant="blue"
            icon={Smartphone}
          />
          <PremiumMetricCard
            title="اقدامات مدیریتی ماه"
            value="۱۲۸ اقدام ثبت‌شده"
            trend="۱۴٪+ رشد پایش"
            isUp={true}
            description="در سامانه گزارش‌گیری لاگ"
            variant="purple"
            icon={History}
          />
          <PremiumMetricCard
            title="ضریب امنیت حساب"
            value="عالی (A+)"
            trend="۲FA فعال"
            isUp={true}
            description="رمز پویا + پیامک امن"
            variant="amber"
            icon={Lock}
          />
        </div>

        {/* ─── بخش 2: Identity Card & Organization Info ─── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Org Card */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-[#EAF5F2] text-[#0D5C58] flex items-center justify-center">
                    <Building className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-base">اطلاعات سازمانی و هویت پلتفرم</h2>
                    <p className="text-xs text-slate-500">مشخصات ساختار حقوقی و نهاد ناظر بر خدمات درمانی</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">
                  سازمان تایید شده
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-400 font-medium">عنوان حقوقی پلتفرم</span>
                  <p className="text-sm font-bold text-slate-900">شرکت پیشگامان سلامت و بیمه ایرانیان (حامی‌کارت)</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-400 font-medium">سمت سازمانی مدیر</span>
                  <p className="text-sm font-bold text-slate-900">مدیرعامل و راهبر ارشد فناوری</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-400 font-medium">پست الکترونیکی رسمی</span>
                  <p className="text-sm font-bold text-slate-900 font-mono">admin@hamicard.ir</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-400 font-medium">شماره تماس تاییدشده</span>
                  <p className="text-sm font-bold text-slate-900 font-mono">۰۹۱۲۰۰۰۰۰۰۰</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-400 font-medium">موقعیت دفتر مرکزی</span>
                  <p className="text-sm font-bold text-slate-900">تهران، خیابان ولیعصر، برج سلامت، طبقه ۸</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-400 font-medium">تاریخ عضویت و راه‌اندازی</span>
                  <p className="text-sm font-bold text-slate-900">۱۴۰۲/۰۱/۱۵ (۳ سال فعالیت مستمر)</p>
                </div>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Award className="size-5 text-[#B57314]" />
                  <h3 className="font-extrabold text-slate-900 text-sm">مجوزها و تاییده‌های معتبر</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                    <span className="text-xs font-bold text-slate-800">مجوز وزارت بهداشت و درمان</span>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                    <span className="text-xs font-bold text-slate-800">اتصال رسمی به درگاه شاپرک</span>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <span className="text-xs font-bold text-slate-800">گواهی امنیت پرداخت الکترونیک</span>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
                >
                  ویرایش اطلاعات پایه
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── بخش 3: Security Center ─── */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Password & 2FA */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <div className="size-9 rounded-xl bg-[#FEF7EA] text-[#B57314] flex items-center justify-center">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base">کلمه عبور و احراز هویت دو مرحله‌ای</h2>
                  <p className="text-xs text-slate-500">مدیریت روش‌های ایمن‌سازی ورود به پنل مدیریت</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">تغییر کلمه عبور مدیر</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">آخرین تغییر: ۴۵ روز پیش</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-lg text-xs font-bold border-slate-200">
                    به‌روزرسانی
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900">احراز هویت پیامکی (SMS OTP)</h4>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        فعال
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">ارسال کد یکبارمصرف به شماره ۰۹۱۲۰۰۰۰۰۰۰</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-lg text-xs font-bold border-slate-200">
                    پیکربندی
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">کلیدهای دسترسی API (API Tokens)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">کلید دسترسی به سامانه‌های بانکی و پیامکی</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-lg text-xs font-bold border-slate-200">
                    مشاهده کلیدها
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-[#EBF3FC] text-[#1D68BD] flex items-center justify-center">
                    <Smartphone className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-base">نشست‌های فعال (Active Sessions)</h2>
                    <p className="text-xs text-slate-500">دستگاه‌های متصل به حساب مدیریتی شما</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold">
                  خروج از سایر دستگاه‌ها
                </Button>
              </div>

              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div key={session.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                        <session.icon className="size-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{session.device}</h4>
                          {session.current && (
                            <span className="text-[10px] font-bold bg-[#EAF5F2] text-[#0D5C58] border border-[#0D5C58]/20 px-2 py-0.2 rounded-full">
                              دستگاه فعلی
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{session.ip} • {session.lastActive}</p>
                      </div>
                    </div>

                    {!session.current && (
                      <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-rose-600">
                        لغو نشست
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── بخش 4: Activity Timeline ─── */}
        {activeTab === 'activity' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-[#F5EEFD] text-[#7E38B7] flex items-center justify-center">
                  <History className="size-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base">لاگ تاریخچه اقدامات مدیریتی (Audit Trail)</h2>
                  <p className="text-xs text-slate-500">ردیابی تمامی تصمیمات و تغییرات اعمال‌شده در سطح سامانه</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                پایش ۳۰ روز اخیر
              </Badge>
            </div>

            <div className="relative border-s-2 border-slate-200 ms-4 space-y-6">
              {activityTimeline.map((item) => (
                <div key={item.id} className="relative ps-6 group">
                  {/* Dot */}
                  <span className="absolute -start-[7px] top-1.5 size-3 rounded-full bg-[#0D5C58] ring-4 ring-white" />

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group-hover:bg-slate-100/70 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      <span className="text-[11px] text-slate-400 font-mono">{item.time}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
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
