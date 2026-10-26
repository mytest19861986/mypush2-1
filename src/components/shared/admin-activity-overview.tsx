'use client'

import React from 'react'
import { Activity, PhoneIncoming, PhoneOutgoing, Plus, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { getReportErrorMessage } from '@/lib/report-client'
import { callDirections, callTopics, callOutcomes, callFollowUpStatuses, type CreateCallLogInput } from '@/lib/call-log-contract'
import { getDashboardPeriodRange, getRecentReportDateRange, parseReportDateRange } from '@/utils/report-date-range'
import { gregorianDateToJalaliParts, jalaliDatePartsToIsoDate } from '@/utils/jalali-date'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { JalaliDateFields } from './jalali-date-range-filter'

type Period = 'today' | 'week'
interface CallItem {
  id: string; occurredAt: string; direction: keyof typeof callDirections; topic: keyof typeof callTopics
  outcome: keyof typeof callOutcomes; followUpStatus: keyof typeof callFollowUpStatuses
  followUpAt: string | null; note: string | null; subjectName: string | null; recordedByName: string
}
interface EventItem { id: string; action: string; entity: string | null; createdAt: string }
interface SubjectItem { id: string; name: string; kind: string }
const dateTime = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', dateStyle: 'short', timeStyle: 'short' })

function useRows<T>(path: string, revision: number) {
  const [rows, setRows] = React.useState<T[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const requestId = React.useRef(0)
  const load = React.useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await apiClient.request<T[]>('GET', path)
      if (!Array.isArray(result)) throw new Error('ساختار پاسخ سرور معتبر نیست.')
      if (id === requestId.current) setRows(result)
    } catch (failure) {
      if (id === requestId.current) { setRows([]); setError(getReportErrorMessage(failure)) }
    } finally { if (id === requestId.current) setLoading(false) }
  }, [path, revision])
  React.useEffect(() => { void load(); return () => { requestId.current++ } }, [load])
  return { rows, loading, error, load }
}

function PeriodButtons({ period, onChange, label }: { period: Period; onChange: (period: Period) => void; label: string }) {
  return <div className="flex gap-1" aria-label={label}>
    {(['today', 'week'] as const).map(value => <Button key={value} type="button" size="sm" variant={period === value ? 'default' : 'outline'} aria-pressed={period === value} onClick={() => onChange(value)}>{value === 'today' ? 'امروز' : 'این هفته'}</Button>)}
  </div>
}

