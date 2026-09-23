'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Briefcase,
  TrendingUp,
  Users,
  DollarSign,
  Search,
  Filter,
  Sparkles,
  MapPin,
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Download,
  CreditCard,
  Building,
  UserCheck,
  Plus
} from 'lucide-react'
import { toPersianNum } from '@/utils/formatters'

import { DashboardAppShell } from '@/components/shared/dashboard-app-shell'
import { PremiumMetricCard } from '@/components/shared/premium-metric-card'

interface AgentMock {
  id: string
  name: string
  branch: string
  location: string
  activeClientsCount: number
  totalSalesVolume: string
  totalCommissionPaid: string
  rank: string
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  statusLabel: string
  lastSale: string
  avatarInitial: string
}

interface SaleActivityMock {
  id: string
  clientName: string
  clientMobile: string
  planName: string
  agentName: string
  amount: string
  commission: string
  status: 'PAID' | 'PENDING' | 'REJECTED'
  statusLabel: string
  time: string
}

export default function AgentsPremiumPreviewPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const agents: AgentMock[] = [
    {
      id: 'AG-201',
      name: 'پیمان حسینی',
      branch: 'شعبه مرکزی غرب تهران',
      location: 'تهران، صادقیه',
      activeClientsCount: 342,
      totalSalesVolume: '۳۸۰,۰۰۰,۰۰۰ تومان',
      totalCommissionPaid: '۵۷,۰۰۰,۰۰۰ تومان',
      rank: 'رتبه ۱ فروش (VIP)',
      status: 'ACTIVE',
      statusLabel: 'فعال و تاییدشده',
      lastSale: '۱۵ دقیقه پیش',
      avatarInitial: 'پ'
    },
    {
      id: 'AG-202',
      name: 'الهام سلیمی',
      branch: 'نمایندگی منطقه سعادت‌آباد',
      location: 'تهران، سعادت‌آباد',
      activeClientsCount: 285,
      totalSalesVolume: '۳۱۰,۰۰۰,۰۰۰ تومان',
      totalCommissionPaid: '۴۶,۵۰۰,۰۰۰ تومان',
      rank: 'رتبه ۲ فروش',
      status: 'ACTIVE',
      statusLabel: 'فعال و تاییدشده',
      lastSale: '۲ ساعت پیش',
      avatarInitial: 'ا'
    },
    {
      id: 'AG-203',
      name: 'شرکت خدمات نوین مهر',
      branch: 'نمایندگی حقوقی و سازمانی',
      location: 'تهران، مطهری',
      activeClientsCount: 520,
      totalSalesVolume: '۵۴۰,۰۰۰,۰۰۰ تومان',
      totalCommissionPaid: '۸۱,۰۰۰,۰۰۰ تومان',
      rank: 'نماینده طلایی سازمانی',
      status: 'ACTIVE',
      statusLabel: 'قرارداد کلان',
      lastSale: 'امروز ۱۱:۰۰',
      avatarInitial: 'ش'
    },
    {
      id: 'AG-204',
      name: 'فرهاد بهرامی',
      branch: 'دفتر نمایندگی شرق',
      location: 'تهران، تهرانپارس',
      activeClientsCount: 64,
      totalSalesVolume: '۵۸,۰۰۰,۰۰۰ تومان',
      totalCommissionPaid: '۸,۷۰۰,۰۰۰ تومان',
      rank: 'همکار در حال توسعه',
      status: 'PENDING',
      statusLabel: 'در صف احراز مدارک',
      lastSale: '۳ روز پیش',
      avatarInitial: 'ف'
    },
  ]

  const recentSales: SaleActivityMock[] = [
    {
      id: 'TX-901',
      clientName: 'سارا میرزایی',
      clientMobile: '۰۹۱۲***۸۸۱۱',
      planName: 'طرح طلایی یک‌ساله',
      agentName: 'پیمان حسینی',
      amount: '۲,۵۰۰,۰۰۰ تومان',
      commission: '۳۷۵,۰۰۰ تومان',
      status: 'PAID',
      statusLabel: 'تسویه موفق',
      time: '۱۵ دقیقه پیش'
    },
    {
      id: 'TX-902',
      clientName: 'حمیدرضا کیانی',
      clientMobile: '۰۹۱۹***۴۴۲۲',
      planName: 'طرح نقره‌ای خانواده',
      agentName: 'الهام سلیمی',
      amount: '۱,۸۰۰,۰۰۰ تومان',
      commission: '۲۷۰,۰۰۰ تومان',
      status: 'PAID',
      statusLabel: 'تسویه موفق',
      time: '۱ ساعت پیش'
    },
    {
      id: 'TX-903',
      clientName: 'نیلوفر امینی',
      clientMobile: '۰۹۳۵***۱۱۹۹',
      planName: 'طرح دندانپزشکی انفرادی',
      agentName: 'شرکت خدمات نوین مهر',
      amount: '۱,۲۰۰,۰۰۰ تومان',
      commission: '۱۸۰,۰۰۰ تومان',
      status: 'PENDING',
      statusLabel: 'در انتظار تایید شاپرک',
      time: '۳ ساعت پیش'
    },
  ]

  const filteredAgents = agents.filter((a) => {
    const matchSearch = a.name.includes(searchQuery) || a.branch.includes(searchQuery) || a.location.includes(searchQuery)
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <DashboardAppShell activeMenu="agents">
      <div className="space-y-8">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/70 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                مرکز رشد و مدیریت شبکه نمایندگان فروش
              </h1>
              <Badge variant="premium">
                <Sparkles className="size-3.5 text-primary" />
                <span>Sales Network Intelligence v2</span>
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              پایش لحظه‌ای عملکرد فروش، مدیریت خطوط کمیسیون، تسویه‌های مالی و جذب نمایندگان حقوقی و حقیقی
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs font-bold text-slate-700">
              <Download className="size-4" />
              <span>خروجی مالی کمیسیون</span>
            </Button>
            <Button variant="premium" size="sm" className="hidden sm:inline-flex gap-2 rounded-xl text-xs font-bold shadow-xs">
              <Plus className="size-4" />
              <span>ثبت قرارداد نماینده جدید</span>
            </Button>
          </div>
        </div>

        {/* Floating Action Button for Mobile (<640px) */}
        <div className="fixed bottom-6 end-6 z-40 sm:hidden">
          <Button
            variant="premium"
            size="lg"
            className="rounded-full shadow-xl text-xs font-bold gap-2 px-5 py-3 h-12 bg-[#0D5C58] hover:bg-[#0a4845] text-white flex items-center border border-white/20"
          >
            <Plus className="size-5" />
            <span>ثبت نماینده جدید</span>
          </Button>
        </div>

        {/* ─── KPI Section ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full">
          <PremiumMetricCard
            title="نمایندگان و همکاران فعال"
            value="۸۶"
            trend="+۵ همکار در ماه جاری"
            isUp={true}
            icon={Briefcase}
            variant="blue"
            badge="شبکه فروش"
          />
          <PremiumMetricCard
            title="حجم فروش موفق کل"
            value="۱,۴۲۰M"
            unit="تومان"
            trend="↑ ۲۴.۸٪ رشد فصلی"
            isUp={true}
            icon={TrendingUp}
            variant="green"
            badge="جریان درآمدی"
          />
          <PremiumMetricCard
            title="مشتریان معرفی‌شده فعال"
            value="۱,۷۴۰"
            trend="۸۲٪ تبدیل به اشتراک"
            isUp={true}
            icon={Users}
            variant="amber"
            badge="تبدیل لید"
          />
          <PremiumMetricCard
            title="کمیسیون پرداختی شاپرک"
            value="۲۱۸.۵M"
            unit="تومان"
            description="تسویه خودکار هفتگی"
            icon={DollarSign}
            variant="purple"
            badge="تسویه‌شده"
          />
        </div>

      {/* ─── Filter & Search ─── */}
      <Card variant="glass">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Input
              placeholder="جستجو بر اساس نام نماینده، شعبه یا منطقه..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pe-10 bg-background/80 rounded-xl border-border/60"
            />
            <Search className="size-4 text-muted-foreground absolute end-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex rounded-xl bg-muted/60 p-1 border border-border/40 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
            >
              همه نمایندگان
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'ACTIVE' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
            >
              فعال
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'PENDING' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
            >
              در انتظار تایید
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Agent Performance Showcase Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} variant="premium" className="group hover:border-primary/40 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-gradient-to-br from-primary/20 to-teal-500/10 text-primary font-extrabold text-lg flex items-center justify-center border border-primary/20 shadow-xs">
                    {agent.avatarInitial}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{agent.branch}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  {agent.status === 'ACTIVE' && <Badge variant="success">همکار تاییدشده</Badge>}
                  {agent.status === 'PENDING' && <Badge variant="warning">در صف احراز</Badge>}
                  <Badge variant="outline" className="text-[11px] font-normal border-primary/30 text-primary bg-primary/5">
                    {agent.rank}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/40 text-xs">
                <div>
                  <p className="text-muted-foreground">مشتریان جذب‌شده:</p>
                  <p className="font-bold text-foreground mt-0.5 text-sm">{toPersianNum(agent.activeClientsCount)} نفر</p>
                </div>
                <div>
                  <p className="text-muted-foreground">مجموع حجم فروش:</p>
                  <p className="font-bold text-foreground mt-0.5 text-sm">{agent.totalSalesVolume}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">کمیسیون تسویه‌شده:</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 text-sm">{agent.totalCommissionPaid}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">آخرین فعالیت ثبت‌شده:</p>
                  <p className="font-semibold text-foreground mt-0.5">{agent.lastSale}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-xs font-mono text-muted-foreground">{agent.id}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                    ریز عملکرد
                  </Button>
                  <Button variant="premium" size="sm" className="h-8 px-3 text-xs">
                    مدیریت مالی و تسویه
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Sales Activity Table ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            <span>آخرین تراکنش‌ها و فروش‌های ارجاعی نمایندگان</span>
          </h2>
          <span className="text-xs text-muted-foreground">اتصال لحظه‌ای به درگاه</span>
        </div>

        <Card variant="default" className="overflow-hidden border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 text-xs font-bold text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-4 px-6">مشتری ارجاعی</th>
                  <th className="py-4 px-4">طرح انتخابی</th>
                  <th className="py-4 px-4">نماینده معرف</th>
                  <th className="py-4 px-4">مبلغ تراکنش</th>
                  <th className="py-4 px-4">سهم کمیسیون</th>
                  <th className="py-4 px-4">وضعیت تسویه</th>
                  <th className="py-4 px-6 text-center">زمان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-foreground">{sale.clientName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{sale.clientMobile}</div>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-foreground">
                      {sale.planName}
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-muted-foreground">
                      {sale.agentName}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold font-mono text-foreground">
                      {sale.amount}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {sale.commission}
                    </td>
                    <td className="py-4 px-4">
                      {sale.status === 'PAID' ? (
                        <Badge variant="success">تسویه خودکار</Badge>
                      ) : (
                        <Badge variant="warning">در انتظار شاپرک</Badge>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs text-muted-foreground text-center font-mono">
                      {sale.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      </div>
    </DashboardAppShell>
  )
}
