'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Star,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader, StatusBadge } from '@/components/shared'
import { useToast } from '@/hooks/use-toast'
import { ApiError, apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { formatDateTime, toPersianNum } from '@/utils/formatters'

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type StatusFilter = 'all' | ReviewStatus
type ReviewAction = 'approve' | 'reject'

interface AdminReview {
  // Internal, used for key/API only.
  reviewId: string
  // Internal identifiers from the API shape; do not render.
  visitId?: string
  doctorId?: string
  rating: number
  comment: string | null
  status: ReviewStatus
  createdAt: string
  user?: {
    name?: string | null
    profile?: {
      firstName?: string | null
      lastName?: string | null
    } | null
  } | null
  doctor?: {
    name?: string | null
    specialty?: string | null
    clinicName?: string | null
    user?: {
      profile?: {
        firstName?: string | null
        lastName?: string | null
      } | null
    } | null
  } | null
  plan?: {
    name?: string | null
  } | null
  visit?: {
    status?: string | null
    plan?: {
      name?: string | null
    } | null
    userPlan?: {
      plan?: {
        name?: string | null
      } | null
    } | null
  } | null
}

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'PENDING', label: 'در انتظار بررسی' },
  { value: 'APPROVED', label: 'تایید شده' },
  { value: 'REJECTED', label: 'رد شده' },
]

const statusLabels: Record<ReviewStatus, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
}

function getProfileName(profile?: { firstName?: string | null; lastName?: string | null } | null) {
  const firstName = profile?.firstName?.trim() ?? ''
  const lastName = profile?.lastName?.trim() ?? ''
  return `${firstName} ${lastName}`.trim()
}

function getUserName(review: AdminReview) {
  return review.user?.name?.trim() || getProfileName(review.user?.profile) || 'کاربر سامانه'
}

function getDoctorName(review: AdminReview) {
  return (
    review.doctor?.name?.trim() ||
    getProfileName(review.doctor?.user?.profile) ||
    review.doctor?.clinicName?.trim() ||
    'پزشک سامانه'
  )
}

function getPlanInfo(review: AdminReview) {
  return (
    review.plan?.name?.trim() ||
    review.visit?.plan?.name?.trim() ||
    review.visit?.userPlan?.plan?.name?.trim() ||
    'ویزیت ثبت‌شده'
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message
  return fallback
}

function ReviewRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`امتیاز ${rating} از ۵`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            'size-4',
            index < rating
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          )}
        />
      ))}
      <span className="mr-1 text-xs text-muted-foreground">
        {toPersianNum(rating)} از ۵
      </span>
    </div>
  )
}

