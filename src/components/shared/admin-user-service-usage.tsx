'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { getReportErrorMessage } from '@/lib/report-client'
import { getRecentReportDateRange } from '@/utils/report-date-range'
import { JalaliIsoDateRangeFilter } from './jalali-iso-date-range-filter'
import { Button } from '@/components/ui/button'

interface Usage {
  registeredServices: number; completedServices: number; distinctDoctors: number
  byDoctor: { id: string; name: string; specialty: string; completedServices: number }[]
}

export function AdminUserServiceUsage({ userId }: { userId: string }) {
  const [range, setRange] = useState(() => getRecentReportDateRange())
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true); setError(null); setUsage(null)
    try {
      const result = await apiClient.request<{ visits: { serviceUsage: Usage } }>('GET', `/admin/users/${encodeURIComponent(userId)}/profile-summary?${new URLSearchParams(range)}`)
      if (!result.visits?.serviceUsage || !Array.isArray(result.visits.serviceUsage.byDoctor)) throw new Error('پاسخ آمار مصرف معتبر نیست.')
      if (id === requestId.current) setUsage(result.visits.serviceUsage)
    } catch (error) { if (id === requestId.current) setError(getReportErrorMessage(error)) }
    finally { if (id === requestId.current) setLoading(false) }
  }, [userId, range])
  useEffect(() => { void load(); return () => { requestId.current++ } }, [load])
  return <section aria-label="آمار استفاده کاربر" className="space-y-3 border-t pt-4">
    <h3 className="font-bold">آمار استفاده از خدمات پزشکان</h3>
    <JalaliIsoDateRangeFilter {...range} onChange={setRange} />
    <p className="text-xs leading-6 text-muted-foreground">بازه بر اساس روز کامل تهران و تاریخ تکمیل خدمت است؛ در نبود آن، تاریخ ویزیت یا ثبت ملاک است. فقط خدمات تکمیل‌شده استفادهٔ قطعی محسوب می‌شوند.</p>
    {loading ? <p role="status">در حال دریافت آمار…</p> : error ? <div role="alert" className="space-y-2 text-red-700"><p>{error}</p><Button type="button" variant="outline" onClick={() => void load()}>تلاش مجدد</Button></div> : usage ? <>
      <dl className="grid grid-cols-1 gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-3">{[
        ['خدمات ثبت‌شده', usage.registeredServices], ['خدمات تکمیل‌شده', usage.completedServices], ['پزشکان استفاده‌شده', usage.distinctDoctors],
      ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-bold">{Number(value).toLocaleString('fa-IR')}</dd></div>)}</dl>
      {usage.byDoctor.length ? <ul className="space-y-2">{usage.byDoctor.map(row => <li key={row.id} className="flex flex-wrap justify-between gap-2 rounded-lg border p-2"><span>{row.name} · {row.specialty}</span><span>{row.completedServices.toLocaleString('fa-IR')} خدمت تکمیل‌شده</span></li>)}</ul> : <p className="text-muted-foreground">در این بازه استفادهٔ تکمیل‌شده‌ای ثبت نشده است.</p>}
    </> : null}
  </section>
}
