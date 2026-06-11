'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, StatusBadge } from '@/components/shared'
import { ApiError, apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatJalaliDate, toPersianNum } from '@/utils/formatters'
import type { AuthUser } from '@/types'
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Copy,
  HandCoins,
  Hourglass,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react'

type ProfileForm = {
  firstName: string
  lastName: string
  nationalCode: string
  gender: string
  address: string
}

type SavedProfileResponse = {
  firstName: string | null
  lastName: string | null
  nationalCode: string | null
  gender?: string | null
  address?: string | null
  avatar?: string | null
  planHolderLinked?: boolean
  linkedPlansCount?: number
}

type ProfileSaveEnvelope = {
  success: boolean
  data?: SavedProfileResponse
  message?: string
  error?: {
    code: string
    message: string
  }
}

type ProfileSaveResult = SavedProfileResponse | ProfileSaveEnvelope

type ReferralCommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED' | string
type SettlementStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED' | string

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

type WalletCommissionSummary = {
  totalCommissionAmount: number
  pendingCommissionAmount: number
  approvedCommissionAmount: number
  availableBalance: number
  pendingSettlementAmount: number
  paidSettlementAmount: number
  minimumSettlementAmount: number
}

type ReferralCommissionResponse = {
  commissions: ReferralCommissionItem[]
  walletSummary?: WalletCommissionSummary
  totals?: {
    pending: number
    approved: number
    paid: number
    available: number
    total: number
    pendingSettlement?: number
    openSettlement?: number
    paidSettlement?: number
    minimumSettlementAmount?: number
  }
}

type SettlementItem = {
  id: string
  amount: number
  status: SettlementStatus
  requestedAt: string
  settledAt: string | null
  createdAt: string
}

type UserPlansResponse = {
  plans?: Array<{ status: string }>
  referralCode?: string | null
}

const PROFILE_SAVE_ERROR_MESSAGE = 'خطا در بروزرسانی پروفایل'

const emptyForm: ProfileForm = {
  firstName: '',
  lastName: '',
  nationalCode: '',
  gender: '',
  address: '',
}

function mapUserToForm(user?: AuthUser | null): ProfileForm {
  return {
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    nationalCode: user?.profile?.nationalCode || '',
    gender: user?.profile?.gender || '',
    address: user?.profile?.address || '',
  }
}

function buildSuccessMessage(saved: SavedProfileResponse) {
  if (saved.planHolderLinked && saved.linkedPlansCount && saved.linkedPlansCount > 0) {
    return `اطلاعات با موفقیت ذخیره شد. تعداد ${toPersianNum(saved.linkedPlansCount)} طرح فعال به حساب شما متصل گردید.`
  }

  if (saved.planHolderLinked) {
    return 'اطلاعات با موفقیت ذخیره شد و طرح‌های شما متصل گردید.'
  }

  return 'تغییرات با موفقیت ذخیره شد.'
}

function getActivePlanStatus(data: UserPlansResponse | Array<{ status: string }> | undefined) {
  const plans = Array.isArray(data) ? data : data?.plans
  return Array.isArray(plans) && plans.some((plan) => plan.status === 'ACTIVE')
}

function getProfileSaveErrorMessage(res: ProfileSaveResult) {
  if ('success' in res) {
    return res.error?.message || res.message || PROFILE_SAVE_ERROR_MESSAGE
  }

  return PROFILE_SAVE_ERROR_MESSAGE
}

function ReferralCodePanel({ referralCode }: { referralCode?: string | null }) {
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
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Copy className="size-4 text-primary" />
          لینک معرفی شما
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          این لینک را برای معرفی کاربران جدید ارسال کنید.
        </p>
        <div className="space-y-3 rounded-lg border bg-background p-3">
          <div className="space-y-2">
            <Label htmlFor="user-referral-code">کد معرفی</Label>
            <Input
              id="user-referral-code"
              value={referralCode}
              readOnly
              dir="ltr"
              className="h-12 select-all font-mono text-base font-semibold"
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-referral-link">لینک معرفی</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="user-referral-link"
                value={referralLink || '...'}
                readOnly
                dir="ltr"
                className="h-12 min-w-0 select-all font-mono text-sm"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button type="button" variant="outline" onClick={handleCopy} className="shrink-0">
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
        </div>
      </CardContent>
    </Card>
  )
}

