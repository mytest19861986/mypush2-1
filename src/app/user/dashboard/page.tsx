'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { DEMO_SCOPE_PHASE_1 } from '@/config/demo-scope'
import { useAuthStore } from '@/stores/auth-store'
import { useToast } from '@/hooks/use-toast'
import { EmptyState, StatusBadge } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatPriceWithUnit, getDisplayName, toPersianNum } from '@/utils/formatters'
import {
  getCurrentJalaliYearMonth,
  getJalaliMonthLength,
  jalaliDatePartsToIsoDate,
  JALALI_MONTHS,
} from '@/utils/jalali-date'
import type { UserPlanItem } from '@/types'
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  CreditCard,
  HeartPulse,
  IdCard,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Route,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  UserRound,
} from 'lucide-react'

type UserPlansResponse = {
  plans?: UserPlanItem[]
  activeCount?: number
  totalCount?: number
  referralCode?: string | null
}

type UserVisit = {
  visitId: string
  status: string
  visitedAt: string | null
  createdAt: string
  doctorName?: string | null
  doctorSpecialty?: string | null
  doctor?: {
    name?: string | null
    specialty?: string | null
  } | null
}

type ReviewItem = {
  reviewId: string
  visitId: string
  rating: number
  comment: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string
  createdAt: string
}

type ReferralCommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED' | string

type ReferralCommissionItem = {
  id: string
  amount: number
  percent: number
  status: ReferralCommissionStatus
  paidAt?: string | null
  createdAt: string
  userPlan?: {
    plan?: {
      name?: string | null
      price?: number
    } | null
  } | null
}

type ReferralCommissionResponse = {
  commissions: ReferralCommissionItem[]
  totals: {
    pending: number
    approved: number
    paid: number
    available: number
    total: number
  }
  summary: {
    totalCount: number
    pendingCount: number
    approvedCount: number
    paidCount: number
  }
}

type JalaliDateInput = {
  year: number
  month: number
  day: number
}

const quickActions: {
  title: string
  description: string
  href: string
  icon: LucideIcon
  actionLabel?: string
}[] = [
  {
    title: 'خرید یا تمدید طرح',
    description: 'انتخاب طرح مناسب و تمدید دسترسی',
    href: '/user/plans',
    icon: ShoppingCart,
  },
  {
    title: 'پزشکان طرف قرارداد',
    description: 'لیست پزشکان فعال سامانه را مشاهده کنید.',
    href: '/doctors',
    icon: Stethoscope,
    actionLabel: 'مشاهده پزشکان',
  },
  {
    title: 'تکمیل پروفایل',
    description: 'ثبت اطلاعات اصلی حساب کاربری',
    href: '/user/profile',
    icon: UserRound,
  },
  {
    title: 'سوابق ویزیت و نظرات',
    description: 'پیگیری ویزیت‌ها و وضعیت نظرها',
    href: '/user/contracts',
    icon: ClipboardList,
  },
]

const reviewStatusLabels: Record<string, string> = {
  PENDING: 'نظر در انتظار بررسی',
  APPROVED: 'نظر تایید شده',
  REJECTED: 'نظر رد شده',
}

const reviewStatusClasses: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function maskNationalCode(value?: string | null) {
  if (!value) return null
  return value.length > 4 ? `${'*'.repeat(value.length - 4)}${value.slice(-4)}` : value
}

function getDaysRemaining(endDate?: string | null) {
  if (!endDate) return null

  const end = new Date(endDate)
  if (Number.isNaN(end.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000))
}

function getDoctorName(visit: UserVisit) {
  return visit.doctorName || visit.doctor?.name || 'پزشک ثبت نشده'
}

