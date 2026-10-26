'use client'

import { useSyncExternalStore } from 'react'

const dateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'Asia/Tehran', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})
const timeFormatter = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' })
const subscribe = (notify: () => void) => {
  const timer = setInterval(notify, 30000)
  return () => clearInterval(timer)
}
const getSnapshot = () => Math.floor(Date.now() / 60000)
const getServerSnapshot = () => 0

export function TehranClock() {
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  if (!minute) return <span className="text-xs text-slate-400">در حال دریافت زمان…</span>
  const now = new Date(minute * 60000)
  return <div className="flex flex-col text-left">
    <time dateTime={now.toISOString()} className="text-xs font-bold text-slate-700">{dateFormatter.format(now)}</time>
    <span className="text-[11px] text-slate-400">ساعت {timeFormatter.format(now)} — تهران</span>
  </div>
}
