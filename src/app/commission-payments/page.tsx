'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/guards/ProtectedRoute'
import { useAuthStore } from '@/stores/auth-store'
import { canPayCommissions } from '@/lib/commission-permissions'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

type Payment = { id: string; agentId: string; amount: number; createdAt: string }
type Queue = { items: Payment[]; total: number; page: number; limit: number }

function PaymentQueue() {
  const { user, logout } = useAuthStore()
  const allowed = canPayCommissions({ roles: user?.roles ?? [], permissions: user?.permissions ?? [] })
  const roles = user?.roles ?? []
  const home = roles.some(role => role === 'ADMIN' || role === 'SUPER_ADMIN') ? '/admin/dashboard'
    : roles.includes('DOCTOR') ? '/doctor/dashboard' : roles.includes('AGENT') ? '/agent/dashboard' : '/user/dashboard'
  const [page, setPage] = useState(1)
  const [queue, setQueue] = useState<Queue | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Payment | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setQueue(null)
    try {
      const data = await apiClient.request<Queue>('GET', `/commission-payments?page=${page}`)
      setQueue(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'دریافت صف پرداخت ناموفق بود')
    } finally { setLoading(false) }
  }, [page])
  useEffect(() => { if (allowed) void load() }, [allowed, load])

  async function pay() {
    if (!selected || busy || !allowed) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await apiClient.request('POST', `/commissions/${encodeURIComponent(selected.id)}/pay`, {})
      setSelected(null)
      await load()
      setNotice('پرداخت پورسانت در کیف پول ثبت شد.')
    } catch (cause) {
      setSelected(null)
      setError(cause instanceof Error ? cause.message : 'پرداخت ناموفق بود؛ پیش از تلاش مجدد وضعیت را بازخوانی کنید.')
    } finally { setBusy(false) }
  }

  return <main dir="rtl" className="mx-auto min-h-screen max-w-4xl space-y-6 p-4 md:p-8">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold">پرداخت پورسانت‌های تأییدشده</h1>
      <div className="flex gap-2"><Button asChild variant="outline"><Link href={home}>بازگشت به پنل</Link></Button>
        <Button variant="outline" onClick={() => void logout()}>خروج</Button></div>
    </header>
    <p className="text-sm text-muted-foreground">این بخش فقط برای پرداخت پورسانت‌های قبلاً تأییدشده است. تأیید، لغو و مدیریت عمومی در این صفحه انجام نمی‌شود.</p>
    {!allowed ? <p role="alert">دسترسی محدود: مجوز پرداخت پورسانت لازم است.</p> : <>
      {error && <p role="alert" className="rounded border border-destructive p-3">{error}</p>}
      {notice && <p role="status" className="rounded border p-3">{notice}</p>}
      <Button variant="outline" disabled={loading || busy} onClick={() => { setNotice(''); void load() }}>بازخوانی صف پرداخت</Button>
      {loading && <p role="status">در حال دریافت صف پرداخت…</p>}
      {queue && <>
        <p>تعداد قابل پرداخت: {queue.total.toLocaleString('fa-IR')}</p>
        {queue.items.length === 0 && <p>پورسانت تأییدشده‌ای برای پرداخت در این صفحه وجود ندارد.</p>}
        <ul className="space-y-3">{queue.items.map(item => <li key={item.id} className="space-y-2 rounded-lg border p-4">
          <p className="break-all text-sm">شناسه پورسانت: {item.id}</p>
          <p className="break-all text-sm">شناسه دریافت‌کننده: {item.agentId}</p>
          <p>مبلغ: {item.amount.toLocaleString('fa-IR')} تومان</p>
          <p>تاریخ ثبت: {new Date(item.createdAt).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' })}</p>
          <Button disabled={busy || loading} onClick={() => { setNotice(''); setSelected(item) }}>پرداخت این پورسانت</Button>
        </li>)}</ul>
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={page === 1 || loading || busy} onClick={() => { setSelected(null); setPage(page - 1) }}>صفحه قبل</Button>
          <span>{page.toLocaleString('fa-IR')}</span>
          <Button variant="outline" disabled={page * queue.limit >= queue.total || loading || busy} onClick={() => { setSelected(null); setPage(page + 1) }}>صفحه بعد</Button>
        </div>
      </>}
      {selected && <section role="region" aria-label="تأیید پرداخت" className="space-y-3 rounded-lg border p-4">
        <p className="break-all">پرداخت {selected.amount.toLocaleString('fa-IR')} تومان برای پورسانت {selected.id} را تأیید می‌کنید؟</p>
        <p className="text-sm">این اقدام مبلغ را به کیف پول دریافت‌کننده اضافه می‌کند.</p>
        <Button disabled={busy || loading} onClick={() => void pay()}>{busy ? 'در حال ثبت…' : 'تأیید و ثبت پرداخت'}</Button>{' '}
        <Button variant="outline" disabled={busy} onClick={() => setSelected(null)}>انصراف</Button>
      </section>}
    </>}
  </main>
}

export default function CommissionPaymentsPage() {
  return <ProtectedRoute><PaymentQueue /></ProtectedRoute>
}