function FeedState({ loading, error, empty, onRetry }: { loading: boolean; error: string | null; empty: boolean; onRetry: () => void }) {
  if (loading) return <p role="status" className="py-5 text-center text-sm text-slate-500">در حال دریافت اطلاعات…</p>
  if (error) return <div role="alert" className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><p>{error}</p><Button type="button" variant="outline" size="sm" onClick={onRetry}>تلاش مجدد</Button></div>
  if (empty) return <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">در این بازه موردی ثبت نشده است.</p>
  return null
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: Record<string, string>; onChange: (value: string) => void }) {
  const id = React.useId()
  return <div className="space-y-1"><label htmlFor={id} className="text-xs font-semibold">{label}</label><select id={id} className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={value} onChange={event => onChange(event.target.value)}>{Object.entries(options).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></div>
}

function CallForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [direction, setDirection] = React.useState<keyof typeof callDirections>('INBOUND')
  const [topic, setTopic] = React.useState<keyof typeof callTopics>('SUPPORT')
  const [outcome, setOutcome] = React.useState<keyof typeof callOutcomes>('COMPLETED')
  const [followUpStatus, setFollowUpStatus] = React.useState<keyof typeof callFollowUpStatuses>('NONE')
  const [followUpDate, setFollowUpDate] = React.useState(() => {
    const today = getRecentReportDateRange().to
    return gregorianDateToJalaliParts(new Date(new Date(`${today}T12:00:00Z`).getTime() + 86400000))
  })
  const [note, setNote] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [subject, setSubject] = React.useState<SubjectItem | null>(null)
  const [subjects, setSubjects] = React.useState<SubjectItem[]>([])
  const [lookupError, setLookupError] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const pending = React.useRef(false)
  const requestKey = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!open || subject || search.trim().length < 2) return
    let active = true
    const timer = setTimeout(() => {
      apiClient.request<SubjectItem[]>('GET', `/admin/call-logs/subjects?q=${encodeURIComponent(search.trim())}`)
        .then(rows => { if (active) { setSubjects(rows); setLookupError(null) } })
        .catch(failure => { if (active) { setSubjects([]); setLookupError(getReportErrorMessage(failure)) } })
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [open, search, subject])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (pending.current) return
    pending.current = true
    setSubmitting(true)
    setError(null)
    requestKey.current ??= crypto.randomUUID()
    try {
      const data: CreateCallLogInput = {
        clientRequestId: requestKey.current, direction, topic, outcome, followUpStatus,
        subjectUserId: subject?.id, note: note.trim() || undefined,
        followUpAt: followUpStatus === 'PENDING'
          ? parseReportDateRange(jalaliDatePartsToIsoDate(followUpDate.year, followUpDate.month, followUpDate.day)).gte!.toISOString()
          : undefined,
      }
      const result = await apiClient.request<{ id: string }>('POST', '/admin/call-logs', data)
      if (!result.id) throw new Error('ثبت تماس تأیید نشد؛ دوباره تلاش کنید.')
      requestKey.current = null
      setNote(''); setSearch(''); setSubject(null); setSubjects([]); setFollowUpStatus('NONE')
      setOpen(false)
      onCreated()
    } catch (failure) { setError(getReportErrorMessage(failure)) }
    finally { pending.current = false; setSubmitting(false) }
  }
  return <>
    <Button type="button" size="sm" onClick={() => setOpen(true)}><Plus className="size-4 ml-1" />ثبت تماس</Button>
    <Dialog open={open} onOpenChange={value => { if (!pending.current) setOpen(value) }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" dir="rtl">
        <DialogHeader><DialogTitle>ثبت تماس عملیاتی</DialogTitle><DialogDescription>زمان تماس و ثبت‌کننده به‌صورت خودکار ثبت می‌شوند. اطلاعات پزشکی، رمز، OTP و توکن را وارد نکنید.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={submitting} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Choice label="جهت تماس" value={direction} options={callDirections} onChange={value => setDirection(value as typeof direction)} />
              <Choice label="موضوع عملیاتی" value={topic} options={callTopics} onChange={value => setTopic(value as typeof topic)} />
              <Choice label="نتیجه تماس" value={outcome} options={callOutcomes} onChange={value => setOutcome(value as typeof outcome)} />
              <Choice label="وضعیت پیگیری" value={followUpStatus} options={callFollowUpStatuses} onChange={value => setFollowUpStatus(value as typeof followUpStatus)} />
            </div>
            {followUpStatus === 'PENDING' && <JalaliDateFields idPrefix="call-follow-up" label="تاریخ پیگیری" value={followUpDate} onChange={setFollowUpDate} yearOptions={[followUpDate.year - 1, followUpDate.year, followUpDate.year + 1]} />}
            <div className="space-y-1">
              <label htmlFor="call-subject-search" className="text-xs font-semibold">ارتباط با حساب موجود (اختیاری)</label>
              <Input id="call-subject-search" value={search} placeholder="نام کاربر، پزشک یا کسب‌وکار؛ حداقل دو حرف" onChange={event => { setSearch(event.target.value); setSubject(null); setSubjects([]); setLookupError(null) }} />
              {subject && <p className="text-xs text-emerald-700">{subject.name} — {subject.kind}</p>}
              {lookupError && <p role="alert" className="text-xs text-red-700">{lookupError}</p>}
              {subjects.length > 0 && <ul className="max-h-36 overflow-y-auto rounded-md border">{subjects.map(item => <li key={item.id}><button type="button" className="w-full px-3 py-2 text-right text-sm hover:bg-muted" onClick={() => { setSubject(item); setSearch(item.name); setSubjects([]) }}>{item.name} — {item.kind}</button></li>)}</ul>}
            </div>
            <div className="space-y-1"><label htmlFor="call-note" className="text-xs font-semibold">یادداشت کوتاه غیرپزشکی (اختیاری)</label><Textarea id="call-note" maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="فقط موضوع اجرایی و نتیجهٔ پیگیری" /></div>
          </fieldset>
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">{submitting ? 'در حال ثبت…' : 'ثبت تماس'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </>
}

const eventLabels: Record<string, string> = {
  USER_LOGIN: 'ورود کاربر', USER_CREATED: 'ایجاد حساب کاربری', USER_UPDATED: 'ویرایش حساب کاربری',
  DOCTOR_UPDATED: 'ویرایش اطلاعات پزشک', DOCTOR_STATUS_CHANGED: 'تغییر وضعیت پزشک',
  AGENT_CREATED: 'ثبت همکار فروش', AGENT_STATUS_CHANGED: 'تغییر وضعیت همکار فروش',
  COMMISSION_APPROVED: 'تأیید پورسانت', COMMISSION_PAID: 'ثبت پرداخت پورسانت',
  PAYMENT_SUCCESS: 'پرداخت موفق', CONTRACT_CREATED: 'ثبت قرارداد', CALL_LOG_CREATED: 'ثبت تماس عملیاتی',
  ROLE_UPDATED: 'ویرایش نقش', PERMISSION_UPDATED: 'ویرایش دسترسی',
}

