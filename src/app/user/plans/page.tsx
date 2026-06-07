'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared'
import { apiClient, ApiError } from '@/lib/api-client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toPersianNum } from '@/utils/formatters'
import type { DiscountPlanItem } from '@/types'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  Percent,
  ShieldCheck,
  TimerReset,
} from 'lucide-react'

type PurchaseResponse = {
  paymentId?: string
  status?: string
  payment?: {
    id: string
    status: string
    amount: number
    discountAmount: number
    finalAmount: number
    gateway: string
    createdAt: string
  }
  plan?: {
    id: string
    name?: string
    title?: string
    price?: number
    durationDays?: number
    maxUses?: number
  }
}

type PaymentSuccessResponse = {
  paymentId?: string
  status?: string
  userPlanId?: string
  plan?: {
    id: string
    title?: string
    name?: string
  }
  startDate?: string
  endDate?: string
}

type PaymentState =
  | { status: 'idle' }
  | { status: 'pending'; paymentId: string; planName: string }
  | { status: 'success'; message: string; data?: PaymentSuccessResponse }
  | { status: 'error'; message: string; needsProfile?: boolean }

const REFERRAL_STORAGE_KEY = 'hamiReferralCode'
const REFERRAL_CODE_PATTERN = /^HC[A-F0-9]{10}$/

function normalizeReferralCode(value?: string | null) {
  if (!value) return null

  const normalized = value.trim().toUpperCase()
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('fa-IR').format(amount)
}

function getPlanDescription(plan: DiscountPlanItem) {
  return plan.description?.trim() || 'جزئیات تکمیلی این طرح به‌زودی نمایش داده می‌شود.'
}

function getPurchaseErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400 && error.code === 'PROFILE_INCOMPLETE') {
      return {
        message: 'برای خرید طرح، ابتدا کد ملی خود را در پروفایل ثبت کنید.',
        needsProfile: true,
      }
    }

    return { message: error.message || 'خطا در ایجاد درخواست پرداخت.' }
  }

  return {
    message: error instanceof Error ? error.message : 'خطا در ایجاد درخواست پرداخت.',
  }
}

function PlanLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

