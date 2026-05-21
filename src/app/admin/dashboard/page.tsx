'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  Stethoscope,
  Briefcase,
  CreditCard,
  FileCheck,
  DollarSign,
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
import { auditService, usersService, agentsService } from '@/services'
import type { DashboardStats } from '@/types'
import { toPersianNum, formatPriceWithUnit, formatDate, formatDateTime } from '@/utils/formatters'
import { AUDIT_ACTION_LABELS, ENTITY_LABELS } from '@/constants'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalAgents, setTotalAgents] = useState(0)
  const [pendingAgents, setPendingAgents] = useState(0)
  const [activePlans, setActivePlans] = useState(0)
  const [todayContracts, setTodayContracts] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const [statsRes, usersRes, agentsRes, pendingRes] = await Promise.allSettled([
          auditService.getStats(),
          usersService.getList({ page: 1, limit: 1 }),
          agentsService.getList({ page: 1, limit: 1 }),
          agentsService.getList({ page: 1, limit: 1, status: 'PENDING' }),
        ])

        if (statsRes.status === 'fulfilled' && statsRes.value.success) {
          const data = statsRes.value.data
          if (data) {
            setStats(data)
            setActivePlans(data.activePlans ?? 0)
            setTodayContracts(data.todayContracts ?? 0)
            setMonthlyRevenue(data.monthlyRevenue ?? 0)
          }
        }

        if (usersRes.status === 'fulfilled' && usersRes.value.success) {
          setTotalUsers(usersRes.value.pagination?.total ?? 0)
        }

        if (agentsRes.status === 'fulfilled' && agentsRes.value.success) {
          setTotalAgents(agentsRes.value.pagination?.total ?? 0)
        }

        if (pendingRes.status === 'fulfilled' && pendingRes.value.success) {
          setPendingAgents(pendingRes.value.pagination?.total ?? 0)
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
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="داشبورد"
        description="نمای کلی از وضعیت سامانه تخفیف درمانی"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="کل کاربران"
          value={totalUsers}
          icon={Users}
          description="ثبت‌نام شده در سامانه"
          isLoading={isLoading}
        />
        <StatCard
          title="کل پزشکان"
          value={stats?.totalDoctors ?? 0}
          icon={Stethoscope}
          description="پزشکان ثبت‌نام شده"
          isLoading={isLoading}
        />
        <StatCard
          title="کل نمایندگان"
          value={totalAgents}
          icon={Briefcase}
          description={`${toPersianNum(pendingAgents)} در انتظار تأیید`}
          trend={pendingAgents > 0 ? { value: pendingAgents, isUp: true } : undefined}
          isLoading={isLoading}
        />
        <StatCard
          title="طرح‌های فعال"
          value={activePlans}
          icon={CreditCard}
          description="طرح تخفیف فعال"
          isLoading={isLoading}
        />
        <StatCard
          title="قراردادهای امروز"
          value={todayContracts}
          icon={FileCheck}
          description="ویزیت‌های ثبت شده"
          trend={todayContracts > 0 ? { value: todayContracts, isUp: true } : undefined}
          isLoading={isLoading}
        />
        <StatCard
          title="درآمد ماهانه"
          value={formatPriceWithUnit(monthlyRevenue)}
          icon={DollarSign}
          description="تومان — این ماه"
          isLoading={isLoading}
        />
      </div>

      {/* Recent activity table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">آخرین فعالیت‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : stats?.recentActions && stats.recentActions.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>عملیات</TableHead>
                    <TableHead>کاربر</TableHead>
                    <TableHead>موجودیت</TableHead>
                    <TableHead className="text-left">تاریخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentActions.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {AUDIT_ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user?.profile?.firstName || log.user?.profile?.lastName
                          ? `${log.user.profile.firstName || ''} ${log.user.profile.lastName || ''}`.trim()
                          : log.user?.mobile || 'نامشخص'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.entity ? (ENTITY_LABELS[log.entity] || log.entity) : '—'}
                      </TableCell>
                      <TableCell className="text-left text-sm text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              داده‌ای یافت نشد
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top actions & users */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">پرتکرارترین عملیات</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : stats?.topActions && stats.topActions.length > 0 ? (
              <div className="space-y-3">
                {stats.topActions.map((item, index) => (
                  <div
                    key={item.action}
                    className="flex items-center justify-between rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        {index + 1}
                      </span>
                      <span className="text-sm">
                        {AUDIT_ACTION_LABELS[item.action] || item.action}
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
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

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">فعال‌ترین کاربران</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : stats?.topUsers && stats.topUsers.length > 0 ? (
              <div className="space-y-3">
                {stats.topUsers.map((item, index) => (
                  <div
                    key={item.userId}
                    className="flex items-center justify-between rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        {index + 1}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm">{item.name || item.mobile}</span>
                        {item.name && (
                          <span className="text-xs text-muted-foreground">
                            {item.mobile}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
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
