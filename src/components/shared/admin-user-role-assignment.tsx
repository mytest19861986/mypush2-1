'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'
import { getReportErrorMessage } from '@/lib/report-client'
import { Button } from '@/components/ui/button'

interface Role { name: string; title: string; protected: boolean; permissions: { name: string; title: string }[] }
interface Assignment { assigned: string[]; roles: Role[] }
export function AdminUserRoleAssignment({ userId }: { userId: string }) {
  const user = useAuthStore(state => state.user)
  const permitted = Boolean(user?.roles.some(role => role === 'SUPER_ADMIN' || role === 'ADMIN') || user?.permissions.some(permission => permission === 'manage_roles' || permission === '*'))
  const [state, setState] = useState<Assignment | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const generation = useRef(0)
  const load = useCallback(async () => {
    if (!permitted) return
    const id = ++generation.current
    setLoading(true); setError(null); setState(null)
    try {
      const result = await apiClient.request<Assignment>('GET', `/admin/users/${encodeURIComponent(userId)}/roles`)
      if (!Array.isArray(result.assigned) || !Array.isArray(result.roles)) throw new Error('اطلاعات نقش‌ها معتبر نیست.')
      if (id === generation.current) { setState(result); setSelected(result.assigned) }
    } catch (error) { if (id === generation.current) setError(getReportErrorMessage(error)) }
    finally { if (id === generation.current) setLoading(false) }
  }, [userId, permitted])
  useEffect(() => { void load(); return () => { generation.current++ } }, [load])
  if (!permitted) return null
  const changed = Boolean(state && [...selected].sort().join('|') !== [...state.assigned].sort().join('|'))
  const save = async () => {
    if (saving || !changed || !state) return
    setSaving(true); setError(null); setNotice('')
    try {
      const result = await apiClient.request<{ roles: { name: string; title: string }[] }>('PATCH', `/admin/users/${encodeURIComponent(userId)}/roles`, { roleNames: selected })
      const assigned = result.roles.map(role => role.name)
      setState({ ...state, assigned }); setSelected(assigned)
      setNotice('نقش‌ها ذخیره و سابقهٔ تغییر ثبت شد. برای دریافت دسترسی تازه در نشست‌های قبلی، ورود مجدد لازم است.')
    } catch (error) { setError(getReportErrorMessage(error)) }
    finally { setSaving(false) }
  }
  return <section aria-label="تخصیص نقش کاربر" className="space-y-3 border-t pt-4">
    <h3 className="font-bold">نقش‌ها و دسترسی‌های این حساب</h3>
    <p className="text-xs leading-6 text-muted-foreground">نقش سازمانی را در <Link href="/admin/roles" className="font-bold text-teal-700">مدیریت نقش‌ها</Link> بسازید و دسترسی‌های لازم را به آن بدهید؛ سپس همان نقش را اینجا انتخاب کنید. نقش‌های اصلی حساب در این قسمت قابل تغییر نیستند.</p>
    {loading ? <p role="status" className="text-sm">در حال بررسی نقش‌ها…</p> : state ? <>
      <div className="space-y-2">{state.roles.filter(role => !role.protected || state.assigned.includes(role.name)).map(role => <label key={role.name} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
        <input type="checkbox" checked={selected.includes(role.name)} disabled={role.protected || saving} onChange={event => { setNotice(''); setSelected(current => event.target.checked ? [...current, role.name] : current.filter(name => name !== role.name)) }} className="mt-1" />
        <span className="min-w-0"><span className="font-semibold">{role.title}{role.protected ? ' — نقش اصلی ثابت' : ''}</span><span className="mt-1 block break-words text-xs text-muted-foreground">{role.permissions.length ? role.permissions.map(permission => permission.title).join('، ') : 'دسترسی سازمانی به این نقش اضافه نشده است.'}</span></span>
      </label>)}</div>
      {state.roles.some(role => selected.includes(role.name) && role.permissions.some(permission => permission.name === 'manage_commissions' || permission.name === 'manage_commission_payments')) && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">{state.roles.some(role => selected.includes(role.name) && role.permissions.some(permission => permission.name === 'manage_commission_payments')) ? 'این نقش مجوز مستقل ثبت پرداخت پورسانت به کیف پول را دارد. آن را فقط با تصمیم صریح مدیر تخصیص دهید.' : 'مدیریت پورسانت به‌تنهایی اجازه ثبت پرداخت به کیف پول نمی‌دهد. پرداخت به مجوز مستقل پرداخت پورسانت نیاز دارد.'}</p>}
      {!state.roles.some(role => !role.protected) && <p className="text-xs text-muted-foreground">نقش سازمانی قابل تخصیصی وجود ندارد؛ ابتدا نقش را بسازید.</p>}
      {changed && <p className="text-xs leading-6">نقش‌های پس از ذخیره: {state.roles.filter(role => selected.includes(role.name)).map(role => role.title).join('، ') || 'بدون نقش سازمانی'}</p>}
      <Button type="button" disabled={!changed || saving} onClick={() => void save()}>{saving ? 'در حال ثبت…' : 'ذخیره نقش‌های همین حساب'}</Button>
    </> : null}
    {error && <div role="alert" className="space-y-2 text-sm text-red-700"><p>{error}</p>{!state && <Button type="button" variant="outline" onClick={() => void load()}>تلاش مجدد</Button>}</div>}
    {notice && <p role="status" className="text-xs text-teal-700">{notice}</p>}
  </section>
}