function PlanCard({
  plan,
  isPurchasing,
  disabled,
  onPurchase,
}: {
  plan: DiscountPlanItem
  isPurchasing: boolean
  disabled: boolean
  onPurchase: (plan: DiscountPlanItem) => void
}) {
  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg">{plan.name}</CardTitle>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {getPlanDescription(plan)}
            </p>
          </div>
          <Badge className="shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
            فعال
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CreditCard className="size-4" />
            قیمت طرح
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatPrice(plan.price)}
            <span className="mr-1 text-sm font-normal text-muted-foreground">تومان</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Percent className="size-3.5" />
              تخفیف
            </div>
            <p className="mt-2 text-sm font-semibold">{toPersianNum(plan.discountPercent)}٪</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              مدت
            </div>
            <p className="mt-2 text-sm font-semibold">{toPersianNum(plan.durationDays)} روز</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TimerReset className="size-3.5" />
          {plan.maxUses === -1
            ? 'تعداد استفاده نامحدود'
            : `${toPersianNum(plan.maxUses)} بار استفاده`}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={() => onPurchase(plan)}
          disabled={disabled || isPurchasing}
        >
          {isPurchasing ? (
            <>
              <Loader2 className="ml-2 size-4 animate-spin" />
              در حال ایجاد پرداخت...
            </>
          ) : (
            <>
              <ShieldCheck className="ml-2 size-4" />
              انتخاب و ادامه خرید
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function PlansPage() {
  const [plans, setPlans] = useState<DiscountPlanItem[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [plansError, setPlansError] = useState<string | null>(null)
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [paymentState, setPaymentState] = useState<PaymentState>({ status: 'idle' })
  const [referralCode, setReferralCode] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true)
    setPlansError(null)

    try {
      const res = await apiClient.get<DiscountPlanItem[]>('/plans')
      if (!res.success || !res.data) {
        throw new Error(res.error?.message || res.message || 'خطا در دریافت طرح‌ها.')
      }

      setPlans(res.data)
    } catch (error) {
      setPlansError(error instanceof Error ? error.message : 'خطا در دریافت طرح‌ها.')
    } finally {
      setLoadingPlans(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  useEffect(() => {
    const queryReferralCode = normalizeReferralCode(
      new URLSearchParams(window.location.search).get('ref')
    )
    const storedReferralCode = normalizeReferralCode(localStorage.getItem(REFERRAL_STORAGE_KEY))
    const nextReferralCode = queryReferralCode ?? storedReferralCode

    if (nextReferralCode) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, nextReferralCode)
      setReferralCode(nextReferralCode)
    }
  }, [])

  const activePlans = useMemo(
    () => plans.filter((plan) => !plan.status || plan.status === 'ACTIVE'),
    [plans]
  )

  const handlePurchase = async (plan: DiscountPlanItem) => {
    setPurchasingPlanId(plan.id)
    setPaymentState({ status: 'idle' })

    try {
      const purchase = await apiClient.post<PurchaseResponse>('/user-plans', {
        planId: plan.id,
        ...(referralCode ? { referralCode } : {}),
      })
      const paymentId = purchase.paymentId || purchase.payment?.id

      if (!paymentId) {
        throw new Error('شناسه پرداخت دریافت نشد.')
      }

      setPaymentState({
        status: 'pending',
        paymentId,
        planName: purchase.plan?.name || purchase.plan?.title || plan.name,
      })
      setPurchasingPlanId(null)
    } catch (error) {
      setPaymentState({ status: 'error', ...getPurchaseErrorMessage(error) })
      setPurchasingPlanId(null)
    }
  }

  const handleDevPaymentSuccess = async () => {
    if (paymentState.status !== 'pending') return

    setConfirmingPayment(true)

    try {
      const payment = await apiClient.post<PaymentSuccessResponse>(
        `/payments/${paymentState.paymentId}/success`,
        {}
      )

      setPaymentState({
        status: 'success',
        message: 'پرداخت با موفقیت ثبت شد و طرح شما فعال گردید.',
        data: payment,
      })
      localStorage.removeItem(REFERRAL_STORAGE_KEY)
      setReferralCode(null)
    } catch (error) {
      setPaymentState({
        status: 'error',
        message: error instanceof Error ? error.message : 'پرداخت با خطا مواجه شد.',
      })
    } finally {
      setConfirmingPayment(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="خرید طرح"
        description="طرح مورد نظر خود را انتخاب کنید و فرآیند خرید را تکمیل نمایید."
      />

      {paymentState.status === 'pending' && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <CreditCard className="size-4" />
          <AlertDescription>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">درخواست پرداخت ایجاد شد.</p>
                <p className="mt-1 text-sm">
                  برای طرح {paymentState.planName} می‌توانید پرداخت آزمایشی را تکمیل کنید.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleDevPaymentSuccess}
                disabled={confirmingPayment}
                className="shrink-0"
              >
                {confirmingPayment ? (
                  <>
                    <Loader2 className="ml-2 size-4 animate-spin" />
                    در حال ثبت...
                  </>
                ) : (
                  'تکمیل پرداخت آزمایشی'
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {paymentState.status === 'success' && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="size-4" />
          <AlertDescription>{paymentState.message}</AlertDescription>
        </Alert>
      )}

      {paymentState.status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{paymentState.message}</span>
              {paymentState.needsProfile && (
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href="/user/profile">رفتن به پروفایل</Link>
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {loadingPlans ? (
        <PlanLoadingSkeleton />
      ) : plansError ? (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="size-12 text-destructive" />
            <p className="font-medium text-destructive">{plansError}</p>
            <Button variant="outline" onClick={fetchPlans}>
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      ) : activePlans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CreditCard className="size-7" />
            </div>
            <p className="text-sm text-muted-foreground">
              در حال حاضر طرح فعالی برای نمایش وجود ندارد.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {activePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isPurchasing={purchasingPlanId === plan.id}
              disabled={
                Boolean(purchasingPlanId) ||
                confirmingPayment ||
                paymentState.status === 'pending'
              }
              onPurchase={handlePurchase}
            />
          ))}
        </div>
      )}
    </div>
  )
}
