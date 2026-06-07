'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  Stethoscope,
  Briefcase,
  CreditCard,
  FileCheck,
  DollarSign,
  ReceiptText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared'
import { StatCard } from '@/components/shared'
import { dashboardService } from '@/services'
import type { DashboardStats } from '@/types'
import { cn } from '@/lib/utils'
import { toPersianNum, formatPriceWithUnit, formatDateTime } from '@/utils/formatters'
import { AUDIT_ACTION_LABELS, ENTITY_LABELS } from '@/constants'

function getActionBadgeClass(action: string) {
  if (action.includes('DELETED') || action.includes('REJECTED')) {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300'
  }

  if (action.includes('CREATED') || action.includes('UPLOADED')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300'
  }

  if (action.includes('UPDATED') || action.includes('STATUS') || action.includes('REVIEWED')) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300'
  }

  if (action.includes('LOGIN')) {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300'
  }

  return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300'
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const statsRes = await dashboardService.getStats()
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data)
        } else {
          setError('خطا در دریافت اطلاعات')
        }
      } catch {
        setError('خطا در دریافت اطلاعات')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="داشبورد مدیریت"
          description="نمای کلی وضعیت کاربران، پزشکان، فروش، مالی و فعالیت‌های سامانه"
        />
        <Card className="rounded-2xl border border-border/50 bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="داشبورد مدیریت"
        description="نمای کلی وضعیت کاربران، پزشکان، فروش، مالی و فعالیت‌های سامانه"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="کاربران کل"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          description="ثبت‌نام شده در سامانه"
          className="rounded-2xl border border-border/50 bg-card shadow-sm"
        />
        <StatCard
          title="کاربران پرداخت‌کرده در ۳۰ روز اخیر"
          value={stats?.paidUsersLast30Days ?? 0}
          icon={Users}
          description="کاربران یکتای دارای پرداخت موفق"
          className="rounded-2xl border border-border/50 bg-card shadow-sm"
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          title="خریدهای موفق ۳۰ روز اخیر"
          value={stats?.successfulPaymentsLast30Days ?? 0}
          icon={ReceiptText}
          description="فقط پرداخت‌های موفق"
          className="rounded-2xl border border-border/50 bg-card shadow-sm"
          iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        />
        <StatCard
          title="مبلغ پرداخت موفق ۳۰ روز اخیر"
          value={formatPriceWithUnit(stats?.successfulPaymentsAmountLast30Days ?? 0)}
          icon={DollarSign}
          description="بر اساس مبلغ نهایی پرداخت"
          className="rounded-2xl border border-border/50 bg-card shadow-sm"
          iconClassName="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
        />
        <StatCard
          title="کل پزشکان"
          value={stats?.totalDoctors ?? 0}
          icon={Stethoscope}
          description="پزشکان ثبت‌نام شده"
          className="rounded-2xl border border-border/50 bg-card shadow-sm"
          iconClassName="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
        />
        <StatCard
          title="کل نمایندگان"
          value={stats?.totalAgents ?? 0}
          icon={Briefcase}
          description={`${toPersianNum(stats?.pendingAgents ?? 0)} در انتظار تأیید`}
          trend={(stats?.pendingAgents ?? 0) > 0 ? { value: stats?.pendingAgents ?? 0, isUp: true } : undefined}
          className="rounded-2xl border border-border/50 bg-card shadow-sm"
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <StatCard
          title="طرح‌های فعال"
          value={stats?.activePlans ?? 0}
          icon={CreditCard}
          description="طرح تخفیف فعال"
          className="rounded-2xl border border-border/50 bg-card shadow-sm"
          iconClassName="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400"
        />
        <StatCard
          title="قراردادهای امروز"
          value={stats?.todayContracts ?? 0}
          icon={FileCheck}
          description="ویزیت‌های ثبت شده"
          trend={(stats?.todayContracts ?? 0) > 0 ? { value: stats?.todayContracts ?? 0, isUp: true } : undefined}
          className="rounded-2xl border border-border/50 bg-card shadow-sm"
          iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        />
        <StatCard
          title="درآمد ماهانه"
          value={formatPriceWithUnit(stats?.monthlyRevenue ?? 0)}
          icon={DollarSign}
          description="تومان — این ماه"
          className="rounded-2xl border border-border/50 bg-card shadow-sm"
          iconClassName="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
        />
      </div>

      {/* Recent activity table */}
      <Card className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        <CardHeader className="border-b border-border/60 p-4 sm:p-5">
          <CardTitle className="text-lg">آخرین فعالیت‌ها</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4 sm:p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : stats?.recentActions && stats.recentActions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">عملیات</TableHead>
                    <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">کاربر</TableHead>
                    <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">موجودیت</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">تاریخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentActions.map((log) => (
                    <TableRow key={log.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="px-4 py-4">
                        <Badge
                          variant="outline"
                          className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', getActionBadgeClass(log.action))}
                        >
                          {AUDIT_ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-sm">
                        {log.user?.profile?.firstName || log.user?.profile?.lastName
                          ? `${log.user.profile.firstName || ''} ${log.user.profile.lastName || ''}`.trim()
                          : 'نامشخص'}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-sm text-muted-foreground">
                        {log.entity ? (ENTITY_LABELS[log.entity] || log.entity) : '—'}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-left text-sm text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              داده‌ای یافت نشد
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top actions & users */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
          <CardHeader className="border-b border-border/60 p-4 sm:p-5">
            <CardTitle className="text-lg">پرتکرارترین عملیات</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats?.topActions && stats.topActions.length > 0 ? (
              <div className="divide-y divide-border/60">
                {stats.topActions.map((item, index) => (
                  <div
                    key={item.action}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        {toPersianNum(index + 1)}
                      </span>
                      <span className="truncate text-sm">
                        {AUDIT_ACTION_LABELS[item.action] || item.action}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {toPersianNum(item.count)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                داده‌ای یافت نشد
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
          <CardHeader className="border-b border-border/60 p-4 sm:p-5">
            <CardTitle className="text-lg">فعال‌ترین کاربران</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats?.topUsers && stats.topUsers.length > 0 ? (
              <div className="divide-y divide-border/60">
                {stats.topUsers.map((item, index) => (
                  <div
                    key={item.userId}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        {toPersianNum(index + 1)}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm">{item.name || 'نامشخص'}</span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {toPersianNum(item.count)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                داده‌ای یافت نشد
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
