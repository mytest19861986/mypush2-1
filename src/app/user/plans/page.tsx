'use client'

import { useEffect, useState } from 'react'
import { plansService } from '@/services'
import { PageHeader, StatusBadge } from '@/components/shared'
import { toPersianNum, formatPrice, formatDate } from '@/utils/formatters'
import { USER_PLAN_STATUS_LABELS } from '@/constants'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { DiscountPlanItem, UserPlanItem } from '@/types'
import {
  HeartPulse,
  CreditCard,
  Check,
  Calendar,
  Percent,
  Loader2,
  AlertCircle,
  Star,
  Shield,
} from 'lucide-react'

// ---------- Plan Card ----------

function PlanCard({
  plan,
  onPurchase,
  purchasing,
}: {
  plan: DiscountPlanItem
  onPurchase: (id: string) => void
  purchasing: string | null
}) {
  const features = plan.features
    ? (JSON.parse(plan.features) as string[])
    : []

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/30">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-l from-primary to-emerald-400" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <Percent className="ml-1 size-3" />
            {toPersianNum(plan.discountPercent)}% تخفیف
          </Badge>
        </div>
        {plan.description && (
          <CardDescription className="text-sm mt-1">
            {plan.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">
            {formatPrice(plan.price)}
          </span>
          <span className="text-sm text-muted-foreground">تومان</span>
        </div>

        {/* Info chips */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            {toPersianNum(plan.durationDays)} روزه
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            <Star className="size-3" />
            {plan.maxUses === -1
              ? 'نامحدود'
              : `${toPersianNum(plan.maxUses)} مرتبه`}
          </div>
        </div>

        {/* Features */}
        {features.length > 0 && (
          <>
            <Separator />
            <ul className="space-y-2">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <div className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    <Check className="size-3" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Buy Button */}
        <Button
          className="w-full shadow-md"
          onClick={() => onPurchase(plan.id)}
          disabled={purchasing === plan.id}
        >
          {purchasing === plan.id ? (
            <>
              <Loader2 className="ml-2 size-4 animate-spin" />
              در حال پردازش...
            </>
          ) : (
            <>
              <CreditCard className="ml-2 size-4" />
              خرید طرح
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// ---------- Active Plan Card ----------

function ActivePlanCard({ plan }: { plan: UserPlanItem }) {
  const endDate = new Date(plan.endDate)
  const now = new Date()
  const daysLeft = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  )

  return (
    <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <Shield className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">{plan.plan.name}</h4>
              <p className="text-xs text-muted-foreground">
                {toPersianNum(plan.plan.discountPercent)}% تخفیف
              </p>
            </div>
          </div>
          <StatusBadge
            status={plan.status}
            label={USER_PLAN_STATUS_LABELS[plan.status] || plan.status}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="size-3" />
            اعتبار تا: {formatDate(plan.endDate)}
          </div>
          <div className="flex items-center gap-1">
            <HeartPulse className="size-3" />
            {toPersianNum(daysLeft)} روز باقی‌مانده
          </div>
          {plan.remainingUses !== -1 && (
            <div className="flex items-center gap-1">
              <Star className="size-3" />
              {toPersianNum(plan.remainingUses)} استفاده باقی‌مانده
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Plans Page ----------

export default function UserPlansPage() {
  const [availablePlans, setAvailablePlans] = useState<DiscountPlanItem[]>([])
  const [myPlans, setMyPlans] = useState<UserPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [purchaseMessage, setPurchaseMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, myPlansRes] = await Promise.all([
          plansService.getList(),
          plansService.getMyPlans(),
        ])

        if (plansRes.success && plansRes.data) {
          const raw = plansRes.data as unknown
          const plansList: DiscountPlanItem[] = Array.isArray(raw)
            ? (raw as DiscountPlanItem[])
            : ((raw as Record<string, unknown>).data as DiscountPlanItem[] | undefined) ?? []
          const activePlans = plansList.filter((p) => p.status === 'ACTIVE')
          setAvailablePlans(activePlans)
        }

        if (myPlansRes.success && myPlansRes.data) {
          const raw = myPlansRes.data as unknown
          const myPlansList: UserPlanItem[] = Array.isArray(raw)
            ? (raw as UserPlanItem[])
            : ((raw as Record<string, unknown>).plans as UserPlanItem[] | undefined) ?? []
          setMyPlans(myPlansList)
        }
      } catch {
        // Error fetching plans - show empty state
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handlePurchase = async (planId: string) => {
    setPurchasing(planId)
    setPurchaseMessage(null)
    try {
      await plansService.purchasePlan(planId)
      setPurchaseMessage({
        type: 'success',
        text: 'طرح با موفقیت خریداری شد!',
      })
      // Refresh plans
      const myPlansRes = await plansService.getMyPlans()
      if (myPlansRes.success && myPlansRes.data) {
        const raw = myPlansRes.data as unknown
        const myPlansList: UserPlanItem[] = Array.isArray(raw)
          ? (raw as UserPlanItem[])
          : ((raw as Record<string, unknown>).plans as UserPlanItem[] | undefined) ?? []
        setMyPlans(myPlansList)
      }
    } catch {
      setPurchaseMessage({
        type: 'error',
        text: 'خطا در خرید طرح. لطفاً دوباره تلاش کنید.',
      })
    } finally {
      setPurchasing(null)
    }
  }

  const activePlans = myPlans.filter((p) => p.status === 'ACTIVE')
  const expiredPlans = myPlans.filter((p) => p.status !== 'ACTIVE')

  // ---------- Loading ----------

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="طرح‌های تخفیف"
        description="مشاهده و خرید طرح‌های تخفیف درمانی"
      />

      {/* Active Plans Section */}
      {activePlans.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            طرح‌های فعال شما
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activePlans.map((plan) => (
              <ActivePlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      )}

      {/* Expired Plans */}
      {expiredPlans.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
            طرح‌های منقضی شده
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {expiredPlans.map((plan) => (
              <Card key={plan.id} className="opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <CreditCard className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{plan.plan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {toPersianNum(plan.plan.discountPercent)}% تخفیف —{' '}
                          {formatDate(plan.endDate)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      status={plan.status}
                      label={USER_PLAN_STATUS_LABELS[plan.status] || plan.status}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Purchase Message */}
      {purchaseMessage && (
        <div
          className={`flex items-center gap-3 rounded-lg border p-4 ${
            purchaseMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
              : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
          }`}
        >
          {purchaseMessage.type === 'success' ? (
            <Shield className="size-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="size-5 text-red-600 shrink-0" />
          )}
          <p
            className={`text-sm ${
              purchaseMessage.type === 'success'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            {purchaseMessage.text}
          </p>
        </div>
      )}

      {/* Available Plans */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <HeartPulse className="size-5 text-primary" />
          طرح‌های موجود
        </h2>

        {availablePlans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <HeartPulse className="size-7" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                در حال حاضر طرحی برای خرید موجود نیست.
              </p>
              <p className="text-xs text-muted-foreground text-center">
                لطفاً بعداً مراجعه کنید.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availablePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onPurchase={handlePurchase}
                purchasing={purchasing}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
