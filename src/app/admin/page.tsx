'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared'
import { getAdminDashboardNavForUser } from '@/config/dashboard-nav'
import { useAuthStore } from '@/stores/auth-store'

export default function AdminPage() {
  const { user } = useAuthStore()
  const navItems = getAdminDashboardNavForUser(user)

  return (
    <div className="space-y-6">
      <PageHeader
        title="پنل مدیریت"
        description="بخش‌های مجاز مدیریتی بر اساس دسترسی‌های حساب شما"
      />

      {navItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-emerald-500/50 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <Icon className="size-5" />
                    </span>
                    <span className="truncate text-sm font-semibold">{item.label}</span>
                  </div>
                  <ArrowLeft className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-emerald-700" />
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card className="rounded-lg border-border/60">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              در حال حاضر بخش مدیریتی مجازی برای حساب شما فعال نیست.
            </p>
            <Button asChild variant="outline">
              <Link href="/user/dashboard">بازگشت به پنل کاربری</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
