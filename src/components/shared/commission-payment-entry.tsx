'use client'

import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { canPayCommissions } from '@/lib/commission-permissions'

export function CommissionPaymentEntry() {
  const { user } = useAuthStore()
  if (!user || !canPayCommissions({ roles: user.roles ?? [], permissions: user.permissions ?? [] })) return null
  return <Link href="/commission-payments" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">پرداخت پورسانت‌های تأییدشده</Link>
}
