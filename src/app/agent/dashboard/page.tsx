'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { agentsService } from '@/services/agents.service'
import { StatCard, StatusBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Briefcase,
  Wallet,
  Users,
  Layers,
  AlertTriangle,
  Clock,
  ArrowLeft,
} from 'lucide-react'
import { formatPrice, toPersianNum, formatDate, getDisplayName } from '@/utils/formatters'
import { COMMISSION_STATUS_LABELS } from '@/constants'
import type { AgentItem, CommissionItem } from '@/types'

// ---------- Types ----------

interface CommissionStats {
  totalCommission: number
  paidCommission: number
  pendingCommission: number
  cancelledCommission: number
  totalReferrals: number
  activePlans: number
}

// ---------- Status Color Map ----------

const statusColorMap: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  APPROVED: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
}

// ---------- Dashboard Page ----------

export default function AgentDashboardPage() {
  const { user } = useAuthStore()
  const [agentData, setAgentData] = useState<AgentItem | null>(null)
  const [stats, setStats] = useState<CommissionStats | null>(null)
  const [recentCommissions, setRecentCommissions] = useState<CommissionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentRes, commRes] = await Promise.all([
          agentsService.getMyProfile(),
          fetch('/api/v1/agents/commissions?limit=5', {
            headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
          }).then(r => r.json()),
        ])

        if (agentRes.success && agentRes.data) {
          setAgentData(agentRes.data as unknown as AgentItem)
        }

        if (commRes.success && commRes.data) {
          setRecentCommissions(commRes.data)
        }

        // Fetch stats separately
        const statsRes = await fetch('/api/v1/agents/commissions?stats=true', {
          headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
        }).then(r => r.json())
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data)
        }
      } catch {
        // Silent fail - data will stay null
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // ---------- Loading ----------

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  // ---------- Computed ----------

  const fullName = getDisplayName(user)
  const isApproved = agentData?.status === 'APPROVED'

  // ---------- Commission User Name Helper ----------

  const getCommissionUserName = (c: CommissionItem) => {
    if (c.userPlan?.plan) {
      // Try to get user name from nested structure
      const plan = c.userPlan.plan
      return plan.name || '—'
    }
    return 'بدون نام'
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-bl from-emerald-50 to-white dark:border-emerald-900 dark:from-emerald-950/30 dark:to-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <Briefcase className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">
                  خوش آمدید، {fullName}
                </h1>
                {agentData && <StatusBadge status={agentData.status} />}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {agentData?.businessName || 'نام کسب‌وکار ثبت نشده'}
              </p>
            </div>
          </div>
          {!isApproved && (
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle className="size-4" />
              <span>حساب هنوز تایید نشده</span>
            </div>
          )}
        </div>
        {!isApproved && (
          <div className="sm:hidden mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="size-4 shrink-0" />
            <span>حساب هنوز تایید نشده</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="کل پورسانت"
          value={stats ? `${formatPrice(stats.totalCommission)} ت` : '—'}
          icon={Wallet}
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        />

        <StatCard
          title="افراد معرفی شده"
          value={stats ? toPersianNum(stats.totalReferrals) : '—'}
          icon={Users}
          iconClassName="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
        />

        <StatCard
          title="طرح‌های فعال"
          value={stats ? toPersianNum(stats.activePlans) : '—'}
          icon={Layers}
          iconClassName="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
        />
      </div>

      {/* Recent Commissions */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between p-4 pb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Wallet className="size-4 text-emerald-600" />
            آخرین پورسانت‌ها
          </h2>
          <Link href="/agent/commissions">
            <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
              مشاهده همه
              <ArrowLeft className="size-4 mr-1" />
            </Button>
          </Link>
        </div>
        <div className="px-4 pb-4">
          {recentCommissions.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="size-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">پورسانتی ثبت نشده است</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">طرح</TableHead>
                      <TableHead className="text-right">مبلغ</TableHead>
                      <TableHead className="text-right">وضعیت</TableHead>
                      <TableHead className="text-right">تاریخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCommissions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{getCommissionUserName(c)}</TableCell>
                        <TableCell className="text-sm font-medium">{formatPrice(c.amount)} ت</TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(c.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {recentCommissions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{getCommissionUserName(c)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
                    </div>
                    <div className="text-left mr-3">
                      <p className="text-sm font-bold">{formatPrice(c.amount)} ت</p>
                      <StatusBadge status={c.status} className="text-[10px]" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
