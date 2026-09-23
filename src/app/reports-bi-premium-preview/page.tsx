'use client'

import React, { useState } from 'react'
import {
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Activity,
  ArrowUpRight,
  PieChart as PieChartIcon,
  Layers,
  FileSpreadsheet,
  Award,
  CreditCard,
  Percent,
  Sparkles,
  Search,
  ChevronLeft,
  Hospital,
  Stethoscope
} from 'lucide-react'
import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'
import { PremiumMetricCard } from '@/components/shared/premium-metric-card'
import { AnalyticsChartsBlock } from '@/components/shared/analytics-charts-block'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function ReportsBiPremiumPreviewPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'30d' | '90d' | '1y'>('30d')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Top Healthcare Centers Data
  const topCenters = [
    { name: 'بیمارستان تخصصی پارس', city: 'تهران', visits: 1840, share: '۲۸٪', discount: '۳۵٪', revenue: '۴۸۰,۰۰۰,۰۰۰ تومان', status: 'سطح A+' },
    { name: 'کلینیک دندانپزشکی صبا', city: 'تهران', visits: 1420, share: '۲۲٪', discount: '۴۰٪', revenue: '۳۶۵,۰۰۰,۰۰۰ تومان', status: 'سطح A' },
    { name: 'مرکز تصویربرداری نور', city: 'مشهد', visits: 980, share: '۱۵٪', discount: '۲۵٪', revenue: '۲۴۰,۰۰۰,۰۰۰ تومان', status: 'سطح A' },
    { name: 'آزمایشگاه تخصصی رازی', city: 'اصفهان', visits: 850, share: '۱۳٪', discount: '۳۰٪', revenue: '۱۹۵,۰۰۰,۰۰۰ تومان', status: 'سطح B+' },
    { name: 'پلی‌کلینیک سلامت شیراز', city: 'شیراز', visits: 620, share: '۱۰٪', discount: '۲۰٪', revenue: '۱۵۰,۰۰۰,۰۰۰ تومان', status: 'سطح B' },
  ]

  // Top Agents Ranking Data
  const topAgents = [
    { rank: 1, name: 'سارا کاظمی', province: 'تهران و البرز', volume: '۴۵۰ اشتراک', sales: '۸۹۰,۰۰۰,۰۰۰ تومان', commission: '۸۹,۰۰۰,۰۰۰ تومان', rate: '۶۴.۲٪' },
    { rank: 2, name: 'علیرضا داوودی', province: 'خراسان رضوی', volume: '۳۸۰ اشتراک', sales: '۷۴۰,۰۰۰,۰۰۰ تومان', commission: '۷۴,۰۰۰,۰۰۰ تومان', rate: '۵۸.۵٪' },
    { rank: 3, name: 'مریم حسینی', province: 'اصفهان', volume: '۲۹۵ اشتراک', sales: '۵۸۰,۰۰۰,۰۰۰ تومان', commission: '۵۸,۰۰۰,۰۰۰ تومان', rate: '۵۲.۱٪' },
    { rank: 4, name: 'حسین رستمی', province: 'فارس و جنوب', volume: '۲۱۰ اشتراک', sales: '۴۱۰,۰۰۰,۰۰۰ تومان', commission: '۴۱,۰۰۰,۰۰۰ تومان', rate: '۴۷.۸٪' },
  ]

  // Monthly Revenue Comparison Data
  const revenueComparison = [
    { month: 'فروردین', direct: 320, referral: 180, growth: '+۱۲٪' },
    { month: 'اردیبهشت', direct: 380, referral: 240, growth: '+۱۸٪' },
    { month: 'خرداد', direct: 450, referral: 310, growth: '+۲۲٪' },
    { month: 'تیر', direct: 520, referral: 390, growth: '+۱۵٪' },
    { month: 'مرداد', direct: 610, referral: 480, growth: '+۲۵٪' },
    { month: 'شهریور (جاری)', direct: 740, referral: 590, growth: '+۲۸.۴٪' },
  ]

  return (
    <DashboardAppShell activeMenu="reports">
      <div className="space-y-8">
        {/* ─── Header & Executive Action Banner ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF5F2] text-[#0D5C58] border border-[#0D5C58]/20">
                مرکز هوش کسب‌وکار حامی‌کارت (BI)
              </span>
              <span className="text-xs text-slate-400">تحلیل داده‌های یکپارچه سلامت و مالی</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">داشبورد جامع هوش مدیریتی و گزارشات</h1>
            <p className="text-sm text-slate-500 mt-1">
              پایش بلادرنگ شاخص‌های استراتژیک، پویایی گردش مالی سلامت، عملکرد نمایندگان و رفتار مراجعین
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-600">
              <button
                onClick={() => setSelectedTimeRange('30d')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedTimeRange === '30d' ? 'bg-white text-slate-900 shadow-xs font-black' : 'hover:text-slate-900'
                }`}
              >
                ۳۰ روزه
              </button>
              <button
                onClick={() => setSelectedTimeRange('90d')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedTimeRange === '90d' ? 'bg-white text-slate-900 shadow-xs font-black' : 'hover:text-slate-900'
                }`}
              >
                فصلی (۹۰ روز)
              </button>
              <button
                onClick={() => setSelectedTimeRange('1y')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedTimeRange === '1y' ? 'bg-white text-slate-900 shadow-xs font-black' : 'hover:text-slate-900'
                }`}
              >
                سالانه
              </button>
            </div>

            <Button
              variant="outline"
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold gap-1.5 h-10 px-3.5"
            >
              <Filter className="size-4 text-slate-500" />
              فیلترهای پیشرفته
            </Button>

            <Button
              className="rounded-xl bg-[#0D5C58] hover:bg-[#0a4845] text-white text-xs font-bold gap-1.5 h-10 px-4 shadow-sm"
            >
              <Download className="size-4" />
              خروجی گزارش مدیریتی
            </Button>
          </div>
        </div>

        {/* ─── بخش 1: Executive Overview (PremiumMetricCard Grid) ─── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-[#0D5C58]" />
              <h2 className="text-base font-extrabold text-slate-900">شاخص‌های کلیدی مدیریت اجرایی (Executive KPIs)</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">به‌روزرسانی لحظه‌ای بر مبنای تراکنش‌های شاپرک</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PremiumMetricCard
              title="درآمد کل شبکه سلامت"
              value="۲,۸۴۰,۰۰۰,۰۰۰ تومان"
              trend="۲۸.۴٪+"
              isUp={true}
              description="نسبت به ماه گذشته"
              variant="purple"
              icon={DollarSign}
            />
            <PremiumMetricCard
              title="رشد فروش اشتراک‌ها"
              value="۱,۴۲۰ صدور جدید"
              trend="۱۹.۲٪+"
              isUp={true}
              description="هدف دوره محقق شد"
              variant="green"
              icon={TrendingUp}
            />
            <PremiumMetricCard
              title="کاربران فعال کارت"
              value="۱۲,۸۴۰ نفر"
              trend="۱۱.۵٪+"
              isUp={true}
              description="دارای پوشش درمانی فعال"
              variant="blue"
              icon={Users}
            />
            <PremiumMetricCard
              title="مراجعات درمانی ثبت‌شده"
              value="۵,۷۱۰ پذیرش"
              trend="۱۴.۳٪+"
              isUp={true}
              description="در سراسر مراکز طرف قرارداد"
              variant="amber"
              icon={Building2}
            />
          </div>
        </div>

        {/* ─── بخش 2: Revenue Intelligence (Analytics & Trends) ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-[#1D68BD]" />
              <h2 className="text-base font-extrabold text-slate-900">تحلیل درآمد و پویایی گردش مالی (Revenue Intelligence)</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">تفکیک جریان درآمد مستقیم و کمیسیون ارجاعی</span>
          </div>

          {/* Area & Donut Charts */}
          <AnalyticsChartsBlock />

          {/* Revenue Breakdown Strip */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 text-sm">مقایسه ۶ ماهه رشد درآمد مستقیم و سهم شبکه ارجاع</h3>
              <span className="text-xs font-bold text-[#0D5C58] bg-[#EAF5F2] px-2.5 py-1 rounded-lg border border-[#0D5C58]/20">
                نرخ رشد مرکب ماهانه: +۱۸.۶٪
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {revenueComparison.map((item, idx) => (
                <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 block mb-1">{item.month}</span>
                    <span className="text-sm font-black text-slate-900 block">{item.direct + item.referral} م.ت</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-600 font-bold">{item.growth}</span>
                    <span className="text-slate-400">مستقیم: {item.direct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── بخش 3 & 4: Healthcare & Sales Intelligence Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Healthcare Intelligence: Top Centers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-[#EAF5F2] text-[#0D5C58] flex items-center justify-center">
                  <Hospital className="size-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">مراکز درمانی برتر و پرتراکنش</h3>
                  <p className="text-[11px] text-slate-400">برمبنای حجم پذیرش اعضای حامی‌کارت</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                پایش ۳۰ روز اخیر
              </Badge>
            </div>

            <div className="divide-y divide-slate-100">
              {topCenters.map((center, index) => (
                <div key={index} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-7 rounded-lg bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{center.name}</h4>
                      <p className="text-[11px] text-slate-400">{center.city} • تخفیف: {center.discount}</p>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-xs font-black text-slate-900 block">{center.visits} پذیرش</span>
                    <span className="text-[11px] font-semibold text-[#0D5C58]">{center.revenue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sales Intelligence: Top Agents Ranking */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-[#F5EEFD] text-[#7E38B7] flex items-center justify-center">
                  <Award className="size-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">رتبه‌بندی عملکرد نمایندگان فروش</h3>
                  <p className="text-[11px] text-slate-400">حجم اشتراک جذب‌شده و نرخ تبدیل لید</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                شبکه کشوری
              </Badge>
            </div>

            <div className="divide-y divide-slate-100">
              {topAgents.map((agent) => (
                <div key={agent.rank} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                        agent.rank === 1
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : agent.rank === 2
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      #{agent.rank}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{agent.name}</h4>
                      <p className="text-[11px] text-slate-400">{agent.province} • تبدیل: {agent.rate}</p>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-xs font-black text-slate-900 block">{agent.volume}</span>
                    <span className="text-[11px] font-semibold text-emerald-600">کمیسیون: {agent.commission}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── بخش 5: Report Center & Export Experience ─── */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">مرکز دریافت گزارشات اختصاصی (Report Center)</h3>
              <p className="text-xs text-slate-500">خروجی‌های تحلیلی استاندارد برای حسابرسی، مدیران ارشد و بیمه</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">فرمت‌های پشتیبانی‌شده: Excel، PDF، CSV</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Financial Report Card */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-3">
              <div>
                <div className="size-8 rounded-lg bg-[#EBF3FC] text-[#1D68BD] flex items-center justify-center mb-2.5">
                  <FileSpreadsheet className="size-4" />
                </div>
                <h4 className="font-bold text-slate-900 text-xs">گزارش مالی و تسویه شاپرک</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  تراز مالی دوره‌ای، کارمزدهای ارجاعی، تراکنش‌های مستقیم و گزارش تسویه حساب نمایندگان
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold rounded-lg border-slate-200 hover:bg-white text-slate-700 justify-between"
              >
                دریافت اکسل گزارش
                <Download className="size-3.5" />
              </Button>
            </div>

            {/* Healthcare Visits Report Card */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-3">
              <div>
                <div className="size-8 rounded-lg bg-[#EAF5F2] text-[#0D5C58] flex items-center justify-center mb-2.5">
                  <Stethoscope className="size-4" />
                </div>
                <h4 className="font-bold text-slate-900 text-xs">گزارش مراجعات و خدمات درمانی</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  تفکیک تخصصی خدمات ارائه‌شده، تعرفه‌های اعمال‌شده و سوابق پذیرش اعضا در مراکز
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold rounded-lg border-slate-200 hover:bg-white text-slate-700 justify-between"
              >
                دریافت اکسل گزارش
                <Download className="size-3.5" />
              </Button>
            </div>

            {/* Members & Growth Report Card */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-3">
              <div>
                <div className="size-8 rounded-lg bg-[#FEF7EA] text-[#B57314] flex items-center justify-center mb-2.5">
                  <Users className="size-4" />
                </div>
                <h4 className="font-bold text-slate-900 text-xs">گزارش جامع اعضا و تمدید اشتراک</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  آمار ثبت‌نام‌های جدید، نرخ ماندگاری کاربران، اشتراک‌های منقضی و پیش‌بینی تمدید
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold rounded-lg border-slate-200 hover:bg-white text-slate-700 justify-between"
              >
                دریافت اکسل گزارش
                <Download className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardAppShell>
  )
}