const emptyWalletSummary: WalletCommissionSummary = {
  totalCommissionAmount: 0,
  pendingCommissionAmount: 0,
  approvedCommissionAmount: 0,
  availableBalance: 0,
  pendingSettlementAmount: 0,
  paidSettlementAmount: 0,
  minimumSettlementAmount: 0,
}

const commissionStatusLabels: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'قابل برداشت',
  PAID: 'پرداخت‌شده',
  CANCELLED: 'لغو شده',
}

const settlementStatusLabels: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تسویه ثبت‌شده',
  PAID: 'پرداخت‌شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
}

function formatMoney(amount: number | null | undefined) {
  return `${new Intl.NumberFormat('fa-IR').format(amount ?? 0)} تومان`
}

function normalizeSettlementAmount(value: string) {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹'
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'

  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/\D/g, '')
    .slice(0, 12)
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message
  return error instanceof Error ? error.message : fallback
}

function UserReferralCommissionPanel({ enabled }: { enabled: boolean }) {
  const { toast } = useToast()
  const [report, setReport] = useState<ReferralCommissionResponse | null>(null)
  const [settlements, setSettlements] = useState<SettlementItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [settlementAmount, setSettlementAmount] = useState('')
  const [settlementDescription, setSettlementDescription] = useState('')
  const [isRequestingSettlement, setIsRequestingSettlement] = useState(false)

  const fetchFinancialData = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const to = new Date().toISOString().slice(0, 10)
      const [commissionsRes, settlementsRes] = await Promise.all([
        apiClient.get<ReferralCommissionResponse>(
          `/commissions/my?sourceType=USER_REFERRAL&from=2000-01-01&to=${to}`
        ),
        apiClient.get<SettlementItem[]>('/settlements/my?take=50'),
      ])

      if (!commissionsRes.success || !commissionsRes.data) {
        throw new Error(
          commissionsRes.error?.message ||
            commissionsRes.message ||
            'دریافت گزارش پورسانت ناموفق بود.'
        )
      }

      if (!settlementsRes.success) {
        throw new Error(
          settlementsRes.error?.message ||
            settlementsRes.message ||
            'دریافت درخواست‌های تسویه ناموفق بود.'
        )
      }

      setReport(commissionsRes.data)
      setSettlements(Array.isArray(settlementsRes.data) ? settlementsRes.data : [])
    } catch (err) {
      setReport(null)
      setSettlements([])
      setError(getApiErrorMessage(err, 'دریافت اطلاعات پورسانت ناموفق بود.'))
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void fetchFinancialData()
  }, [fetchFinancialData])

  if (!enabled) return null

  const walletSummary = report?.walletSummary ?? emptyWalletSummary
  const commissions = report?.commissions ?? []
  const availableBalance = walletSummary.availableBalance
  const openSettlementAmount = walletSummary.pendingSettlementAmount
  const minimumSettlementAmount = walletSummary.minimumSettlementAmount
  const settlementBlockMessage =
    openSettlementAmount > 0
      ? 'یک درخواست تسویه ثبت‌شده دارید. درخواست‌های در انتظار بررسی یا تسویه ثبت‌شده باید ابتدا تعیین تکلیف شوند.'
      : minimumSettlementAmount > 0 && availableBalance < minimumSettlementAmount
        ? `حداقل مبلغ قابل درخواست تسویه ${formatMoney(minimumSettlementAmount)} است.`
        : availableBalance <= 0
          ? 'در حال حاضر موجودی قابل برداشت از پورسانت بررسی‌شده ندارید.'
          : null

  const handleSettlementSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (settlementBlockMessage) {
      toast({
        title: 'درخواست تسویه',
        description: settlementBlockMessage,
        variant: 'destructive',
      })
      return
    }

    const normalizedAmount = normalizeSettlementAmount(settlementAmount)
    const amount = Number(normalizedAmount)

    if (!normalizedAmount || !Number.isInteger(amount) || amount <= 0) {
      toast({
        title: 'خطا',
        description: 'مبلغ تسویه باید عددی بزرگ‌تر از صفر باشد.',
        variant: 'destructive',
      })
      return
    }

    if (amount > availableBalance) {
      toast({
        title: 'خطا',
        description: 'مبلغ درخواست نمی‌تواند بیشتر از موجودی قابل برداشت باشد.',
        variant: 'destructive',
      })
      return
    }

    if (amount < minimumSettlementAmount) {
      toast({
        title: 'خطا',
        description: `حداقل مبلغ قابل درخواست تسویه ${formatMoney(minimumSettlementAmount)} است.`,
        variant: 'destructive',
      })
      return
    }

    setIsRequestingSettlement(true)
    try {
      const createdSettlement = await apiClient.post<SettlementItem>('/settlements', {
        amount,
        description: settlementDescription.trim() || undefined,
      })

      setSettlements((current) => [createdSettlement, ...current])
      setSettlementAmount('')
      setSettlementDescription('')
      setRequestOpen(false)
      await fetchFinancialData()
      toast({ title: 'موفق', description: 'درخواست تسویه با موفقیت ثبت شد.' })
    } catch (err) {
      toast({
        title: 'خطا',
        description: getApiErrorMessage(err, 'ثبت درخواست تسویه ناموفق بود.'),
        variant: 'destructive',
      })
    } finally {
      setIsRequestingSettlement(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="size-4 text-primary" />
              پورسانت رفرال و تسویه
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              این بخش فقط پورسانت معرفی کاربران را نشان می‌دهد و جدا از پورسانت همکار فروش است. پورسانت در انتظار بررسی قابل برداشت نیست.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchFinancialData()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="ml-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="ml-2 size-4" />
              )}
              به‌روزرسانی
            </Button>
            <Dialog
              open={requestOpen}
              onOpenChange={(open) => {
                if (open && settlementBlockMessage) {
                  toast({
                    title: 'درخواست تسویه',
                    description: settlementBlockMessage,
                    variant: 'destructive',
                  })
                  return
                }

                setRequestOpen(open)
                if (open && !settlementAmount && availableBalance > 0) {
                  setSettlementAmount(String(availableBalance))
                }
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" disabled={isLoading}>
                  <Send className="ml-2 size-4" />
                  درخواست تسویه
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <form onSubmit={(event) => void handleSettlementSubmit(event)}>
                  <DialogHeader>
                    <DialogTitle>درخواست تسویه پورسانت رفرال</DialogTitle>
                    <DialogDescription>
                      پرداخت نهایی پس از بررسی و اقدام مدیر انجام می‌شود و ثبت درخواست به معنی پرداخت خودکار نیست.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      موجودی قابل برداشت: <span className="font-semibold">{formatMoney(availableBalance)}</span>
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      حداقل مبلغ درخواست: <span className="font-semibold">{formatMoney(minimumSettlementAmount)}</span>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-settlement-amount">مبلغ</Label>
                      <Input
                        id="user-settlement-amount"
                        value={settlementAmount}
                        onChange={(event) =>
                          setSettlementAmount(normalizeSettlementAmount(event.target.value))
                        }
                        inputMode="numeric"
                        dir="ltr"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-settlement-description">توضیحات</Label>
                      <Textarea
                        id="user-settlement-description"
                        value={settlementDescription}
                        onChange={(event) => setSettlementDescription(event.target.value)}
                        placeholder="اختیاری"
                        maxLength={500}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isRequestingSettlement}
                      onClick={() => setRequestOpen(false)}
                    >
                      انصراف
                    </Button>
                    <Button type="submit" disabled={isRequestingSettlement}>
                      {isRequestingSettlement && <Loader2 className="ml-2 size-4 animate-spin" />}
                      ثبت درخواست
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'کل پورسانت',
                  amount: walletSummary.totalCommissionAmount,
                  icon: Wallet,
                },
                {
                  title: 'در انتظار بررسی',
                  amount: walletSummary.pendingCommissionAmount,
                  icon: Hourglass,
                },
                {
                  title: 'قابل برداشت',
                  amount: walletSummary.availableBalance,
                  icon: HandCoins,
                },
                {
                  title: 'تسویه ثبت‌شده',
                  amount: openSettlementAmount,
                  icon: Banknote,
                },
                {
                  title: 'پرداخت‌شده',
                  amount: walletSummary.paidSettlementAmount,
                  icon: Landmark,
                },
              ].map((item) => (
                <div key={item.title} className="rounded-lg border bg-background p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <item.icon className="size-4" />
                    {item.title}
                  </div>
                  <p className="mt-2 break-words text-lg font-bold">{formatMoney(item.amount)}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              پورسانت‌های در انتظار بررسی تا زمان بررسی مدیر قابل برداشت نیستند.
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">سوابق پورسانت رفرال</h3>
                <span className="text-xs text-muted-foreground">
                  {toPersianNum(commissions.length)} مورد
                </span>
              </div>
              {commissions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                  هنوز پورسانت رفرالی برای شما ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-2">
                  {commissions.map((commission) => (
                    <div
                      key={commission.id}
                      className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[1fr_1fr_1fr_1fr] md:items-center"
                    >
                      <span className="text-sm text-muted-foreground">
                        {formatJalaliDate(commission.createdAt)}
                      </span>
                      <span className="text-sm font-medium">
                        {commission.userPlan?.plan?.name || 'طرح ثبت شده'}
                      </span>
                      <span className="text-sm font-semibold">{formatMoney(commission.amount)}</span>
                      <StatusBadge
                        status={commission.status}
                        label={commissionStatusLabels[commission.status] || commission.status}
                        className="w-fit"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">درخواست‌های تسویه</h3>
                <span className="text-xs text-muted-foreground">
                  {toPersianNum(settlements.length)} مورد
                </span>
              </div>
              {settlements.length === 0 ? (
                <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                  هنوز درخواست تسویه‌ای ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-2">
                  {settlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[1fr_1fr_1fr] md:items-center"
                    >
                      <span className="text-sm text-muted-foreground">
                        {formatJalaliDate(settlement.requestedAt || settlement.createdAt)}
                      </span>
                      <span className="text-sm font-semibold">{formatMoney(settlement.amount)}</span>
                      <StatusBadge
                        status={settlement.status}
                        label={settlementStatusLabels[settlement.status] || settlement.status}
                        className="w-fit"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function UserProfilePage() {
  const { toast } = useToast()
  const { user, initialize } = useAuthStore()
  const hasFetchedRef = useRef(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<ProfileForm>(emptyForm)
  const [loadedNationalCode, setLoadedNationalCode] = useState('')
  const [hasActivePlan, setHasActivePlan] = useState(false)
  const [safeReferralCode, setSafeReferralCode] = useState<string | null>(null)
  const [nationalCodeError, setNationalCodeError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    if (user?.profile) {
      setForm(mapUserToForm(user))
      setLoadedNationalCode(user.profile.nationalCode || '')
    }

    const fetchProfile = async () => {
      try {
        const [res, plansRes] = await Promise.all([
          apiClient.get<AuthUser>('/auth/me'),
          apiClient.get<UserPlansResponse | Array<{ status: string }>>('/user-plans/my'),
        ])
        if (res.success && res.data) {
          const nextForm = mapUserToForm(res.data)
          setForm(nextForm)
          setLoadedNationalCode(nextForm.nationalCode)
        }
        setHasActivePlan(plansRes.success ? getActivePlanStatus(plansRes.data) : false)
        setSafeReferralCode(
          plansRes.success && !Array.isArray(plansRes.data)
            ? plansRes.data?.referralCode ?? null
            : null
        )
      } catch {
        // The auth store fallback above keeps the form usable when this refresh fails.
        setHasActivePlan(false)
        setSafeReferralCode(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  const updateField = (field: keyof ProfileForm, value: string) => {
    setFeedback(null)
    if (field === 'nationalCode') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10)
      setNationalCodeError(null)
      setForm((prev) => ({ ...prev, nationalCode: numericValue }))
      return
    }

    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setNationalCodeError(null)

    const nationalCode = form.nationalCode.trim()
    if (nationalCode && !/^\d{10}$/.test(nationalCode)) {
      setNationalCodeError('کد ملی باید ۱۰ رقم باشد.')
      return
    }

    setIsSaving(true)
    setFeedback(null)

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nationalCode,
        address: form.address.trim(),
        ...(form.gender ? { gender: form.gender as 'MALE' | 'FEMALE' } : {}),
      }

      const res = await apiClient.put<ProfileSaveResult>('/users/profile', payload)
      const saved =
        'success' in res
          ? res.success && res.data
            ? res.data
            : null
          : res

      if (!saved) {
        throw new Error(getProfileSaveErrorMessage(res))
      }

      setForm((prev) => ({
        ...prev,
        firstName: saved.firstName || '',
        lastName: saved.lastName || '',
        nationalCode: saved.nationalCode || '',
        gender: saved.gender || '',
        address: saved.address || '',
      }))
      setLoadedNationalCode(saved.nationalCode || '')

      await initialize()

      const message = buildSuccessMessage(saved)
      setFeedback({ type: 'success', message })
      toast({ title: 'موفق', description: message })
    } catch (err) {
      const msg = err instanceof Error ? err.message : PROFILE_SAVE_ERROR_MESSAGE
      if (
        err instanceof ApiError &&
        (err.code === 'DUPLICATE' || err.code === 'PLAN_HOLDER_LINK_CONFLICT')
      ) {
        setNationalCodeError(msg)
      }
      setFeedback({ type: 'error', message: msg })
      toast({ title: 'خطا', description: msg, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const fullName = user?.profile
    ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || user.mobile
    : user?.mobile || 'کاربر'

  const userInitials = user?.profile
    ? `${(user.profile.firstName || '').charAt(0)}${(user.profile.lastName || '').charAt(0)}`
    : (user?.mobile || '').slice(-2)

  const hasExistingNationalCode = Boolean(loadedNationalCode)
  const referralCode = hasActivePlan ? safeReferralCode : null

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="پروفایل کاربری"
        description="اطلاعات شخصی و راه‌های ارتباطی خود را مدیریت کنید."
      />

      {feedback && (
        <Alert
          variant={feedback.type === 'error' ? 'destructive' : 'default'}
          className={
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
              : undefined
          }
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <AlertCircle className="size-4" />
          )}
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="size-16 ring-4 ring-primary/10">
              {user?.profile?.avatar && (
                <AvatarImage src={user.profile.avatar} alt={fullName} />
              )}
              <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                {userInitials || 'ک'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold">{fullName}</h2>
              <p className="text-sm text-muted-foreground" dir="ltr">
                {user?.mobile}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <ShieldCheck className="size-3.5" />
                حساب {user?.status === 'ACTIVE' ? 'فعال' : user?.status === 'INACTIVE' ? 'غیرفعال' : 'مسدود'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReferralCodePanel referralCode={referralCode} />
      <UserReferralCommissionPanel enabled={Boolean(referralCode)} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4 text-primary" />
              اطلاعات هویتی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">نام</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  placeholder="نام"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">نام خانوادگی</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  placeholder="نام خانوادگی"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">جنسیت</Label>
              <Select
                value={form.gender || 'UNSPECIFIED'}
                onValueChange={(value) => updateField('gender', value === 'UNSPECIFIED' ? '' : value)}
              >
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="انتخاب نشده" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNSPECIFIED">انتخاب نشده</SelectItem>
                  <SelectItem value="MALE">مرد</SelectItem>
                  <SelectItem value="FEMALE">زن</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="size-4 text-primary" />
              اطلاعات تماس
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mobile" className="flex items-center gap-2">
                  <Phone className="size-3.5" />
                  شماره موبایل
                </Label>
                <Input
                  id="mobile"
                  value={user?.mobile || ''}
                  disabled
                  className="bg-muted/50"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="size-3.5" />
                  ایمیل
                </Label>
                <Input
                  id="email"
                  value={user?.email || 'ثبت نشده'}
                  disabled
                  className="bg-muted/50"
                  dir={user?.email ? 'ltr' : 'rtl'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="size-3.5" />
                آدرس
              </Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="آدرس محل سکونت"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" />
            کد ملی و اتصال طرح
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-7 text-muted-foreground">
            با ثبت کد ملی، اگر طرح فعالی برای شما وجود داشته باشد، به حساب کاربری شما متصل می‌شود.
          </p>

          {hasExistingNationalCode && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              کد ملی مبنای اتصال طرح‌های فعال به حساب شماست. در صورت تغییر کد ملی، اتصال طرح‌ها بر اساس کد ملی جدید بررسی می‌شود.
            </div>
          )}

          <div className="max-w-sm space-y-2">
            <Label htmlFor="nationalCode">کد ملی</Label>
            <Input
              id="nationalCode"
              value={form.nationalCode}
              onChange={(e) => updateField('nationalCode', e.target.value)}
              placeholder="کد ملی ۱۰ رقمی"
              dir="ltr"
              inputMode="numeric"
              maxLength={10}
              aria-invalid={Boolean(nationalCodeError)}
            />
            {nationalCodeError && (
              <p className="text-sm text-destructive">{nationalCodeError}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="min-w-[140px] bg-primary hover:bg-primary/90"
        >
          {isSaving ? (
            <>
              <Loader2 className="ml-2 size-4 animate-spin" />
              در حال ذخیره...
            </>
          ) : (
            <>
              <Save className="ml-2 size-4" />
              ذخیره تغییرات
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