export function AdminActivityOverview() {
  const [callPeriod, setCallPeriod] = React.useState<Period>('today')
  const [eventPeriod, setEventPeriod] = React.useState<Period>('today')
  const [revision, setRevision] = React.useState(0)
  const { user } = useAuthStore()
  const canManageCalls = user?.roles.some(role => role === 'SUPER_ADMIN' || role === 'ADMIN') || user?.permissions.some(permission => permission === '*' || permission === 'manage_call_logs')
  const calls = useRows<CallItem>(`/admin/call-logs?period=${callPeriod}&limit=10`, revision)
  const range = getDashboardPeriodRange(eventPeriod)
  const filter = parseReportDateRange(range.from, range.to)
  const end = new Date(filter.lt!.getTime() - 1).toISOString()
  const events = useRows<EventItem>(`/audit-logs?limit=10&startDate=${encodeURIComponent(filter.gte!.toISOString())}&endDate=${encodeURIComponent(end)}`, revision)
  return <div className="min-w-0 space-y-5">
    <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-6" aria-labelledby="registered-calls-title">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 id="registered-calls-title" className="flex items-center gap-2 font-extrabold text-slate-800"><PhoneIncoming className="size-5 text-teal-700" />تماس‌های ثبت‌شده</h3>{canManageCalls && <CallForm onCreated={() => setRevision(value => value + 1)} />}</div>
      <PeriodButtons period={callPeriod} onChange={setCallPeriod} label="بازه تماس‌ها" />
      <FeedState loading={calls.loading} error={calls.error} empty={!calls.rows.length} onRetry={() => void calls.load()} />
      {!calls.loading && !calls.error && calls.rows.map(call => <article key={call.id} className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-1.5 font-bold text-slate-800">{call.direction === 'INBOUND' ? <PhoneIncoming className="size-4 text-teal-700" /> : <PhoneOutgoing className="size-4 text-sky-700" />}{callTopics[call.topic]} — {callDirections[call.direction]}</span><time dateTime={call.occurredAt} className="text-slate-500">{dateTime.format(new Date(call.occurredAt))}</time></div>
        <p>{callOutcomes[call.outcome]} · {callFollowUpStatuses[call.followUpStatus]}</p>
        {call.subjectName && <p>حساب مرتبط: {call.subjectName}</p>}
        {call.followUpAt && <p>پیگیری: {dateTime.format(new Date(call.followUpAt))}</p>}
        {call.note && <p className="break-words text-slate-600">{call.note}</p>}
        <p className="text-slate-500">ثبت‌کننده: {call.recordedByName}</p>
      </article>)}
      {calls.rows.length > 0 && !calls.error && <p className="text-[11px] text-slate-400">نمایش حداکثر ۱۰ تماس آخر بازه؛ زمان‌ها به وقت تهران.</p>}
    </section>
    <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-6" aria-labelledby="system-events-title">
      <div className="flex items-center justify-between gap-2"><h3 id="system-events-title" className="flex items-center gap-2 font-extrabold text-slate-800"><Activity className="size-5 text-sky-700" />رویدادهای سامانه</h3><Button type="button" variant="ghost" size="icon" aria-label="تازه‌سازی رویدادها" onClick={() => void events.load()}><RefreshCw className="size-4" /></Button></div>
      <PeriodButtons period={eventPeriod} onChange={setEventPeriod} label="بازه رویدادها" />
      <FeedState loading={events.loading} error={events.error} empty={!events.rows.length} onRetry={() => void events.load()} />
      {!events.loading && !events.error && events.rows.map(event => <article key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50/60 p-3 text-xs"><span className="font-medium text-slate-700">{eventLabels[event.action] || 'رویداد ثبت‌شده در سامانه'}</span><time dateTime={event.createdAt} className="text-slate-500">{dateTime.format(new Date(event.createdAt))}</time></article>)}
      {events.rows.length > 0 && !events.error && <p className="text-[11px] text-slate-400">۱۰ رویداد آخر از گزارش ممیزی؛ مستقل از فهرست تماس‌ها.</p>}
    </section>
  </div>
}
