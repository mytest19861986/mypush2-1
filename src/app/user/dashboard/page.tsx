'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { plansService, contractsService } from '@/services'
import { PageHeader, StatCard, StatusBadge } from '@/components/shared'
import { toPersianNum, formatPrice, formatDate, getDisplayName } from '@/utils/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { UserPlanItem, ContractItem } from '@/types'
import {
  HeartPulse,
  CreditCard,
  FileText,
  TrendingUp,
  ArrowLeft,
  Calendar,
  ShoppingCart,
  Activity,
  Clock,
  Stethoscope,
  Briefcase,
} from 'lucide-react'

// ---------- Types ----------

interface DashboardStats {
  activePlans: number
  totalContracts: number
  totalSavings: number
}

// ---------- Quick Action Card ----------

function QuickAction({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}) {
  return (
    <Link href={href}>
      <Card className="transition-all hover:shadow-md hover:border-primary/30 cursor-pointer">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          <ArrowLeft className="size-4 text-muted-foreground shrink-0 mt-1" />
        </CardContent>
      </Card>
    </Link>
  )
}

// ---------- Dashboard Page ----------

export default function UserDashboardPage() {
  const { user } = useAuthStore()
  const [activePlans, setActivePlans] = useState<UserPlanItem[]>([])
  const [recentContracts, setRecentContracts] = useState<ContractItem[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    activePlans: 0,
    totalContracts: 0,
    totalSavings: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, contractsRes] = await Promise.all([
          plansService.getMyPlans(),
          contractsService.getMyContracts(),
        ])

        // Handle /user-plans/my response: { plans: [...], activeCount, totalCount }
        let planList: UserPlanItem[] = []
        if (plansRes.success && plansRes.data) {
          const data = plansRes.data as any
          planList = Array.isArray(data) ? data : (Array.isArray(data.plans) ? data.plans : [])
        }
        setActivePlans(planList)

        // Handle /contracts/my response
        let contractList: ContractItem[] = []
        if (contractsRes.success && contractsRes.data) {
          contractList = Array.isArray(contractsRes.data) ? contractsRes.data : []
        }
        setRecentContracts(contractList.slice(0, 5))

        const active = planList.filter((p: UserPlanItem) => p.status === 'ACTIVE').length
        const savings = contractList.reduce(
          (sum: number, c: ContractItem) => sum + (c.discountAmount || 0),
          0
        )

        setStats({
          activePlans: active,
          totalContracts: contractList.length,
          totalSavings: savings,
        })
      } catch {
        setError('خطا در دریافت اطلاعات')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // ---------- Computed ----------

  const fullName = getDisplayName(user)

  // ---------- Loading ----------

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  // ---------- Error ----------

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-center">
          <HeartPulse className="mx-auto mb-3 size-12 text-destructive" />
          <p className="font-medium text-destructive">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`خوش آمدید، ${fullName}`}
        description={
          stats.activePlans > 0
            ? `شما ${toPersianNum(stats.activePlans)} طرح فعال دارید`
            : 'هنوز طرحی خریداری نکرده‌اید'
        }
      />

      {/* Welcome Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <HeartPulse className="size-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">خوش آمدید، {fullName}</h1>
              <p className="text-sm text-muted-foreground">
                {stats.activePlans > 0
                  ? `شما ${toPersianNum(stats.activePlans)} طرح فعال دارید`
                  : 'هنوز طرحی خریداری نکرده‌اید'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* My Plans */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4 text-primary" />
              طرح‌های من
            </CardTitle>
            {activePlans.length > 0 && (
              <Link href="/user/plans">
                <Button variant="ghost" size="sm" className="text-xs">
                  مشاهده همه
                  <ArrowLeft className="mr-1 size-3" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activePlans.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {activePlans.map((plan) => (
                <div key={plan.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <CreditCard className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {plan.plan.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {toPersianNum(plan.plan.discountPercent)}٪ تخفیف
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={plan.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      <span>شروع: {formatDate(plan.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      <span>پایان: {formatDate(plan.endDate)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-dashed bg-muted/30 p-6 text-center sm:flex-row sm:text-right">
              <div>
                <p className="font-medium">هنوز طرح فعالی ندارید.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  برای استفاده از تخفیف‌های درمانی، یک طرح مناسب انتخاب کنید.
                </p>
              </div>
              <Link href="/user/plans">
                <Button className="gap-2">
                  <ShoppingCart className="size-4" />
                  خرید طرح
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="طرح فعال"
          value={stats.activePlans}
          icon={CreditCard}
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
        />

        <StatCard
          title="قراردادها"
          value={stats.totalContracts}
          icon={FileText}
          iconClassName="bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400"
        />

        <StatCard
          title="پس‌انداز شما (تومان)"
          value={formatPrice(stats.totalSavings)}
          icon={TrendingUp}
          iconClassName="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
        />
      </div>

      {/* CTA: Buy Plan */}
      {stats.activePlans === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 p-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShoppingCart className="size-6" />
            </div>
            <div className="flex-1 text-center sm:text-right">
              <h3 className="font-semibold">خرید طرح تخفیف درمان</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                با خرید طرح، از تخفیف ویژه روی ویزیت پزشکان بهره‌مند شوید
              </p>
            </div>
            <Link href="/user/plans">
              <Button className="shadow-md">
                <CreditCard className="ml-2 size-4" />
                خرید طرح جدید
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold mb-3">دسترسی سریع</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickAction
            icon={<ShoppingCart className="size-5" />}
            title="خرید طرح جدید"
            description="مشاهده و خرید طرح‌های تخفیف"
            href="/user/plans"
          />
          <QuickAction
            icon={<FileText className="size-5" />}
            title="قراردادهای من"
            description="سوابق ویزیت و قراردادها"
            href="/user/contracts"
          />
          <QuickAction
            icon={<Activity className="size-5" />}
            title="وضعیت طرح‌ها"
            description="طرح‌های فعال و منقضی"
            href="/user/plans"
          />
          <QuickAction
            icon={<Stethoscope className="size-5" />}
            title="ثبت‌نام پزشک"
            description="معرفی پزشک به شبکه حامی"
            href="/register/doctor"
          />
          <QuickAction
            icon={<Briefcase className="size-5" />}
            title="ثبت‌نام نماینده"
            description="معرفی نماینده همکاری"
            href="/register/agent"
          />
        </div>
      </div>

      {/* Recent Contracts */}
      {recentContracts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4" />
                آخرین قراردادها
              </CardTitle>
              <Link href="/user/contracts">
                <Button variant="ghost" size="sm" className="text-xs">
                  مشاهده همه
                  <ArrowLeft className="mr-1 size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentContracts.map((contract) => {
              const doctorName = contract.doctor?.user?.profile
                ? getDisplayName({ profile: contract.doctor.user.profile })
                : 'نامشخص'

              return (
                <div key={contract.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Activity className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {doctorName}
                          {contract.doctor?.specialty && (
                            <span className="text-muted-foreground">
                              {' '}
                              — {contract.doctor.specialty}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(contract.createdAt)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={contract.status} />
                  </div>
                  <Separator className="mt-3" />
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