function LoadingReviews() {
  return (
    <>
      <Card className="hidden overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm md:block">
        <CardContent className="p-0">
          <div className="p-4">
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2 p-4 pt-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-2xl border border-border/50 bg-card shadow-sm">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

export default function AdminReviewsPage() {
  const { toast } = useToast()
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [processing, setProcessing] = useState<{ id: string; action: ReviewAction } | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AdminReview | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchReviews = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const params = new URLSearchParams({ take: '50' })
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const res = await apiClient.get<AdminReview[]>(`/reviews?${params.toString()}`)

      if (res.success && Array.isArray(res.data)) {
        setReviews(res.data)
      } else {
        const message = res.error?.message || res.message || 'خطا در دریافت فهرست نظرات'
        setErrorMessage(message)
        setReviews([])
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'خطا در دریافت فهرست نظرات'))
      setReviews([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void fetchReviews()
  }, [fetchReviews])

  const pendingCount = useMemo(
    () => reviews.filter((review) => review.status === 'PENDING').length,
    [reviews]
  )

  const updateReview = (updatedReview: AdminReview) => {
    setReviews((currentReviews) =>
      currentReviews.map((review) =>
        review.reviewId === updatedReview.reviewId ? { ...review, ...updatedReview } : review
      )
    )
  }

  const handleApprove = async (review: AdminReview) => {
    if (processing || review.status !== 'PENDING') return

    setProcessing({ id: review.reviewId, action: 'approve' })
    try {
      const updatedReview = await apiClient.patch<AdminReview>(
        `/reviews/${review.reviewId}/approve`
      )
      updateReview(updatedReview)
      toast({
        title: 'موفق',
        description: 'نظر با موفقیت تأیید شد.',
      })
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در تأیید نظر'),
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget || processing || rejectTarget.status !== 'PENDING') return

    const reason = rejectReason.trim()
    setProcessing({ id: rejectTarget.reviewId, action: 'reject' })
    try {
      const updatedReview = await apiClient.patch<AdminReview>(
        `/reviews/${rejectTarget.reviewId}/reject`,
        reason ? { reason } : undefined
      )
      updateReview(updatedReview)
      setRejectTarget(null)
      setRejectReason('')
      toast({
        title: 'موفق',
        description: 'نظر با موفقیت رد شد.',
      })
    } catch (error) {
      toast({
        title: 'خطا',
        description: getErrorMessage(error, 'خطا در رد نظر'),
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const renderActions = (review: AdminReview) => {
    if (review.status !== 'PENDING') {
      return <span className="text-sm text-muted-foreground">-</span>
    }

    const isApproving = processing?.id === review.reviewId && processing.action === 'approve'
    const isRejecting = processing?.id === review.reviewId && processing.action === 'reject'
    const isProcessing = processing?.id === review.reviewId

    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!!processing}
          onClick={() => void handleApprove(review)}
        >
          {isApproving ? (
            <Loader2 className="ml-1 size-3.5 animate-spin" />
          ) : (
            <Check className="ml-1 size-3.5" />
          )}
          تأیید
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!!processing}
          className="text-destructive hover:text-destructive"
          onClick={() => {
            setRejectTarget(review)
            setRejectReason('')
          }}
        >
          {isRejecting ? (
            <Loader2 className="ml-1 size-3.5 animate-spin" />
          ) : (
            <XCircle className="ml-1 size-3.5" />
          )}
          رد
        </Button>
      </div>
    )
  }

  const renderReviewCard = (review: AdminReview) => (
    <Card key={review.reviewId} className="rounded-2xl border border-border/50 bg-card shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{getUserName(review)}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{getDoctorName(review)}</p>
          </div>
          <StatusBadge
            status={review.status}
            label={statusLabels[review.status]}
            className="shrink-0 text-xs"
          />
        </div>

        <div className="space-y-2">
          <ReviewRating rating={review.rating} />
          <p className="text-xs text-muted-foreground">{getPlanInfo(review)}</p>
          <p className="text-sm leading-7 text-foreground">
            {review.comment?.trim() || 'بدون متن نظر'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-xs text-muted-foreground">{formatDateTime(review.createdAt)}</span>
          {renderActions(review)}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت نظرات"
        description={
          <>
            بررسی، تأیید یا رد نظرات ثبت‌شده کاربران را انجام دهید.
            {(statusFilter === 'all' || statusFilter === 'PENDING') && pendingCount > 0 && (
              <span className="mr-1 font-semibold text-amber-600">
                {toPersianNum(pendingCount)} نظر در انتظار بررسی است.
              </span>
            )}
          </>
        }
      />

      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-right">
            <p className="text-sm font-medium">فیلتر وضعیت</p>
            <p className="text-xs text-muted-foreground">
              نمایش نظرات بر اساس وضعیت بررسی
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                type="button"
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingReviews />
      ) : errorMessage ? (
        <Card className="rounded-2xl border border-border/50 bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <XCircle className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">دریافت نظرات ناموفق بود.</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={() => void fetchReviews()}>
              <RefreshCw className="ml-2 size-4" />
              تلاش دوباره
            </Button>
          </CardContent>
        </Card>
      ) : reviews.length === 0 ? (
        <Card className="rounded-2xl border border-border/50 bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <MessageSquareText className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">هنوز نظری برای بررسی ثبت نشده است.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[1040px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">کاربر</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">پزشک</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">طرح / ویزیت</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">امتیاز</TableHead>
                      <TableHead className="min-w-[260px] px-4 py-3 text-right text-sm font-semibold text-muted-foreground">نظر</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">وضعیت</TableHead>
                      <TableHead className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">تاریخ ثبت</TableHead>
                      <TableHead className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review) => (
                      <TableRow key={review.reviewId} className="transition-colors hover:bg-muted/40">
                        <TableCell className="px-4 py-4">
                          <span className="text-sm font-medium">{getUserName(review)}</span>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="flex min-w-32 flex-col">
                            <span className="text-sm font-medium">{getDoctorName(review)}</span>
                            {review.doctor?.specialty && (
                              <span className="text-xs text-muted-foreground">
                                {review.doctor.specialty}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <span className="text-sm text-muted-foreground">{getPlanInfo(review)}</span>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <ReviewRating rating={review.rating} />
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <p className="max-w-md whitespace-pre-wrap text-sm leading-7">
                            {review.comment?.trim() || 'بدون متن نظر'}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <StatusBadge
                            status={review.status}
                            label={statusLabels[review.status]}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <span className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDateTime(review.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-left">
                          {renderActions(review)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3 md:hidden">
            {reviews.map(renderReviewCard)}
          </div>
        </>
      )}

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open && !processing) {
            setRejectTarget(null)
            setRejectReason('')
          }
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رد نظر</DialogTitle>
            <DialogDescription>
              در صورت نیاز دلیل رد نظر را ثبت کنید. این دلیل فقط برای گزارش داخلی استفاده می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">دلیل رد</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="اختیاری"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null)
                setRejectReason('')
              }}
              disabled={!!processing}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleReject()}
              disabled={!rejectTarget || !!processing}
            >
              {processing?.action === 'reject' && (
                <Loader2 className="ml-1 size-4 animate-spin" />
              )}
              رد نظر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
