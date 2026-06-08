'use client'

import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/shared'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toPersianNum } from '@/utils/formatters'
import { normalizeCardNumber, normalizePayoutUpdate } from '@/lib/payout'
import type { AuthUser } from '@/types'
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
} from 'lucide-react'

type ProfileForm = {
  firstName: string
  lastName: string
  nationalCode: string
  gender: string
  address: string
  cardNumber: string
  sheba: string
  accountOwnerName: string
}

type SavedProfileResponse = {
  firstName: string | null
  lastName: string | null
  nationalCode: string | null
  gender?: string | null
  address?: string | null
  avatar?: string | null
  cardNumber?: string | null
  sheba?: string | null
  accountOwnerName?: string | null
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
  cardNumber: '',
  sheba: '',
  accountOwnerName: '',
}

function mapUserToForm(user?: AuthUser | null): ProfileForm {
  return {
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    nationalCode: user?.profile?.nationalCode || '',
    gender: user?.profile?.gender || '',
    address: user?.profile?.address || '',
    cardNumber: user?.profile?.payoutCardNumber || '',
    sheba: user?.profile?.payoutSheba || '',
    accountOwnerName: user?.profile?.payoutAccountOwnerName || '',
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
        <div className="flex max-w-sm items-center gap-2 rounded-lg border bg-background px-3 py-2">
          <p className="min-w-0 flex-1 truncate font-mono text-sm font-semibold" dir="ltr">
            {referralLink || '...'}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
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

    const payout = normalizePayoutUpdate({
      ...(form.cardNumber.includes('*') ? {} : { cardNumber: form.cardNumber }),
      ...(form.sheba.includes('*') ? {} : { sheba: form.sheba }),
      accountOwnerName: form.accountOwnerName,
    })

    if (payout.errors.length > 0) {
      const message = payout.errors[0]
      setFeedback({ type: 'error', message })
      toast({ title: 'خطا', description: message, variant: 'destructive' })
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
        cardNumber: payout.values.payoutCardNumber,
        sheba: payout.values.payoutSheba,
        accountOwnerName: payout.values.payoutAccountOwnerName,
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
        accountOwnerName: saved.accountOwnerName || '',
        // Keep prev.cardNumber and prev.sheba.
        // API returns masked values and masked values must not be re-submitted.
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4 text-primary" />
            اطلاعات مالی برای دریافت پورسانت رفرال
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-7 text-muted-foreground">
            برای دریافت پورسانت رفرال، اطلاعات مالی خود را تکمیل کنید.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="referralCardNumber">شماره کارت</Label>
              <Input
                id="referralCardNumber"
                value={form.cardNumber}
                onChange={(e) =>
                  updateField('cardNumber', normalizeCardNumber(e.target.value).slice(0, 16))
                }
                placeholder="6037990000000000"
                dir="ltr"
                inputMode="numeric"
                maxLength={16}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralSheba">شماره شبا</Label>
              <Input
                id="referralSheba"
                value={form.sheba}
                onChange={(e) => updateField('sheba', e.target.value.toUpperCase())}
                placeholder="IR000000000000000000000000"
                dir="ltr"
              />
            </div>
          </div>

          <div className="max-w-sm space-y-2">
            <Label htmlFor="referralAccountOwnerName">نام صاحب حساب</Label>
            <Input
              id="referralAccountOwnerName"
              value={form.accountOwnerName}
              onChange={(e) => updateField('accountOwnerName', e.target.value)}
              placeholder="نام و نام خانوادگی صاحب حساب"
            />
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
