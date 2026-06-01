'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { PageHeader, StatusBadge, StatCard } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, toPersianNum } from '@/utils/formatters'
import {
  AlertCircle,
  CalendarDays,
  ClipboardList,
  FileText,
  MessageSquare,
  RefreshCw,
  Star,
  Stethoscope,
} from 'lucide-react'

type UserVisit = {
  visitId: string
  status: string
  visitedAt: string | null
  createdAt: string
  doctorName?: string | null
  doctorSpecialty?: string | null
  notes?: string | null
  plan?: {
    title?: string | null
    endDate?: string | null
  } | null
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

const reviewStatusLabels: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تایید شده',
  REJECTED: 'رد شده',
}

const reviewStatusClasses: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function formatOptionalDate(date?: string | null) {
  return date ? formatDate(date) : 'ثبت نشده'
}

function getDoctorName(visit: UserVisit) {
  return visit.doctorName || visit.doctor?.name || 'پزشک ثبت نشده'
}

function getDoctorSpecialty(visit: UserVisit) {
  return visit.doctorSpecialty || visit.doctor?.specialty || 'تخصص ثبت نشده'
}

function getVisitNote(visit: UserVisit) {
  return visit.notes || null
}

function ReviewStatus({ review }: { review: ReviewItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">نظر شما ثبت شده است</span>
      <Badge
        variant="secondary"
        className={reviewStatusClasses[review.status] || 'bg-muted text-muted-foreground'}
      >
        {reviewStatusLabels[review.status] || review.status}
      </Badge>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
      <Card>
        <CardContent className="space-y-4 p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
              <Skeleton className="hidden h-8 w-24 sm:block" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default function UserContractsPage() {
  const [visits, setVisits] = useState<UserVisit[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [reviewVisit, setReviewVisit] = useState<UserVisit | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSavingReview, setIsSavingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const isSavingRef = useRef(false)

  const reviewsByVisit = useMemo(
    () =>
      reviews.reduce<Record<string, ReviewItem>>((acc, review) => {
        if (review.visitId) acc[review.visitId] = review
        return acc
      }, {}),
    [reviews]
  )

  const stats = useMemo(() => {
    return {
      total: visits.length,
      reviewed: visits.filter((visit) => reviewsByVisit[visit.visitId]).length,
      pendingReview: visits.filter((visit) => !reviewsByVisit[visit.visitId]).length,
    }
  }, [reviewsByVisit, visits])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setFeedback(null)

    try {
      const [visitsRes, reviewsRes] = await Promise.all([
        apiClient.get<UserVisit[]>('/visits/my?take=50'),
        apiClient.get<ReviewItem[]>('/reviews/my?take=100'),
      ])

      if (!visitsRes.success || !visitsRes.data) {
        throw new Error('خطا در دریافت سوابق ویزیت‌ها')
      }

      setVisits(Array.isArray(visitsRes.data) ? visitsRes.data : [])
      setReviews(
        reviewsRes.success && Array.isArray(reviewsRes.data)
          ? reviewsRes.data
          : []
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطا در ارتباط با سرور'
      setVisits([])
      setReviews([])
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openReviewDialog = (visit: UserVisit) => {
    setReviewVisit(visit)
    setRating(0)
    setComment('')
    setReviewError(null)
  }

  const closeReviewDialog = () => {
    if (isSavingReview) return
    setReviewVisit(null)
    setRating(0)
    setComment('')
    setReviewError(null)
  }

  const submitReview = async () => {
    if (!reviewVisit || isSavingRef.current) return

    if (rating < 1 || rating > 5) {
      setReviewError('لطفا امتیاز خود را از ۱ تا ۵ انتخاب کنید.')
      return
    }

    if (comment.trim().length > 1000) {
      setReviewError('متن نظر نباید بیشتر از ۱۰۰۰ کاراکتر باشد.')
      return
    }

    isSavingRef.current = true
    setIsSavingReview(true)
    setReviewError(null)
    setFeedback(null)

    try {
      const createdReview = await apiClient.post<ReviewItem>('/reviews', {
        visitId: reviewVisit.visitId,
        rating,
        comment: comment.trim() || undefined,
      })

      setReviews((prev) => [
        createdReview,
        ...prev.filter((review) => review.visitId !== createdReview.visitId),
      ])
      setFeedback({
        type: 'success',
        message: 'نظر شما با موفقیت ثبت شد و پس از تایید نمایش داده می‌شود.',
      })
      setReviewVisit(null)
      setRating(0)
      setComment('')
      setReviewError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطا در ثبت نظر'
      setReviewError(message)
      setFeedback({ type: 'error', message })
    } finally {
      isSavingRef.current = false
      setIsSavingReview(false)
    }
  }

  if (isLoading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="size-12 text-destructive" />
          <p className="font-medium text-destructive">{error}</p>
          <Button variant="outline" className="gap-2" onClick={fetchData}>
            <RefreshCw className="size-4" />
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="سوابق ویزیت‌های من"
        description="ویزیت‌های ثبت‌شده شما در سامانه حامی کارت را مشاهده و در صورت تمایل نظر خود را ثبت کنید."
      />

      {feedback && (
        <Card
          className={
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-destructive/40 bg-destructive/5 text-destructive'
          }
        >
          <CardContent className="p-4 text-sm">{feedback.message}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="کل ویزیت‌ها"
          value={toPersianNum(stats.total)}
          icon={ClipboardList}
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          title="نظرهای ثبت‌شده"
          value={toPersianNum(stats.reviewed)}
          icon={MessageSquare}
          iconClassName="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
        />
        <StatCard
          title="بدون نظر"
          value={toPersianNum(stats.pendingReview)}
          icon={Star}
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        />
      </div>

      {visits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="size-7" />
            </div>
            <div>
              <h2 className="font-semibold">هنوز ویزیتی برای شما ثبت نشده است.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                پس از استفاده از طرح‌ها، سوابق ویزیت شما در این بخش نمایش داده می‌شود.
              </p>
            </div>
            <Button asChild>
              <Link href="/user/plans">مشاهده طرح‌ها</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-primary" />
              لیست ویزیت‌ها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-3 text-right font-medium">پزشک</th>
                    <th className="py-3 text-right font-medium">تخصص</th>
                    <th className="py-3 text-right font-medium">طرح</th>
                    <th className="py-3 text-right font-medium">وضعیت ویزیت</th>
                    <th className="py-3 text-right font-medium">تاریخ ویزیت</th>
                    <th className="py-3 text-right font-medium">یادداشت پزشک</th>
                    <th className="py-3 text-right font-medium">نظر شما</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => {
                    const review = reviewsByVisit[visit.visitId]
                    const note = getVisitNote(visit)

                    return (
                      <tr key={visit.visitId} className="border-b last:border-0">
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Stethoscope className="size-4" />
                            </div>
                            <span className="font-medium">{getDoctorName(visit)}</span>
                          </div>
                        </td>
                        <td className="py-4">{getDoctorSpecialty(visit)}</td>
                        <td className="py-4">{visit.plan?.title || 'ثبت نشده'}</td>
                        <td className="py-4">
                          <StatusBadge status={visit.status} />
                        </td>
                        <td className="py-4">
                          <div className="space-y-1">
                            <p>{formatOptionalDate(visit.visitedAt)}</p>
                            <p className="text-xs text-muted-foreground">
                              ثبت: {formatOptionalDate(visit.createdAt)}
                            </p>
                          </div>
                        </td>
                        <td className="max-w-[220px] py-4">
                          <span className="line-clamp-2 text-muted-foreground">
                            {note || 'ثبت نشده'}
                          </span>
                        </td>
                        <td className="py-4">
                          {review ? (
                            <ReviewStatus review={review} />
                          ) : (
                            <Button size="sm" onClick={() => openReviewDialog(visit)}>
                              ثبت نظر
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {visits.map((visit) => {
                const review = reviewsByVisit[visit.visitId]
                const note = getVisitNote(visit)

                return (
                  <div key={visit.visitId} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{getDoctorName(visit)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {getDoctorSpecialty(visit)}
                        </p>
                      </div>
                      <StatusBadge status={visit.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4" />
                        <span>طرح: {visit.plan?.title || 'ثبت نشده'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4" />
                        <span>تاریخ ویزیت: {formatOptionalDate(visit.visitedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4" />
                        <span>ثبت در سامانه: {formatOptionalDate(visit.createdAt)}</span>
                      </div>
                    </div>

                    {note && (
                      <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm leading-6">
                        {note}
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      {review ? (
                        <ReviewStatus review={review} />
                      ) : (
                        <Button size="sm" onClick={() => openReviewDialog(visit)}>
                          ثبت نظر
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(reviewVisit)} onOpenChange={(open) => !open && closeReviewDialog()}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              ثبت نظر
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {reviewVisit && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{getDoctorName(reviewVisit)}</p>
                <p className="mt-1 text-muted-foreground">
                  {reviewVisit.plan?.title || 'طرح ثبت نشده'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>امتیاز</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={rating === value ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setRating(value)}
                    aria-label={`امتیاز ${value}`}
                  >
                    {toPersianNum(value)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewComment">نظر شما</Label>
              <Textarea
                id="reviewComment"
                value={comment}
                onChange={(event) => setComment(event.target.value.slice(0, 1000))}
                placeholder="نظر خود را بنویسید..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {toPersianNum(comment.length)} / {toPersianNum(1000)}
              </p>
            </div>

            {reviewError && (
              <p className="text-sm text-destructive">{reviewError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeReviewDialog} disabled={isSavingReview}>
              انصراف
            </Button>
            <Button onClick={submitReview} disabled={isSavingReview}>
              {isSavingReview ? 'در حال ثبت...' : 'ثبت نظر'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
