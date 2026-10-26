'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { getReportErrorMessage } from '@/lib/report-client'
import { Button } from '@/components/ui/button'

interface Commission {
  id: string; amount: number; percent: number; status: string; createdAt: string
  agent: { profile: { firstName: string | null; lastName: string | null } | null; agent: { businessName: string | null } | null }
  userPlan: { plan: { name: string }; salesCustomer: { firstName: string | null; lastName: string | null } | null; user: { profile: { firstName: string | null; lastName: string | null } | null } | null }
}
const statuses: Record<string, string> = { PENDING: 'در انتظار تأیید', APPROVED: 'تأییدشده', PAID: 'پرداخت‌شده', CANCELLED: 'لغوشده' }
const formatDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', dateStyle: 'short', timeStyle: 'short' })
const fullName = (profile?: { firstName: string | null; lastName: string | null } | null) => [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
export function AdminAgentRecentCommissions() {
  const [rows, setRows] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const result = await apiClient.request<Commission[]>('GET', '/commissions?sourceType=SALES_PARTNER&limit=5')
      if (!Array.isArray(result)) throw new Error('پاسخ پورسانت‌ها معتبر نیست.')
      setRows(result)
    } catch (error) { setRows([]); setError(getReportErrorMessage(error)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  return <section className="min-w-0 space-y-3 rounded-2xl border bg-white p-4">
    <h2 className="font-bold">آخرین پورسانت‌های همکاران فروش</h2><p className="text-xs text-muted-foreground">۵ رکورد آخر واقعی؛ این جدول وضعیت پورسانت را نشان می‌دهد. جزئیات درخواست‌های تسویه در صفحهٔ همان همکار است.</p>
    {loading ? <p role="status">در حال دریافت پورسانت‌ها…</p> : error ? <div role="alert" className="space-y-2 text-sm text-red-700"><p>{error}</p><Button type="button" variant="outline" onClick={() => void load()}>تلاش مجدد</Button></div> : rows.length ? <div className="max-w-full overflow-x-auto"><table className="w-full min-w-[650px] text-right text-xs"><thead><tr>{['همکار فروش', 'مشتری', 'طرح', 'پورسانت (تومان)', 'درصد', 'وضعیت', 'تاریخ'].map(label => <th key={label} className="border-b p-3">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>{[
      fullName(row.agent.profile) || row.agent.agent?.businessName || 'همکار فروش',
      fullName(row.userPlan.salesCustomer) || fullName(row.userPlan.user?.profile) || 'نام ثبت نشده', row.userPlan.plan.name,
      row.amount.toLocaleString('fa-IR'), row.percent.toLocaleString('fa-IR'), statuses[row.status] || row.status, formatDate.format(new Date(row.createdAt)),
    ].map((value, index) => <td key={index} className="border-b p-3">{value}</td>)}</tr>)}</tbody></table></div> : <p className="py-6 text-center text-sm text-muted-foreground">هنوز پورسانتی برای همکاران فروش ثبت نشده است.</p>}
  </section>
}