function getDoctorSpecialty(visit: UserVisit) {
  return visit.doctorSpecialty || visit.doctor?.specialty || 'تخصص ثبت نشده'
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

function DashboardHeader({
  displayName,
  activePlan,
  profileComplete,
}: {
  displayName: string
  activePlan?: UserPlanItem
  profileComplete: boolean
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
      <div className="bg-gradient-to-l from-primary/10 via-sky-500/5 to-background p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-background/70 text-primary">
                <HeartPulse className="ml-1 size-3.5" />
                حامی کارت
              </Badge>
              <Badge variant="secondary" className="bg-card text-muted-foreground">
                {activePlan ? 'طرح فعال دارید' : 'آماده شروع'}
              </Badge>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                داشبورد کاربری
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                وضعیت طرح، سوابق ویزیت و مسیرهای اصلی حساب خود را یکجا مدیریت کنید.
              </p>
            </div>
            <p className="text-base font-semibold text-card-foreground">
              {displayName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <div className="rounded-2xl border border-slate-100/60 bg-card/80 p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
              <p className="text-xs text-muted-foreground">طرح فعلی</p>
              <p className="mt-2 truncate text-sm font-semibold">
                {activePlan?.plan.name || 'بدون طرح فعال'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100/60 bg-card/80 p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
              <p className="text-xs text-muted-foreground">پروفایل</p>
              <p className="mt-2 text-sm font-semibold">
                {profileComplete ? 'کامل' : 'نیازمند تکمیل'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string
  icon: LucideIcon
  tone?: 'primary' | 'success' | 'warning' | 'blue'
}) {
  return (
    <Card className="rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
      <CardContent className="min-h-28 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <p className="mt-2 truncate text-3xl font-bold text-card-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}

function MembershipCard({
  displayName,
  nationalCode,
  activePlan,
}: {
  displayName: string
  nationalCode?: string | null
  activePlan?: UserPlanItem
}) {
  const maskedNationalCode = maskNationalCode(nationalCode)
  const daysRemaining = getDaysRemaining(activePlan?.endDate)

  return (
    <Card className="overflow-hidden rounded-2xl border border-transparent bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
      <CardContent className="p-0">
        <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 p-5 text-white sm:p-6">
          <div className="flex min-h-72 flex-col justify-between gap-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <HeartPulse className="size-4" />
                  <span>حامی کارت دیجیتال</span>
                </div>
                <h2 className="mt-4 text-2xl font-bold leading-9">{displayName}</h2>
                {maskedNationalCode ? (
                  <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
                    <IdCard className="size-4" />
                    <span>کد ملی: {toPersianNum(maskedNationalCode)}</span>
                  </p>
                ) : null}
              </div>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <CreditCard className="size-6" />
              </div>
            </div>

            {activePlan ? (
              <div className="space-y-6">
                <div className="border-t border-white/15 pt-5">
                  <div className="min-w-0">
                    <p className="text-xs text-white/70">طرح فعال</p>
                    <p className="mt-1 truncate text-lg font-semibold text-white">{activePlan.plan.name}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-5">
                  <div className="flex items-end gap-5">
                    <div>
                      <p className="text-xs text-white/70">شروع</p>
                      <p className="mt-1 text-sm font-medium text-white">{formatDate(activePlan.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/70">پایان</p>
                      <p className="mt-1 text-sm font-medium text-white">{formatDate(activePlan.endDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    {daysRemaining !== null ? (
                      <div className="text-left">
                        <p className="text-xs text-white/70">مانده تا پایان طرح</p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {daysRemaining > 0
                            ? `${toPersianNum(daysRemaining)} روز`
                            : 'پایان یافته'}
                        </p>
                      </div>
                    ) : null}
                    <StatusBadge status={activePlan.status} className="bg-white/90 text-slate-800" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
                <p className="text-lg font-bold">هنوز طرح فعالی ندارید.</p>
                <p className="mt-2 text-sm leading-7 text-white/75">
                  برای استفاده از تخفیف پزشکان طرف قرارداد، یک طرح حامی کارت انتخاب کنید.
                </p>
                <Button asChild className="mt-5 bg-white text-slate-900 hover:bg-white/90">
                  <Link href="/user/plans">
                    <ShoppingCart className="ml-2 size-4" />
                    خرید طرح حامی کارت
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActionsCard() {
  return (
    <Card className="rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="size-5 text-primary" />
          مسیرهای سریع
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon

          return (
            <Link key={action.href} href={action.href} className="group">
              <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-transparent bg-background/70 p-3 transition-all hover:border-primary/10 hover:bg-primary/[0.03] hover:shadow-sm dark:hover:bg-primary/5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{action.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    {action.description}
                  </p>
                  {action.actionLabel ? (
                    <span className="mt-2 inline-flex text-xs font-semibold text-primary">
                      {action.actionLabel}
                    </span>
                  ) : null}
                </div>
                <ArrowLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1" />
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

function RecentVisitsCard({
  visits,
  reviewsByVisit,
}: {
  visits: UserVisit[]
  reviewsByVisit: Record<string, ReviewItem>
}) {
  const latestVisits = visits.slice(0, 5)

  return (
    <Card className="rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-5 text-primary" />
              ویزیت‌های اخیر
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              آخرین مراجعه‌های ثبت‌شده و وضعیت نظر شما
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href="/user/contracts">
              مشاهده همه
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {latestVisits.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-100/70 bg-background dark:border-slate-800/70">
            <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_1fr] gap-3 border-b border-slate-100/70 bg-muted/20 px-4 py-3 text-xs font-medium text-muted-foreground dark:border-slate-800/70 md:grid">
              <span>پزشک</span>
              <span>تخصص</span>
              <span>تاریخ ویزیت</span>
              <span>وضعیت نظر</span>
            </div>
            <div className="divide-y">
              {latestVisits.map((visit) => {
                const review = reviewsByVisit[visit.visitId]
                const date = visit.visitedAt || visit.createdAt

                return (
                  <div
                    key={visit.visitId}
                    className="grid gap-3 p-4 md:grid-cols-[1.2fr_1fr_0.8fr_1fr] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-card-foreground">
                        {getDoctorName(visit)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground md:hidden">
                        {getDoctorSpecialty(visit)}
                      </p>
                    </div>
                    <p className="hidden truncate text-sm text-muted-foreground md:block">
                      {getDoctorSpecialty(visit)}
                    </p>
                    <Badge variant="outline" className="w-fit gap-1">
                      <CalendarDays className="size-3.5" />
                      {formatDate(date)}
                    </Badge>
                    {review ? (
                      <Badge
                        variant="secondary"
                        className={`w-fit ${reviewStatusClasses[review.status] || 'bg-muted text-muted-foreground'}`}
                      >
                        {reviewStatusLabels[review.status] || review.status}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="w-fit bg-muted text-muted-foreground">
                        نظر ثبت نشده
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="py-4">
            <EmptyState
              icon={<Stethoscope />}
              title="هنوز ویزیتی برای شما ثبت نشده است."
              description="پس از مراجعه به پزشک طرف قرارداد، سوابق ویزیت اینجا نمایش داده می‌شود."
              action={
                <Button asChild>
                  <Link href="/doctors">مشاهده پزشکان طرف قرارداد</Link>
                </Button>
              }
              className="border-dashed py-12 shadow-none sm:py-14"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PlanSummaryCard({ plans }: { plans: UserPlanItem[] }) {
  const activePlans = plans.filter((plan) => plan.status === 'ACTIVE')
  const visiblePlans = plans.slice(0, 3)

  return (
    <Card className="rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-5 text-primary" />
              خلاصه طرح‌ها
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              وضعیت طرح‌های ثبت‌شده در حساب شما
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href="/user/plans">
              طرح‌ها
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {visiblePlans.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100/70 bg-background/70 p-4 dark:border-slate-800/70">
                <p className="text-xs text-muted-foreground">طرح فعال</p>
                <p className="mt-2 text-xl font-bold">{toPersianNum(activePlans.length)}</p>
              </div>
              <div className="rounded-2xl border border-slate-100/70 bg-background/70 p-4 dark:border-slate-800/70">
                <p className="text-xs text-muted-foreground">کل طرح‌ها</p>
                <p className="mt-2 text-xl font-bold">{toPersianNum(plans.length)}</p>
              </div>
            </div>
            {visiblePlans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-slate-100/70 bg-background/70 p-4 dark:border-slate-800/70">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{plan.plan.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(plan.startDate)} تا {formatDate(plan.endDate)}
                    </p>
                  </div>
                  <StatusBadge status={plan.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200/80 bg-background/70 p-5 dark:border-slate-800/80">
            <p className="font-semibold">طرحی برای حساب شما ثبت نشده است.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              برای شروع استفاده از خدمات، یک طرح حامی کارت تهیه کنید.
            </p>
            <Button asChild className="mt-4">
              <Link href="/user/plans">
                <ShoppingCart className="ml-2 size-4" />
                خرید طرح حامی کارت
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProfileCompletionCard({ nationalCode }: { nationalCode?: string | null }) {
  const isComplete = Boolean(nationalCode)

  return (
    <Card className="rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {isComplete ? (
            <ShieldCheck className="size-5 text-primary" />
          ) : (
            <AlertCircle className="size-5 text-amber-600" />
          )}
          وضعیت پروفایل
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isComplete ? (
          <div className="rounded-2xl border border-slate-100/70 bg-background/70 p-4 dark:border-slate-800/70">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">اطلاعات اصلی حساب شما ثبت شده است.</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  ثبت کد ملی برای اتصال طرح‌ها و مشاهده سوابق ضروری است.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
            <p className="text-sm font-semibold">کد ملی ثبت نشده است.</p>
            <p className="mt-2 text-sm leading-6">
              ثبت کد ملی برای اتصال طرح‌ها و مشاهده سوابق ضروری است.
            </p>
          </div>
        )}
        <Button asChild variant={isComplete ? 'outline' : 'default'} className="w-full">
          <Link href="/user/profile">تکمیل پروفایل</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function ReferralCodeCard({ referralCode }: { referralCode?: string | null }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  if (!referralCode) return null

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || origin).replace(/\/$/, '')
  const referralLink = baseUrl
    ? `${baseUrl}/auth/login?ref=${encodeURIComponent(referralCode)}`
    : ''
  const handleCopy = async () => {
    if (!referralLink) return

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralLink)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = referralLink
        textArea.setAttribute('readonly', 'true')
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        const didCopy = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (!didCopy) throw new Error('COPY_FAILED')
      }

      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
      toast({ title: 'موفق', description: 'لینک معرفی کپی شد.' })
    } catch {
      setCopied(false)
      toast({
        title: 'خطا',
        description: 'کپی لینک معرفی ناموفق بود. لطفا دوباره تلاش کنید.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className="rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Copy className="size-5 text-primary" />
          لینک معرفی شما
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          این لینک را برای معرفی کاربران جدید ارسال کنید.
        </p>
        <div className="space-y-3 rounded-2xl border border-slate-100/70 bg-background/70 p-3 dark:border-slate-800/70">
          <div className="space-y-2">
            <Label htmlFor="dashboard-referral-code">کد معرفی</Label>
            <Input
              id="dashboard-referral-code"
              value={referralCode}
              readOnly
              dir="ltr"
              className="h-11 select-all font-mono text-base font-semibold"
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={referralLink || '...'}
              readOnly
              dir="ltr"
              aria-label="لینک معرفی"
              className="h-11 min-w-0 select-all font-mono text-sm"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="h-11 shrink-0">
              {copied ? (
                <>
                  <CheckCircle2 className="ml-2 size-4" />
                  کپی شد
                </>
              ) : (
                <>
                  <Copy className="ml-2 size-4" />
                  کپی
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const referralCommissionStatusLabels: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'قابل برداشت',
  PAID: 'پرداخت‌شده',
  CANCELLED: 'لغو شده',
}

function getSafeMonthLength(date: JalaliDateInput) {
  try {
    return getJalaliMonthLength(date.year, date.month)
  } catch {
    return 31
  }
}

function clampJalaliDay(date: JalaliDateInput) {
  const maxDay = getSafeMonthLength(date)
  return {
    ...date,
    day: Math.min(Math.max(date.day, 1), maxDay),
  }
}

function JalaliDateFields({
  title,
  value,
  onChange,
}: {
  title: string
  value: JalaliDateInput
  onChange: (value: JalaliDateInput) => void
}) {
  const dayCount = getSafeMonthLength(value)
  const days = Array.from({ length: dayCount }, (_, index) => index + 1)

  const updateValue = (next: Partial<JalaliDateInput>) => {
    onChange(clampJalaliDay({ ...value, ...next }))
  }

  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-2">
        <Input
          value={value.year}
          onChange={(event) => {
            const year = Number(event.target.value.replace(/\D/g, '').slice(0, 4))
            if (Number.isInteger(year) && year > 0) updateValue({ year })
          }}
          inputMode="numeric"
          dir="ltr"
          aria-label={`${title} - سال`}
        />
        <Select
          value={String(value.month)}
          onValueChange={(selectedMonth) => updateValue({ month: Number(selectedMonth) })}
        >
          <SelectTrigger aria-label={`${title} - ماه`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JALALI_MONTHS.map((month) => (
              <SelectItem key={month.value} value={String(month.value)}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(value.day)}
          onValueChange={(selectedDay) => updateValue({ day: Number(selectedDay) })}
        >
          <SelectTrigger aria-label={`${title} - روز`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {days.map((day) => (
              <SelectItem key={day} value={String(day)}>
                {toPersianNum(day)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function ReferralCommissionReport() {
  const currentJalaliMonth = useMemo(() => getCurrentJalaliYearMonth(), [])
  const defaultToDay = useMemo(
    () => getSafeMonthLength({ ...currentJalaliMonth, day: 1 }),
    [currentJalaliMonth]
  )
  const [fromDate, setFromDate] = useState<JalaliDateInput>({
    ...currentJalaliMonth,
    day: 1,
  })
  const [toDate, setToDate] = useState<JalaliDateInput>({
    ...currentJalaliMonth,
    day: defaultToDay,
  })
  const [report, setReport] = useState<ReferralCommissionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const from = jalaliDatePartsToIsoDate(fromDate.year, fromDate.month, fromDate.day)
      const to = jalaliDatePartsToIsoDate(toDate.year, toDate.month, toDate.day)
      const response = await apiClient.get<ReferralCommissionResponse>(
        `/commissions/my?sourceType=USER_REFERRAL&from=${from}&to=${to}`
      )

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || response.message || 'خطا در دریافت گزارش پورسانت')
      }

      setReport(response.data)
    } catch (err) {
      setReport(null)
      setError(err instanceof Error ? err.message : 'خطا در دریافت گزارش پورسانت')
    } finally {
      setIsLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    void fetchReport()
  }, [fetchReport])

  const totals = report?.totals ?? {
    pending: 0,
    approved: 0,
    paid: 0,
    available: 0,
    total: 0,
  }
  const commissions = report?.commissions ?? []

  return (
    <Card className="rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="size-5 text-primary" />
              گزارش پورسانت رفرال
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              پورسانت‌های در انتظار بررسی در مبلغ قابل برداشت محاسبه نمی‌شوند.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchReport()} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="ml-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="ml-2 size-4" />
            )}
            اعمال فیلتر
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <JalaliDateFields title="از تاریخ" value={fromDate} onChange={setFromDate} />
          <JalaliDateFields title="تا تاریخ" value={toDate} onChange={setToDate} />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { title: 'کل پورسانت', value: totals.total },
            { title: 'در انتظار بررسی', value: totals.pending },
            { title: 'قابل برداشت', value: totals.available },
            { title: 'پرداخت‌شده', value: totals.paid },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-100/70 bg-background/70 p-4 dark:border-slate-800/70">
              <p className="text-xs text-muted-foreground">{item.title}</p>
              <p className="mt-2 truncate text-sm font-bold sm:text-base">
                {formatPriceWithUnit(item.value)}
              </p>
            </div>
          ))}
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200/80 bg-background/70 p-5 text-center text-sm text-muted-foreground dark:border-slate-800/80">
            پورسانت رفرالی در این بازه ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100/70 bg-background dark:border-slate-800/70">
            <div className="hidden grid-cols-[1fr_1fr_1fr_1fr] gap-3 border-b border-slate-100/70 bg-muted/20 px-4 py-3 text-xs font-medium text-muted-foreground dark:border-slate-800/70 md:grid">
              <span>تاریخ</span>
              <span>طرح</span>
              <span>مبلغ</span>
              <span>وضعیت</span>
            </div>
            <div className="divide-y">
              {commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_1fr] md:items-center"
                >
                  <span className="text-sm text-muted-foreground">{formatDate(commission.createdAt)}</span>
                  <span className="truncate text-sm font-medium">
                    {commission.userPlan?.plan?.name || 'طرح ثبت‌شده'}
                  </span>
                  <span className="text-sm font-semibold">{formatPriceWithUnit(commission.amount)}</span>
                  <StatusBadge
                    status={commission.status}
                    label={referralCommissionStatusLabels[commission.status] || commission.status}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProductGuidanceCard() {
  const steps = ['خرید طرح', 'انتخاب پزشک طرف قرارداد', 'استفاده از تخفیف همان پزشک هنگام مراجعه']

  return (
    <Card className="rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-5 text-primary" />
          حامی کارت چگونه استفاده می‌شود؟
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {toPersianNum(index + 1)}
              </div>
              <p className="text-sm font-medium">{step}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-100/70 bg-background/70 p-4 dark:border-slate-800/70">
          <p className="text-sm leading-6 text-muted-foreground">
            درصد تخفیف برای هر پزشک متفاوت است. هنگام انتخاب پزشک طرف قرارداد، جزئیات همان پزشک را بررسی کنید.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function UserDashboardPage() {
  const { user } = useAuthStore()
  const [plans, setPlans] = useState<UserPlanItem[]>([])
  const [visits, setVisits] = useState<UserVisit[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [safeReferralCode, setSafeReferralCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true)
      setError(null)

      try {
        const [plansRes, visitsRes, reviewsRes] = await Promise.all([
          apiClient.get<UserPlansResponse | UserPlanItem[]>('/user-plans/my'),
          apiClient.get<UserVisit[]>('/visits/my?take=100'),
          apiClient.get<ReviewItem[]>('/reviews/my?take=100'),
        ])

        if (!plansRes.success || !plansRes.data) {
          throw new Error('خطا در دریافت وضعیت طرح‌ها')
        }

        const plansData = Array.isArray(plansRes.data)
          ? plansRes.data
          : plansRes.data.plans

        setPlans(Array.isArray(plansData) ? plansData : [])
        setSafeReferralCode(Array.isArray(plansRes.data) ? null : plansRes.data.referralCode ?? null)
        setVisits(visitsRes.success && Array.isArray(visitsRes.data) ? visitsRes.data : [])
        setReviews(reviewsRes.success && Array.isArray(reviewsRes.data) ? reviewsRes.data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در ارتباط با سرور')
        setPlans([])
        setSafeReferralCode(null)
        setVisits([])
        setReviews([])
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  const displayName = getDisplayName(user)
  const nationalCode = user?.profile?.nationalCode
  const profileComplete = Boolean(nationalCode)

  const activePlans = useMemo(
    () => plans.filter((plan) => plan.status === 'ACTIVE'),
    [plans]
  )

  const activePlan = activePlans[0]
  const referralCode = activePlan ? safeReferralCode : null

  const reviewsByVisit = useMemo(
    () =>
      reviews.reduce<Record<string, ReviewItem>>((acc, review) => {
        if (review.visitId) acc[review.visitId] = review
        return acc
      }, {}),
    [reviews]
  )

  const reviewedVisitCount = visits.filter((visit) => reviewsByVisit[visit.visitId]).length

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <Card className="rounded-2xl border border-destructive/30 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <CardContent className="p-6 text-center">
          <AlertCircle className="mx-auto mb-3 size-12 text-destructive" />
          <p className="font-medium text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            <RefreshCw className="ml-2 size-4" />
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <DashboardHeader
        displayName={displayName}
        activePlan={activePlan}
        profileComplete={profileComplete}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="طرح‌های فعال"
          value={toPersianNum(activePlans.length)}
          icon={CreditCard}
          tone="primary"
        />
        <StatCard
          title="ویزیت‌های ثبت‌شده"
          value={toPersianNum(visits.length)}
          icon={Stethoscope}
          tone="blue"
        />
        <StatCard
          title="نظرهای ثبت‌شده"
          value={toPersianNum(reviewedVisitCount)}
          icon={MessageSquareText}
          tone="success"
        />
        <StatCard
          title="وضعیت پروفایل"
          value={profileComplete ? 'کامل' : 'نیازمند تکمیل'}
          icon={profileComplete ? ShieldCheck : AlertCircle}
          tone={profileComplete ? 'success' : 'warning'}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-5">
          <MembershipCard
            displayName={displayName}
            nationalCode={nationalCode}
            activePlan={activePlan}
          />
          <RecentVisitsCard visits={visits} reviewsByVisit={reviewsByVisit} />
          <PlanSummaryCard plans={plans} />
          {!DEMO_SCOPE_PHASE_1 && <ReferralCommissionReport />}
        </main>

        <aside className="space-y-5">
          {!DEMO_SCOPE_PHASE_1 && <ReferralCodeCard referralCode={referralCode} />}
          <ProfileCompletionCard nationalCode={nationalCode} />
          <QuickActionsCard />
          <ProductGuidanceCard />
        </aside>
      </div>
    </div>
  )
}
