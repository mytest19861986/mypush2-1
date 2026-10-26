'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { getReportErrorMessage } from '@/lib/report-client'
import { getRecentReportDateRange } from '@/utils/report-date-range'
import { DashboardAppShell } from './dashboard-app-shell'
import { JalaliIsoDateRangeFilter } from './jalali-iso-date-range-filter'
import { Button } from '@/components/ui/button'

interface AgentReport {
  agent: { id: string; name: string; businessName: string | null; status: string }
  referral: { code: string | null; link: string | null }
  range: { from: string; to: string }
  customerStats: { registeredCustomersCount: number; paidCustomersCount: number; finalConfirmedCustomersCount: number; returnedCustomersCount: number }
  commissionStats: { totalCommissionAmount: number; pendingCommissionAmount: number; approvedCommissionAmount: number; approvedWithdrawableCommissionAmount: number; paidCommissionAmount: number }
  settlementStats: { openSettlementAmount: number; paidSettlementAmount: number }
  customerRecords: { id: string; firstName: string | null; lastName: string | null; status: string; createdAt: string; paidAt: string | null; confirmedAt: string | null; returnedAt: string | null; plan: { name: string } }[]
  commissionRecords: { key: string; amount: number; percent: number; status: string; createdAt: string; paidAt: string | null; plan: { name: string }; salesCustomer: { firstName: string | null; lastName: string | null } | null }[]
  settlementRecords: { key: string; amount: number; status: string; requestedAt: string; settledAt: string | null }[]
}
const statuses: Record<string, string> = { ACTIVE: 'فعال', APPROVED: 'تأییدشده', PENDING: 'در انتظار', REJECTED: 'ردشده', SUSPENDED: 'تعلیق', PENDING_REVIEW: 'در انتظار بررسی', CARD_ISSUED: 'کارت صادرشده', SHIPPED: 'ارسال‌شده', DELIVERED: 'تحویل‌شده', PAID: 'پرداخت‌شده', CONFIRMED: 'تأیید نهایی', RETURNED: 'مرجوع‌شده', CANCELLED: 'لغوشده' }
const dateFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', dateStyle: 'short', timeStyle: 'short' })
const date = (value: string | null) => value ? dateFormat.format(new Date(value)) : '—'
const number = (value: number) => value.toLocaleString('fa-IR')
function Records({ title, columns, rows }: { title: string; columns: string[]; rows: { key: string; cells: string[] }[] }) {
  return <section className="min-w-0 space-y-3 rounded-2xl border bg-white p-4"><h2 className="font-bold">{title}</h2><p className="text-xs text-muted-foreground">حداکثر ۲۵ مورد اخیر در بازهٔ انتخابی؛ کارت‌های آماری بر اساس تمام رکوردهای بازه محاسبه می‌شوند.</p>{rows.length ? <div className="max-w-full overflow-x-auto"><table className="w-full min-w-[600px] text-right text-xs"><thead><tr>{columns.map(column => <th key={column} className="border-b p-3">{column}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.key}>{row.cells.map((cell, index) => <td key={index} className="border-b p-3 align-top">{cell}</td>)}</tr>)}</tbody></table></div> : <p className="py-6 text-center text-sm text-muted-foreground">در این بازه رکوردی ثبت نشده است.</p>}</section>
}
export function AdminAgentScopedReport({ agentId, financial = false }: { agentId: string; financial?: boolean }) {
  const [range, setRange] = useState(() => getRecentReportDateRange())
  const [report, setReport] = useState<AgentReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copyNotice, setCopyNotice] = useState('')
  const requestId = useRef(0)
  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true); setReport(null); setError(null); setCopyNotice('')
    try {
      const result = await apiClient.request<AgentReport>('GET', `/admin/agents/${encodeURIComponent(agentId)}/performance?${new URLSearchParams(range)}`)
      if (result.agent?.id !== agentId || !Array.isArray(result.customerRecords)) throw new Error('شناسه یا ساختار گزارش معتبر نیست.')
      if (result.referral.link) result.referral.link = new URL(result.referral.link, window.location.origin).href
      if (id === requestId.current) setReport(result)
    } catch (error) { if (id === requestId.current) setError(getReportErrorMessage(error)) }
    finally { if (id === requestId.current) setLoading(false) }
  }, [agentId, range])
  useEffect(() => { void load(); return () => { requestId.current++ } }, [load])
  const cards: [string, number][] = report ? financial ? [
    ['پورسانت بازه (بدون لغوشده)', report.commissionStats.totalCommissionAmount],
    ['پورسانت در انتظار بازه', report.commissionStats.pendingCommissionAmount],
    ['پورسانت تأییدشده بازه', report.commissionStats.approvedCommissionAmount],
    ['پورسانت پرداخت‌شده بازه', report.commissionStats.paidCommissionAmount],
    ['مانده قابل برداشت — تمام دوره‌ها', report.commissionStats.approvedWithdrawableCommissionAmount],
    ['تسویه باز — تمام دوره‌ها', report.settlementStats.openSettlementAmount],
    ['تسویه پرداخت‌شده — تمام دوره‌ها', report.settlementStats.paidSettlementAmount],
  ] : [
    ['مشتریان ثبت‌شده در بازه', report.customerStats.registeredCustomersCount],
    ['پرداخت مشتریان در بازه', report.customerStats.paidCustomersCount],
    ['تأیید نهایی در بازه', report.customerStats.finalConfirmedCustomersCount],
    ['مرجوع‌شده در بازه', report.customerStats.returnedCustomersCount],
  ] : []
  return <DashboardAppShell activeMenu="agents"><div dir="rtl" className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-extrabold">{financial ? 'مدیریت مالی و تسویه همکار فروش' : 'ریز عملکرد همکار فروش'}</h1><Link href="/admin/agents" className="text-sm font-bold text-teal-700">بازگشت به همکاران فروش</Link></div>
    <nav aria-label="گزارش‌های همکار فروش" className="flex flex-wrap gap-4 text-sm"><Link href={`/admin/agents/${encodeURIComponent(agentId)}`}>ریز عملکرد</Link><Link href={`/admin/agents/${encodeURIComponent(agentId)}/financial`}>مالی و تسویه همین همکار</Link></nav>
    <JalaliIsoDateRangeFilter {...range} onChange={setRange} />
    {loading ? <p role="status">در حال دریافت اطلاعات همین همکار…</p> : error ? <div role="alert" className="space-y-3 text-red-700"><p>{error}</p><Button type="button" variant="outline" onClick={() => void load()}>تلاش مجدد</Button></div> : report ? <>
      <section className="space-y-3 rounded-2xl border bg-white p-4"><h2 className="font-bold">{report.agent.name}</h2><p className="text-sm">{report.agent.businessName || 'نام کسب‌وکار ثبت نشده'} · {statuses[report.agent.status] || report.agent.status}</p>
        {report.referral.link ? <><label htmlFor="agent-referral-link" className="block text-sm font-semibold">لینک معرفی این همکار</label><input id="agent-referral-link" readOnly dir="ltr" value={report.referral.link} className="w-full min-w-0 rounded-lg border p-2 text-xs" /><Button type="button" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(report.referral.link!); setCopyNotice('لینک کپی شد.') } catch { setCopyNotice('کپی خودکار انجام نشد؛ لینک را از کادر انتخاب کنید.') } }}>کپی لینک معرفی</Button><p role="status" className="text-xs">{copyNotice}</p><p className="text-xs leading-6 text-muted-foreground">ثبت انتساب و پورسانت طبق قواعد فعلی پرداخت سامانه انجام می‌شود؛ نمایش لینک به‌تنهایی موجب ایجاد یا پرداخت پورسانت نیست.</p></> : <p className="text-sm text-muted-foreground">لینک معرفی برای همکار تأییدشده با حساب فعال در دسترس است.</p>}
      </section>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-bold">{number(value)}{financial ? ' تومان' : ''}</p></div>)}</div>
      {financial ? <>
        <p className="text-xs leading-6 text-muted-foreground">مانده و تسویه‌های کلی مربوط به همین همکار و تمام دوره‌ها هستند. جدول‌های زیر بر اساس تاریخ ایجاد پورسانت و تاریخ درخواست تسویه فیلتر می‌شوند. این صفحه عملیات پرداخت بانکی انجام نمی‌دهد.</p>
        <Records title="پورسانت‌های همین همکار" columns={['طرح', 'مشتری', 'مبلغ (تومان)', 'درصد', 'وضعیت', 'تاریخ ثبت', 'تاریخ پرداخت']} rows={report.commissionRecords.map(row => ({ key: row.key, cells: [row.plan.name, [row.salesCustomer?.firstName, row.salesCustomer?.lastName].filter(Boolean).join(' ') || '—', number(row.amount), number(row.percent), statuses[row.status] || row.status, date(row.createdAt), date(row.paidAt)] }))} />
        <Records title="درخواست‌های تسویه همین همکار" columns={['مبلغ (تومان)', 'وضعیت', 'تاریخ درخواست', 'تاریخ تسویه']} rows={report.settlementRecords.map(row => ({ key: row.key, cells: [number(row.amount), statuses[row.status] || row.status, date(row.requestedAt), date(row.settledAt)] }))} />
      </> : <Records title="مشتریان همین همکار" columns={['نام مشتری', 'طرح', 'وضعیت', 'تاریخ ثبت', 'پرداخت', 'تأیید', 'مرجوعی']} rows={report.customerRecords.map(row => ({ key: row.id, cells: [[row.firstName, row.lastName].filter(Boolean).join(' ') || 'نام ثبت نشده', row.plan.name, statuses[row.status] || row.status, date(row.createdAt), date(row.paidAt), date(row.confirmedAt), date(row.returnedAt)] }))} />}
    </> : null}
  </div></DashboardAppShell>
}
