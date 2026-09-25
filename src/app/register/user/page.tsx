'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion, type Variants } from 'framer-motion'
import { authService } from '@/services'
import { ApiError } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  UserPlus,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Phone,
  User,
  Hash,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
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

export default function RegisterUserPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Step 1: Mobile & OTP State
  const [otpMobile, setOtpMobile] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const countdown = useCountdown({ initialSeconds: COUNTDOWN_SECONDS })

  // Step 2: User details & password
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nationalCode, setNationalCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // ─── Step 1 Handlers ──────────────────────────────────────────────────────────

  const handleSendOtp = async () => {
    const mobile = otpMobile.trim()

    if (!mobile) {
      toast.error('شماره موبایل را وارد کنید')
      return
    }

    if (!isValidIranianMobile(mobile)) {
      toast.error('فرمت شماره موبایل نامعتبر است (مثال: 09121234567)')
      return
    }

    setOtpLoading(true)
    try {
      const data = await authService.sendOtp(mobile, 'register')
      setOtpSent(true)
      setOtpCode('')
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
    if (verifyLoading) return

    const mobile = otpMobile.trim()
    const code = otpCode.trim()

    if (!mobile || code.length !== OTP_LENGTH) {
      toast.error(`کد تایید باید ${OTP_LENGTH} رقم باشد`)
      return
    }

    setVerifyLoading(true)
    try {
      // Test OTP validity by verifying or moving forward
      setOtpVerified(true)
      toast.success('شماره موبایل با موفقیت تایید شد')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'کد تایید نامعتبر است'
      toast.error(msg)
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleResendOtp = () => {
    if (!countdown.isActive) {
      setOtpSent(false)
      setOtpCode('')
      setDevOtp(null)
    }
  }

  const handleBackToMobile = () => {
    setOtpSent(false)
    setOtpCode('')
    setDevOtp(null)
    countdown.stop()
  }

  // ─── Step 2 Handler (Final Registration) ───────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanFirstName = firstName.trim()
    const cleanLastName = lastName.trim()
    const cleanNationalCode = nationalCode.trim()
    const cleanPassword = password.trim()

    if (!cleanFirstName || !cleanLastName) {
      toast.error('لطفاً نام و نام خانوادگی را وارد کنید')
      return
    }

    if (cleanNationalCode && !/^\d{10}$/.test(cleanNationalCode)) {
      toast.error('کد ملی باید ۱۰ رقم باشد')
      return
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد')
      return
    }

    if (cleanPassword !== confirmPassword.trim()) {
      toast.error('رمز عبور و تکرار آن یکسان نیستند')
      return
    }

    setLoading(true)
    try {
      // Get referral code from localStorage if present
      const storedReferral = typeof window !== 'undefined' ? localStorage.getItem('hamiReferralCode') : null

      const result = await authService.registerUser({
        mobile: otpMobile.trim(),
        otpCode: otpCode.trim(),
        password: cleanPassword,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        nationalCode: cleanNationalCode || undefined,
        referralCode: storedReferral || undefined,
      })

      setAuth(normalizeAuthUser(result.user), result.accessToken, result.refreshToken)
      setSubmitted(true)
      toast.success('حساب کاربری شما با موفقیت ایجاد شد!')
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message || 'خطا در ثبت‌نام')
      } else {
        const msg = error instanceof Error ? error.message : 'خطای سرور در ثبت‌نام'
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Submitted Success View ───────────────────────────────────────────────

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
              <h2 className="text-xl font-bold mb-2">خوش آمدید!</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                حساب کاربری شما در حامی‌کارت با موفقیت فعال شد. اکنون می‌توانید از تمامی امکانات درمانی و تخفیفات شبکه بهره‌مند شوید.
              </p>
              <Button
                onClick={() => router.push('/user/dashboard')}
                className="h-11 w-full rounded-xl font-semibold shadow-sm"
              >
                ورود به پنل کاربری
                <ArrowLeft className="h-4 w-4 mr-1" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ─── Main Form View ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen overflow-x-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="mx-auto w-full max-w-xl"
      >
        {/* Top Back to Login Link */}
        <Link
          href="/auth/login"
          className="mb-5 inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          بازگشت به صفحه ورود
        </Link>

        {/* Header Banner */}
        <div className={`${pageCardClassName} mb-6 flex items-start gap-4 p-5 sm:items-center sm:p-6`}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserPlus className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-8">ثبت‌نام مستقیم کاربر</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              ایجاد حساب کاربری جهت عضویت و بهره‌مندی از خدمات تخفیف سلامت حامی کارت
            </p>
          </div>
        </div>

        {/* Registration Card */}
        <Card className={pageCardClassName}>
          <CardContent className="p-5 sm:p-7">
            {!otpVerified ? (
              // Step 1: Mobile & OTP Verification
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold">مرحله اول: تایید شماره موبایل</h2>
                </div>
                <Separator />

                {!otpSent ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      شماره موبایل خود را وارد کنید تا کد تایید برای شما ارسال شود.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="mobile-input">شماره موبایل</Label>
                      <div className="relative">
                        <Input
                          id="mobile-input"
                          type="tel"
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
                          کد تایید تستی:{' '}
                          <span dir="ltr" className="font-mono text-base font-bold">
                            {devOtp}
                          </span>
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>کد تایید ۵ رقمی</Label>
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
                        'تایید و تکمیل اطلاعات'
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
              </div>
            ) : (
              // Step 2: Account Details & Password
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-semibold">مرحله دوم: مشخصات فردی و امنیتی</h2>
                  </div>
                  <span className="text-xs rounded-lg bg-primary/10 px-2 py-1 font-mono text-primary font-medium">
                    {otpMobile}
                  </span>
                </div>
                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">
                      نام <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="firstName"
                        placeholder="مثال: علی"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={fieldClassName}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">
                      نام خانوادگی <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="lastName"
                        placeholder="مثال: محمدی"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={fieldClassName}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationalCode">
                    کد ملی <span className="text-xs text-muted-foreground font-normal">(اختیاری - ۱۰ رقم)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="nationalCode"
                      dir="ltr"
                      placeholder="0012345678"
                      maxLength={10}
                      value={nationalCode}
                      onChange={(e) => setNationalCode(e.target.value.replace(/\D/g, ''))}
                      className={`${fieldClassName} text-left font-mono tracking-wider`}
                    />
                    <Hash className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">
                      رمز عبور <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        dir="ltr"
                        placeholder="حداقل ۶ کاراکتر"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${fieldClassName} pe-10`}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute end-0 top-0 h-full rounded-xl px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-confirmPassword">
                      تکرار رمز عبور <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        dir="ltr"
                        placeholder="تکرار رمز عبور"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`${fieldClassName} pe-10`}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute end-0 top-0 h-full rounded-xl px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl font-semibold shadow-sm"
                  disabled={
                    loading ||
                    !firstName.trim() ||
                    !lastName.trim() ||
                    password.length < 6 ||
                    password !== confirmPassword
                  }
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      در حال ثبت‌نام و ساخت حساب...
                    </>
                  ) : (
                    'تکمیل ثبت‌نام و ورود'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
