'use client'

import { useState } from 'react'
import { EmptyState, PageHeader } from '@/components/shared'
import { apiClient } from '@/lib/api-client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/utils/formatters'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileText,
  Hash,
  Loader2,
  Search,
  ShieldCheck,
  User,
  UserSearch,
} from 'lucide-react'

type PlanHolderLookupResult = {
  hasActivePlan: boolean
  status: string
  planHolder: {
    firstName: string | null
    lastName: string | null
  } | null
  plans: {
    planTitle: string
    startDate: string
    endDate: string
  }[]
}

type VisitCreateResult = {
  visitId: string
  status: string
  visitedAt: string | null
  createdAt: string
  plan: {
    title: string
    endDate: string
  }
  planHolder: {
    firstName: string | null
    lastName: string | null
  }
}

function maskNationalCode(value: string) {
  if (value.length <= 4) return value
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`
}

function getPlanHolderName(result: PlanHolderLookupResult) {
  const firstName = result.planHolder?.firstName || ''
  const lastName = result.planHolder?.lastName || ''
  return `${firstName} ${lastName}`.trim() || 'ثبت نشده'
}

function lookupErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'خطا در بررسی وضعیت طرح. لطفاً دوباره تلاش کنید.'
}

function visitErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'خطا در ثبت ویزیت. لطفاً دوباره تلاش کنید.'
}

function LookupLoadingState() {
  return (
    <Card className="mx-auto max-w-3xl rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
      <CardContent className="space-y-4 p-6">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function DoctorPatientsPage() {
  const [nationalCode, setNationalCode] = useState('')
  const [notes, setNotes] = useState('')
  const [lookupResult, setLookupResult] = useState<PlanHolderLookupResult | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [visitMessage, setVisitMessage] = useState<string | null>(null)
  const [visitError, setVisitError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isCreatingVisit, setIsCreatingVisit] = useState(false)
  const [visitRegistered, setVisitRegistered] = useState(false)

  const handleNationalCodeChange = (value: string) => {
    const nextValue = value.replace(/\D/g, '').slice(0, 10)
    setNationalCode(nextValue)
    setLookupResult(null)
    setValidationError(null)
    setLookupError(null)
    setVisitMessage(null)
    setVisitError(null)
    setVisitRegistered(false)
  }

  const validateNationalCode = () => {
    if (!/^\d{10}$/.test(nationalCode.trim())) {
      setValidationError('کد ملی باید ۱۰ رقم باشد.')
      return false
    }

    setValidationError(null)
    return true
  }

  const handleLookup = async () => {
    if (!validateNationalCode()) {
      setLookupResult(null)
      return
    }

    setIsLookingUp(true)
    setLookupError(null)
    setLookupResult(null)
    setVisitMessage(null)
    setVisitError(null)
    setVisitRegistered(false)

    try {
      const res = await apiClient.get<PlanHolderLookupResult>(
        `/plan-holders/lookup?nationalCode=${encodeURIComponent(nationalCode.trim())}`
      )

      if (!res.success || !res.data) {
        throw new Error(res.error?.message || res.message || 'خطا در بررسی وضعیت طرح.')
      }

      setLookupResult(res.data)
    } catch (error) {
      setLookupError(lookupErrorMessage(error))
    } finally {
      setIsLookingUp(false)
    }
  }

  const handleCreateVisit = async () => {
    if (isCreatingVisit || !lookupResult?.hasActivePlan || !validateNationalCode()) return

    setIsCreatingVisit(true)
    setVisitError(null)
    setVisitMessage(null)

    try {
      await apiClient.post<VisitCreateResult>('/visits', {
        nationalCode: nationalCode.trim(),
        ...(notes.trim() ? { notes: notes.trim().slice(0, 1000) } : {}),
      })

      setVisitMessage('ویزیت با موفقیت ثبت شد.')
      setVisitRegistered(true)
    } catch (error) {
      setVisitError(visitErrorMessage(error))
    } finally {
      setIsCreatingVisit(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLookingUp) {
      handleLookup()
    }
  }

  const primaryPlan = lookupResult?.plans[0]
  const canCreateVisit = Boolean(lookupResult?.hasActivePlan)

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="جستجوی بیمار"
        description="با وارد کردن کد ملی، وضعیت طرح فعال بیمار را بررسی و در صورت اعتبار، ویزیت را ثبت کنید."
      />

      <Card className="mx-auto max-w-xl rounded-2xl border border-slate-100/60 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-center gap-2 text-base">
            <UserSearch className="size-4 text-emerald-600" />
            بررسی وضعیت طرح
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nationalCode">کد ملی بیمار</Label>
              <div className="relative">
                <Hash className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="nationalCode"
                  type="tel"
                  value={nationalCode}
                  onChange={(event) => handleNationalCodeChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="کد ملی ۱۰ رقمی"
                  inputMode="numeric"
                  maxLength={10}
                  dir="ltr"
                  className="h-12 rounded-xl pr-10 text-center font-mono text-lg tracking-widest"
                  aria-invalid={Boolean(validationError)}
                />
              </div>
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
            </div>

            <Button
              onClick={handleLookup}
              disabled={isLookingUp || nationalCode.trim().length !== 10}
              className="h-12 w-full gap-2 rounded-xl text-base shadow-sm"
            >
              {isLookingUp ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              بررسی وضعیت طرح
            </Button>
          </div>
        </CardContent>
      </Card>

      {lookupError && (
        <Alert variant="destructive" className="mx-auto max-w-xl">
          <AlertTriangle className="size-4" />
          <AlertDescription>{lookupError}</AlertDescription>
        </Alert>
      )}

      {visitMessage && (
        <Alert className="mx-auto max-w-xl border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="size-4" />
          <AlertDescription>{visitMessage}</AlertDescription>
        </Alert>
      )}

      {visitError && (
        <Alert variant="destructive" className="mx-auto max-w-xl">
          <AlertTriangle className="size-4" />
          <AlertDescription>{visitError}</AlertDescription>
        </Alert>
      )}

      {isLookingUp ? (
        <LookupLoadingState />
      ) : lookupResult ? (
        lookupResult.hasActivePlan ? (
          <Card className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-emerald-200/70 bg-card shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-emerald-900/50">
            <CardHeader className="bg-gradient-to-l from-emerald-500/10 via-teal-500/5 to-background">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="size-5 text-emerald-600" />
                  طرح فعال یافت شد
                </CardTitle>
                <Badge className="w-fit bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {lookupResult.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100/70 bg-background/70 p-4 dark:border-slate-800/70">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="size-4" />
                    بیمار
                  </div>
                  <p className="mt-2 text-sm font-semibold">{getPlanHolderName(lookupResult)}</p>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {maskNationalCode(nationalCode)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100/70 bg-background/70 p-4 dark:border-slate-800/70">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="size-4" />
                    طرح
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {primaryPlan?.planTitle || 'طرح فعال'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100/70 bg-background/70 p-4 dark:border-slate-800/70">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="size-4" />
                    اعتبار
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {primaryPlan ? `${formatDate(primaryPlan.startDate)} تا ${formatDate(primaryPlan.endDate)}` : 'نامشخص'}
                  </p>
                </div>
              </div>

              {lookupResult.plans.length > 1 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">طرح‌های فعال</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {lookupResult.plans.map((plan, index) => (
                      <div key={`${index}-${plan.planTitle}-${plan.endDate}`} className="rounded-2xl border border-slate-100/70 bg-background/70 p-3 text-sm dark:border-slate-800/70">
                        <p className="font-medium">{plan.planTitle}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(plan.startDate)} تا {formatDate(plan.endDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="visitNotes">یادداشت ویزیت (اختیاری)</Label>
                <Textarea
                  id="visitNotes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value.slice(0, 1000))}
                  placeholder="در صورت نیاز توضیح کوتاهی برای این ویزیت ثبت کنید."
                  rows={3}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">
                  حداکثر ۱۰۰۰ کاراکتر
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleCreateVisit}
                  disabled={!canCreateVisit || isCreatingVisit || visitRegistered}
                  className="h-12 w-full gap-2 rounded-xl text-base shadow-sm sm:w-auto sm:min-w-44"
                >
                  {isCreatingVisit ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      در حال ثبت ویزیت...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      ثبت ویزیت
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mx-auto max-w-xl rounded-2xl border border-amber-200/80 bg-amber-50/60 shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-amber-900/50 dark:bg-amber-950/20">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <AlertTriangle className="size-7" />
              </div>
              <h2 className="text-base font-semibold">طرح فعالی برای این کد ملی یافت نشد.</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                وضعیت فعلی: {lookupResult.status || 'نامشخص'}
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <EmptyState
          icon={<UserSearch />}
          title="جستجوی بیمار"
          description="کد ملی ۱۰ رقمی بیمار را وارد کنید تا وضعیت طرح فعال او بررسی شود."
          className="mx-auto max-w-xl border-dashed py-12 shadow-none"
        />
      )}
    </div>
  )
}
