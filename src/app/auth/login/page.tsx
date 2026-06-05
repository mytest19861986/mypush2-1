'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, type Variants } from 'framer-motion'
import { toast } from 'sonner'
import {
  Phone,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  Shield,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { BrandLogo } from '@/components/shared/brand-logo'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import { useAuthStore } from '@/stores/auth-store'
import { authService } from '@/services'
import { useCountdown } from '@/hooks/shared'
import { isValidIranianMobile } from '@/utils/formatters'
import type { AuthUser } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const OTP_LENGTH = 5
const COUNTDOWN_SECONDS = 120
const MAX_MOBILE_LENGTH = 11

function getRedirectPathForUser(user: AuthUser) {
  const roles = user.roles || []
  if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) return '/admin/dashboard'
  if (roles.includes('DOCTOR')) return '/doctor/dashboard'
  if (roles.includes('AGENT')) return '/agent/dashboard'
  return '/user/dashboard'
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

const brandingVariants: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
}

// ─── Login Page ──────────────────────────────────────────────────────────────

const authCardClassName = 'rounded-2xl border border-border/50 bg-card shadow-sm'
const authFieldClassName =
  'border border-input bg-background shadow-sm focus-visible:ring-1 focus-visible:ring-primary'

export default function LoginPage() {
  const router = useRouter()
  const {
    user,
    isAuthenticated,
    isLoading,
    setAuth,
    clearAuth,
    initialize,
  } = useAuthStore()

  // ─── OTP State ──────────────────────────────────────────────────────────

  const [otpMobile, setOtpMobile] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [devOtp, setDevOtp] = useState<string | null>(null)

  const countdown = useCountdown({ initialSeconds: COUNTDOWN_SECONDS })

  // ─── Password State ─────────────────────────────────────────────────────

  const [passwordMobile, setPasswordMobile] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(false)
  const [redirectingAfterAuth, setRedirectingAfterAuth] = useState(false)
  const redirectFallbackTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (redirectFallbackTimeoutRef.current) {
        window.clearTimeout(redirectFallbackTimeoutRef.current)
        redirectFallbackTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const hasStoredToken =
      typeof window !== 'undefined' && Boolean(localStorage.getItem('accessToken'))

    if (!hasStoredToken) {
      clearAuth()
      setCheckingAuth(false)
      return
    }

    setCheckingAuth(true)
    initialize()
      .catch(() => {
        clearAuth()
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingAuth(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [clearAuth, initialize])

  useEffect(() => {
    if (!redirectingAfterAuth && !checkingAuth && !isLoading && isAuthenticated && user) {
      router.replace(getRedirectPathForUser(user))
    }
  }, [checkingAuth, isAuthenticated, isLoading, redirectingAfterAuth, router, user])

  // ─── Helpers ───────────────────────────────────────────────────────────

  const handleAuthSuccess = (data: {
    accessToken: string
    refreshToken: string
    user: AuthUser
  }) => {
    const userData = { ...data.user }
    if (userData.roles && !Array.isArray(userData.roles)) {
      userData.roles = []
    }
    if (userData.permissions && !Array.isArray(userData.permissions)) {
      userData.permissions = []
    }

    setRedirectingAfterAuth(true)
    setAuth(userData, data.accessToken, data.refreshToken)
    toast.success('ورود با موفقیت انجام شد')

    const redirectPath = getRedirectPathForUser(userData)
    if (redirectFallbackTimeoutRef.current) {
      window.clearTimeout(redirectFallbackTimeoutRef.current)
    }

    router.replace(redirectPath)
    redirectFallbackTimeoutRef.current = window.setTimeout(() => {
      redirectFallbackTimeoutRef.current = null

      if (typeof window !== 'undefined') {
        if (window.location.pathname === '/auth/login') {
          window.location.replace(redirectPath)
          return
        }

        setRedirectingAfterAuth(false)
      }
    }, 800)
  }

  // ─── OTP Handlers ───────────────────────────────────────────────────────

  const handleSendOtp = async () => {
    const mobile = otpMobile.trim()

    if (!mobile) {
      toast.error('لطفاً شماره موبایل خود را وارد کنید')
      return
    }
    if (!isValidIranianMobile(mobile)) {
      toast.error('فرمت شماره موبایل نامعتبر است (مثال: 09123456789)')
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
      handleAuthSuccess(data)
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

  // ─── Password Login Handlers ────────────────────────────────────────────

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loginLoading) {
      return
    }

    const mobile = passwordMobile.trim()

    if (!mobile || !isValidIranianMobile(mobile)) {
      toast.error('فرمت شماره موبایل نامعتبر است')
      return
    }
    if (!password || password.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد')
      return
    }

    setLoginLoading(true)
    try {
      const data = await authService.login(mobile, password)
      handleAuthSuccess(data)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'خطا در ورود'
      toast.error(msg)
    } finally {
      setLoginLoading(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (checkingAuth || redirectingAfterAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground md:grid md:grid-cols-5">
      {/* ─── Branding Panel (hidden on mobile) ─────────────────────────────── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={brandingVariants}
        className="relative hidden overflow-hidden border-l border-primary-foreground/10 bg-primary p-8 text-primary-foreground md:col-span-2 md:flex md:flex-col md:items-center md:justify-center lg:p-12"
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),transparent_42%,rgba(255,255,255,0.08))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-primary-foreground/20" />

        {/* Content */}
        <div className="relative z-10 max-w-sm text-center space-y-8">
          {/* Icon */}
          <motion.div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-foreground/10 shadow-sm ring-1 ring-primary-foreground/20 backdrop-blur-sm"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <BrandLogo
              priority
              className="justify-center"
              imageClassName="h-16"
            />
          </motion.div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              سامانه تخفیف درمانی
            </h1>
            <p className="text-base font-medium text-primary-foreground/90 lg:text-lg">
              حامی کارت
            </p>
          </div>

          {/* Tagline */}
          <p className="text-sm leading-relaxed text-primary-foreground/75 lg:text-base">
            سلامتی خود را با تخفیف‌های ویژه تضمین کنید
          </p>

          {/* Feature bullets */}
          <div className="space-y-4 text-right">
            {[
              { icon: CheckCircle, text: 'تخفیف تا ۴۰٪' },
              { icon: Shield, text: 'پشتیبانی ۲۴ ساعته' },
              { icon: Users, text: '+۱۰۰۰ پزشک' },
            ].map(({ icon: Icon, text }) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-3 rounded-xl bg-primary-foreground/10 px-3 py-2 ring-1 ring-primary-foreground/10"
              >
                <Icon className="h-5 w-5 flex-shrink-0 text-primary-foreground/80" />
                <span className="text-sm text-primary-foreground/90">{text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ─── Login Form Panel ──────────────────────────────────────────────── */}
      <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/20 p-4 sm:p-6 md:col-span-3 md:p-8 lg:p-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="w-full max-w-md"
        >
          {/* Mobile-only branding (compact) */}
          <motion.div
            variants={itemVariants}
            className="mb-8 text-center md:hidden"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <BrandLogo
                priority
                className="justify-center"
                imageClassName="h-14"
              />
            </div>
            <h1 className="text-lg font-bold text-foreground">سامانه تخفیف درمانی</h1>
            <p className="text-xs text-muted-foreground mt-1">حامی کارت</p>
          </motion.div>

          {/* Back arrow */}
          <motion.div variants={itemVariants} className="flex justify-end mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
              onClick={() => router.push('/')}
              aria-label="بازگشت به صفحه اصلی"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* Card */}
          <motion.div variants={itemVariants}>
            <Card className={`w-full ${authCardClassName}`}>
              <CardHeader className="px-5 pb-4 pt-6 text-center sm:px-7">
                <CardTitle className="text-xl font-bold leading-8">
                  ورود به حساب کاربری
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-6">
                  با شماره موبایل خود وارد حساب کاربری شوید
                </CardDescription>
              </CardHeader>

              <CardContent className="px-5 sm:px-7">
                <Tabs defaultValue="otp" className="w-full">
                  <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
                    <TabsTrigger value="otp" className="rounded-lg text-sm">
                      <Phone className="h-3.5 w-3.5" />
                      کد یکبار مصرف
                    </TabsTrigger>
                    <TabsTrigger value="password" className="rounded-lg text-sm">
                      <Lock className="h-3.5 w-3.5" />
                      رمز عبور
                    </TabsTrigger>
                  </TabsList>

                  {/* ─── OTP Tab ────────────────────────────────────────────── */}
                  <TabsContent value="otp" className="mt-6 space-y-4">
                    {!otpSent ? (
                      /* Step 1: Mobile number input */
                      <motion.div
                        key="mobile-step"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="otp-mobile">شماره موبایل</Label>
                          <div className="relative">
                            <Input
                              id="otp-mobile"
                              type="tel"
                              inputMode="numeric"
                              dir="ltr"
                              placeholder="09123456789"
                              maxLength={MAX_MOBILE_LENGTH}
                              value={otpMobile}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '')
                                setOtpMobile(value)
                              }}
                              className={`${authFieldClassName} pe-10 text-left font-mono tracking-wider`}
                            />
                            <Phone className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            کد تایید به این شماره ارسال خواهد شد
                          </p>
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
                      </motion.div>
                    ) : (
                      /* Step 2: OTP verification */
                      <motion.div
                        key="otp-step"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        {/* Back + mobile display */}
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
                            کد تایید ارسال شده به{' '}
                            <span
                              dir="ltr"
                              className="font-mono font-medium text-foreground"
                            >
                              {otpMobile}
                            </span>
                          </span>
                        </div>

                        {/* Dev OTP hint */}
                        {devOtp && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center"
                          >
                            <p className="text-xs text-primary">
                              کد تایید (محیط توسعه):{' '}
                              <span
                                dir="ltr"
                                className="font-mono font-bold text-base"
                              >
                                {devOtp}
                              </span>
                            </p>
                          </motion.div>
                        )}

                        {/* OTP Input */}
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

                        {/* Remaining attempts */}
                        {remainingAttempts !== null && remainingAttempts > 0 && (
                          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center">
                            <p className="text-xs text-destructive">
                              {remainingAttempts} بار تلاش باقیمانده
                            </p>
                          </div>
                        )}

                        {/* Verify button */}
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
                            'تایید و ورود'
                          )}
                        </Button>

                        {/* Resend section */}
                        <div className="text-center">
                          {countdown.isActive ? (
                            <p className="text-sm text-muted-foreground">
                              ارسال مجدد تا{' '}
                              <span
                                dir="ltr"
                                className="font-mono font-medium"
                              >
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
                      </motion.div>
                    )}
                  </TabsContent>

                  {/* ─── Password Tab ────────────────────────────────────────── */}
                  <TabsContent value="password" className="mt-6">
                    <motion.form
                      onSubmit={handlePasswordLogin}
                      className="space-y-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="password-mobile">شماره موبایل</Label>
                        <div className="relative">
                          <Input
                            id="password-mobile"
                            type="tel"
                            inputMode="numeric"
                            dir="ltr"
                            placeholder="09123456789"
                            maxLength={MAX_MOBILE_LENGTH}
                            value={passwordMobile}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '')
                              setPasswordMobile(value)
                            }}
                            className={`${authFieldClassName} pe-10 text-left font-mono tracking-wider`}
                          />
                          <Phone className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password-input">رمز عبور</Label>
                        <div className="relative">
                          <Input
                            id="password-input"
                            type={showPassword ? 'text' : 'password'}
                            dir="ltr"
                            placeholder="رمز عبور خود را وارد کنید"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${authFieldClassName} pe-10`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute end-0 top-0 h-full rounded-xl px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                            aria-label={
                              showPassword
                                ? 'مخفی کردن رمز عبور'
                                : 'نمایش رمز عبور'
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="h-11 w-full rounded-xl font-semibold shadow-sm"
                        disabled={
                          loginLoading ||
                          passwordMobile.length < MAX_MOBILE_LENGTH ||
                          !password
                        }
                      >
                        {loginLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            در حال ورود...
                          </>
                        ) : (
                          'ورود'
                        )}
                      </Button>
                    </motion.form>
                  </TabsContent>
                </Tabs>
              </CardContent>

              {/* Footer */}
              <div className="px-5 pb-6 sm:px-7">
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  با ورود به سیستم،{' '}
                  <span className="text-foreground font-medium">
                    شرایط و قوانین
                  </span>{' '}
                  استفاده از سامانه را می‌پذیرید.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Dev Helper Info */}
          <motion.div
            variants={itemVariants}
            className={`mt-4 space-y-1 p-4 text-center text-xs text-muted-foreground ${authCardClassName}`}
          >
            <p className="font-medium">حساب‌های آزمایشی:</p>
            <p>
              مدیر کل:{' '}
              <span dir="ltr" className="font-mono">
                09999999999
              </span>{' '}
              /{' '}
              <span dir="ltr" className="font-mono">
                Admin@123456
              </span>
            </p>
            <p>
              نماینده:{' '}
              <span dir="ltr" className="font-mono">
                09123456789
              </span>{' '}
              /{' '}
              <span dir="ltr" className="font-mono">
                Agent@123456
              </span>
            </p>
            <p>
              کاربر عادی:{' '}
              <span dir="ltr" className="font-mono">
                09111111111
              </span>{' '}
              /{' '}
              <span dir="ltr" className="font-mono">
                User@123456
              </span>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
