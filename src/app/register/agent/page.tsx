'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion, type Variants } from 'framer-motion'
import { agentsService } from '@/services/agents.service'
import { authService, usersService } from '@/services'
import { ApiError } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import { useAuthStore } from '@/stores/auth-store'
import { useCountdown } from '@/hooks/shared'
import { isValidIranianMobile } from '@/utils/formatters'
import type { AuthUser } from '@/types'
import {
  Briefcase,
  ArrowLeft,
  Loader2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  UserPlus,
  Phone,
  User,
  MapPin,
  Hash,
  CreditCard,
} from 'lucide-react'

const OTP_LENGTH = 5
const COUNTDOWN_SECONDS = 120
const MAX_MOBILE_LENGTH = 11
const easeOut = [0, 0, 0.2, 1] as const

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
}

const pageCardClassName = 'rounded-2xl border border-border/50 bg-card shadow-sm'
const fieldClassName =
  'border border-input bg-background shadow-sm focus-visible:ring-1 focus-visible:ring-primary'

function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    roles: Array.isArray(user.roles) ? user.roles : [],
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
  }
}

export default function RegisterAgentPage() {
  const router = useRouter()
  const { user, isAuthenticated, setAuth, setUser } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [otpMobile, setOtpMobile] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const countdown = useCountdown({ initialSeconds: COUNTDOWN_SECONDS })

  const [form, setForm] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    nationalCode: '',
    address: user?.profile?.address || '',
    description: '',
  })

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSendOtp = async () => {
    const mobile = otpMobile.trim()

    if (!mobile) {
      toast.error('شماره موبایل را وارد کنید')
      return
    }

    if (!isValidIranianMobile(mobile)) {
      toast.error('فرمت شماره موبایل نامعتبر است')
      return
    }

    setOtpLoading(true)
    try {
      const data = await authService.sendOtp(mobile)
      setOtpSent(true)
      setOtpCode('')
      setRemainingAttempts(null)
      setDevOtp(data.otp ?? null)
      countdown.reset()
      toast.success('کد تایید ارسال شد')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطا در ارسال کد تایید'
      toast.error(msg)
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (verifyLoading) {
      return
    }

    const mobile = otpMobile.trim()
    const code = otpCode.trim()

    if (!mobile || code.length !== OTP_LENGTH) {
      toast.error(`کد تایید باید ${OTP_LENGTH} رقم باشد`)
      return
    }

    setVerifyLoading(true)
    try {
      const data = await authService.verifyOtp(mobile, code)
      setAuth(normalizeAuthUser(data.user), data.accessToken, data.refreshToken)
      toast.success('شماره موبایل تایید شد')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطا در تایید کد'
      const match = msg.match(/(\d+)/)
      if (match) {
        setRemainingAttempts(parseInt(match[1], 10))
      }
      toast.error(msg)
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleResendOtp = () => {
    if (!countdown.isActive) {
      setOtpSent(false)
      setOtpCode('')
      setRemainingAttempts(null)
      setDevOtp(null)
    }
  }

  const handleBackToMobile = () => {
    setOtpSent(false)
    setOtpCode('')
    setRemainingAttempts(null)
    setDevOtp(null)
    countdown.stop()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      toast.error('ابتدا شماره موبایل خود را تایید کنید')
      return
    }

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const nationalCode = form.nationalCode.trim()
    const address = form.address.trim()
    const description = form.description.trim()
    const fullName = `${firstName} ${lastName}`.trim()

    if (!firstName || !lastName || !nationalCode) {
      toast.error('لطفاً اطلاعات فردی الزامی را تکمیل کنید')
      return
    }

    if (!/^\d{10}$/.test(nationalCode)) {
      toast.error('کد ملی باید ۱۰ رقم باشد')
      return
    }

    setLoading(true)
    try {
      await usersService.updateProfile({
        firstName,
        lastName,
        nationalCode,
        address,
      })

      if (user) {
        setUser({
          ...user,
          profile: {
            firstName,
            lastName,
            nationalCode,
            address,
            avatar: user.profile?.avatar ?? null,
            birthDate: user.profile?.birthDate ?? null,
            gender: user.profile?.gender ?? null,
          },
        })
      }

      await agentsService.register({
        // Legacy API compatibility: Agent.businessName stores the person's display name.
        businessName: fullName,
        description,
      })
      setSubmitted(true)
      toast.success('درخواست همکاری فروش با موفقیت ثبت شد و در انتظار تایید مدیریت است')
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || 'خطا در ثبت درخواست')
      } else {
        toast.error('خطای شبکه. لطفاً دوباره تلاش کنید')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="mx-auto w-full max-w-md"
        >
          <button
            onClick={() => router.back()}
            className="mb-5 inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            بازگشت
          </button>

          <div className={`${pageCardClassName} mb-6 flex items-start gap-4 p-5 sm:items-center sm:p-6`}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-8">ثبت‌نام همکار فروش</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                ابتدا شماره موبایل خود را تایید کنید
              </p>
            </div>
          </div>

          <Card className={pageCardClassName}>
            <CardContent className="p-5 sm:p-7">
              {!otpSent ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="agent-otp-mobile">شماره موبایل</Label>
                    <div className="relative">
                      <Input
                        id="agent-otp-mobile"
                        type="tel"
                        inputMode="numeric"
                        dir="ltr"
                        placeholder="09123456789"
                        maxLength={MAX_MOBILE_LENGTH}
                        value={otpMobile}
                        onChange={(e) => setOtpMobile(e.target.value.replace(/\D/g, ''))}
                        className={`${fieldClassName} pe-10 text-left font-mono tracking-wider`}
                      />
                      <Phone className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>

                  <Button
                    className="h-11 w-full rounded-xl font-semibold shadow-sm"
                    onClick={handleSendOtp}
                    disabled={otpLoading || otpMobile.length < MAX_MOBILE_LENGTH}
                  >
                    {otpLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        در حال ارسال...
                      </>
                    ) : (
                      'ارسال کد تایید'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      onClick={handleBackToMobile}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      کد تایید ارسال شد به{' '}
                      <span dir="ltr" className="font-mono font-medium text-foreground">
                        {otpMobile}
                      </span>
                    </span>
                  </div>

                  {devOtp && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                      <p className="text-xs text-primary">
                        کد تایید:{' '}
                        <span dir="ltr" className="font-mono text-base font-bold">
                          {devOtp}
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>کد تایید</Label>
                    <div className="flex justify-center" dir="ltr">
                      <InputOTP
                        maxLength={OTP_LENGTH}
                        value={otpCode}
                        onChange={setOtpCode}
                        onComplete={handleVerifyOtp}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  {remainingAttempts !== null && remainingAttempts > 0 && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center">
                      <p className="text-xs text-destructive">
                        {remainingAttempts} بار تلاش باقی مانده
                      </p>
                    </div>
                  )}

                  <Button
                    className="h-11 w-full rounded-xl font-semibold shadow-sm"
                    onClick={handleVerifyOtp}
                    disabled={verifyLoading || otpCode.length < OTP_LENGTH}
                  >
                    {verifyLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        در حال بررسی...
                      </>
                    ) : (
                      'تایید و ادامه ثبت نام'
                    )}
                  </Button>

                  <div className="text-center">
                    {countdown.isActive ? (
                      <p className="text-sm text-muted-foreground">
                        ارسال مجدد تا{' '}
                        <span dir="ltr" className="font-mono font-medium">
                          {countdown.display}
                        </span>
                      </p>
                    ) : (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-sm font-semibold"
                        onClick={handleResendOtp}
                      >
                        ارسال مجدد کد تایید
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background p-4 text-foreground">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="w-full max-w-md"
        >
          <Card className={`${pageCardClassName} border-primary/20`}>
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold mb-2">درخواست شما ثبت شد</h2>
              <p className="text-muted-foreground mb-6">
                درخواست همکاری فروش شما با موفقیت ارسال شد و در انتظار بررسی و تأیید مدیریت قرار گرفت.
                پس از تأیید، دسترسی پنل همکار فروش برای شما فعال می‌شود.
              </p>
              <Button
                onClick={() => router.push('/user/dashboard')}
                className="h-11 w-full rounded-xl font-semibold shadow-sm"
              >
                بازگشت به داشبورد
                <ArrowLeft className="h-4 w-4 mr-1" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="mx-auto w-full max-w-2xl"
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-5 inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          بازگشت
        </button>

        {/* Header */}
        <div className={`${pageCardClassName} mb-6 flex items-start gap-4 p-5 sm:items-center sm:p-6`}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Briefcase className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-8">ثبت‌نام همکار فروش</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              فرم ثبت‌نام همکار فروش در شبکه حامی کارت
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className={`${pageCardClassName} mb-6 bg-primary/5`}>
          <CardContent className="flex items-start gap-3 p-4 sm:p-5">
            <UserPlus className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm leading-6 text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">همکار فروش حامی کارت شوید!</p>
              <p>با ثبت‌نام به عنوان همکار فروش، می‌توانید پزشکان و کاربران را معرفی کرده و از پورسانت بهره‌مند شوید.</p>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className={pageCardClassName}>
          <CardContent className="p-5 sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sales partner info */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">اطلاعات همکار فروش</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      توضیحات تکمیلی
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="در صورت نیاز، توضیح کوتاهی درباره تجربه فروش یا شیوه معرفی خود بنویسید..."
                      value={form.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className={fieldClassName}
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Personal Info */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">اطلاعات فردی</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      نام <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      نام خانوادگی <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="nationalCode" className="flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5" />
                      کد ملی <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nationalCode"
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      maxLength={10}
                      value={form.nationalCode}
                      onChange={(e) =>
                        handleChange('nationalCode', e.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      className={`${fieldClassName} text-left font-mono tracking-wider`}
                      required
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">اطلاعات تماس</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verifiedMobile" className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      شماره موبایل تاییدشده
                    </Label>
                    <Input
                      id="verifiedMobile"
                      dir="ltr"
                      value={user?.mobile || otpMobile}
                      className={`${fieldClassName} text-left font-mono tracking-wider`}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      آدرس
                    </Label>
                    <Textarea
                      id="address"
                      value={form.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className={fieldClassName}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial Info */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">اطلاعات مالی</h3>
                </div>
                <p className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
                  ثبت شماره کارت و شبا پس از تأیید مدیریت از مسیر پنل همکار فروش انجام می‌شود.
                </p>
              </div>

              {/* Submit */}
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 flex-1 rounded-xl font-semibold shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      در حال ثبت...
                    </>
                  ) : (
                    <>
                      ثبت درخواست
                      <ArrowLeft className="h-4 w-4 mr-1" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="h-12 rounded-xl border-border/70 bg-background shadow-sm"
                >
                  انصراف
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info note */}
        <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
          فیلدهای دارای ستاره <span className="text-red-500">*</span> الزامی هستند.
          پس از بررسی و تأیید مدیریت، دسترسی همکار فروش فعال می‌شود.
        </p>
      </motion.div>
    </div>
  )
}
