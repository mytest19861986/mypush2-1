'use client'

import React from 'react'
import Link from 'next/link'
import { Users, Building2, FileCheck2, Wallet } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { getReportErrorMessage } from '@/lib/report-client'
import { getRecentReportDateRange } from '@/utils/report-date-range'
import { PremiumMetricCard } from './premium-metric-card'
import { AnalyticsChartsBlock, type DailyRevenueItem, type ChannelItem } from './analytics-charts-block'
import { Button } from '@/components/ui/button'

interface RecentItem { id: string; name: string; status: string; createdAt: string }
interface Summary {
  activeAccounts: number; approvedDoctors: number; pendingApplications: number
  pendingDoctors: number; pendingAgents: number; recentDoctors: RecentItem[]; recentUsers: RecentItem[]; computedAt: string
}
interface FinancialReport {
  grossRevenue: number; dailyRevenue: DailyRevenueItem[]; channelBreakdown: ChannelItem[]
  range: { from: string; to: string }
}
const date = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', dateStyle: 'short' })
const statusLabels: Record<string, string> = { ACTIVE: 'فعال', APPROVED: 'تأییدشده', PENDING: 'در انتظار', INACTIVE: 'غیرفعال', BLOCKED: 'مسدود', REJECTED: 'ردشده', SUSPENDED: 'تعلیق' }
const number = (value?: number) => value === undefined ? '—' : value.toLocaleString('fa-IR')

function ErrorNotice({ error, retry }: { error: string | null; retry: () => void }) {
  return error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><Button type="button" variant="outline" size="sm" onClick={retry}>تلاش مجدد</Button></div> : null
}

function RecentList({ title, href, rows }: { title: string; href: string; rows: RecentItem[] }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-2"><h3 className="font-extrabold text-slate-800">{title}</h3><Link href={href} className="text-xs font-bold text-teal-700">مشاهده همه</Link></div>
    {!rows.length ? <p className="py-5 text-center text-sm text-slate-500">هنوز موردی ثبت نشده است.</p> : <div className="space-y-2">{rows.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-xs"><span className="min-w-0 break-words font-semibold text-slate-700">{row.name}</span><span className="text-slate-500">{statusLabels[row.status] || 'نامشخص'} · {date.format(new Date(row.createdAt))}</span></article>)}</div>}
  </section>
}

export function AdminDashboardData({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = React.useState<Summary | null>(null)
  const [financial, setFinancial] = React.useState<FinancialReport | null>(null)
  const [summaryError, setSummaryError] = React.useState<string | null>(null)
  const [financialError, setFinancialError] = React.useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = React.useState(true)
  const [financialLoading, setFinancialLoading] = React.useState(true)
  const summaryRequest = React.useRef(0)
  const financialRequest = React.useRef(0)
  const loadSummary = React.useCallback(async () => {
    const id = ++summaryRequest.current
    setSummaryLoading(true); setSummaryError(null)
    try {
      const result = await apiClient.request<Summary>('GET', '/admin/dashboard-summary')
      if (typeof result.activeAccounts !== 'number' || !Array.isArray(result.recentUsers)) throw new Error('پاسخ آمار معتبر نیست.')
      if (id === summaryRequest.current) setSummary(result)
    } catch (error) {
      if (id === summaryRequest.current) { setSummary(null); setSummaryError(getReportErrorMessage(error)) }
    } finally { if (id === summaryRequest.current) setSummaryLoading(false) }
  }, [])
  const loadFinancial = React.useCallback(async () => {
    const id = ++financialRequest.current
    setFinancialLoading(true); setFinancialError(null)
    const range = getRecentReportDateRange()
    try {
      // Reuse the existing financial report and its existing business definitions.
      const result = await apiClient.request<FinancialReport>('GET', `/admin/financial-reports?from=${range.from}&to=${range.to}`)
      if (typeof result.grossRevenue !== 'number' || !Array.isArray(result.dailyRevenue)) throw new Error('پاسخ گزارش مالی معتبر نیست.')
      if (id === financialRequest.current) setFinancial(result)
    } catch (error) {
      if (id === financialRequest.current) { setFinancial(null); setFinancialError(getReportErrorMessage(error)) }
    } finally { if (id === financialRequest.current) setFinancialLoading(false) }
  }, [])
  React.useEffect(() => {
    void loadSummary(); void loadFinancial()
    return () => { summaryRequest.current++; financialRequest.current++ }
  }, [loadSummary, loadFinancial])
  const revenue = financial?.grossRevenue
  const revenueLabel = revenue === undefined ? '—' : revenue >= 1000000
    ? `${(revenue / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیون`
    : number(revenue)
  return <>
    <ErrorNotice error={summaryError} retry={() => void loadSummary()} />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <PremiumMetricCard title="حساب‌های فعال" value={summaryLoading ? '…' : number(summary?.activeAccounts)} icon={Users} variant="green" badge={summary ? 'داده واقعی' : 'دریافت نشده'} description="همهٔ نقش‌ها؛ حساب‌های فعال و حذف‌نشده" />
      <PremiumMetricCard title="پزشکان و مراکز تأییدشده" value={summaryLoading ? '…' : number(summary?.approvedDoctors)} icon={Building2} variant="blue" badge={summary ? 'داده واقعی' : 'دریافت نشده'} />
      <PremiumMetricCard title="درخواست عضویت در انتظار" value={summaryLoading ? '…' : number(summary?.pendingApplications)} icon={FileCheck2} variant="amber" badge={summary ? 'داده واقعی' : 'دریافت نشده'} description={summary ? `${number(summary.pendingDoctors)} پزشک و ${number(summary.pendingAgents)} همکار فروش` : 'پزشکان و همکاران فروش'} />
      <PremiumMetricCard title="فروش موفق ۳۰ روز اخیر (تومان)" value={financialLoading ? '…' : revenueLabel} icon={Wallet} variant="purple" badge={financial ? 'داده واقعی' : 'دریافت نشده'} description={revenue === undefined ? 'منبع: گزارش مالی موجود' : `${number(revenue)} تومان؛ مبلغ دقیق`} />
    </div>
    {children}
    <ErrorNotice error={financialError} retry={() => void loadFinancial()} />
    {financialLoading && <p role="status" className="py-5 text-center text-sm text-slate-500">در حال دریافت نمودارهای مالی…</p>}
    {!financialLoading && financial && <AnalyticsChartsBlock dailyRevenue={financial.dailyRevenue} channelBreakdown={financial.channelBreakdown} totalRevenue={financial.grossRevenue} timeRangeLabel={`${date.format(new Date(`${financial.range.from}T12:00:00Z`))} تا ${date.format(new Date(`${financial.range.to}T12:00:00Z`))}`} />}
    {summaryLoading && <p role="status" className="py-5 text-center text-sm text-slate-500">در حال دریافت تازه‌ترین ثبت‌ها…</p>}
    {!summaryLoading && summary && <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2"><RecentList title="تازه‌ترین پزشکان و مراکز" href="/admin/doctors" rows={summary.recentDoctors} /><RecentList title="تازه‌ترین کاربران" href="/admin/users" rows={summary.recentUsers} /></div>}
  </>
}
