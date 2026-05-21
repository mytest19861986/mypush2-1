'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  HeartPulse,
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { authService } from '@/services'
import { useCountdown } from '@/hooks/shared'
import { isValidIranianMobile } from '@/utils/formatters'

// ─── Constants ───────────────────────────────────────────────────────────────

const OTP_LENGTH = 5
const COUNTDOWN_SECONDS = 120
const MAX_MOBILE_LENGTH = 11

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

const brandingVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
}

// ─── Login Page ──────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()
  const { setAuth, getRedirectPath } = useAuthStore()

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

    setAuth(userData, data.accessToken, data.refreshToken)
    toast.success('ورود با موفقیت انجام شد')

    const redirectPath = getRedirectPath()
    setTimeout(() => {
      router.replace(redirectPath)
    }, 300)
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

  return (
    <div className="min-h-screen flex md:grid md:grid-cols-5">
      {/* ─── Branding Panel (hidden on mobile) ─────────────────────────────── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={brandingVariants}
        className="hidden md:flex md:col-span-2 relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 flex-col items-center justify-center p-8 lg:p-12 text-white"
      >
        {/* Decorative circles */}
        <div className="absolute top-[-60px] left-[-60px] w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute bottom-[-80px] right-[-40px] w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-[30%] right-[-30px] w-32 h-32 rounded-full bg-white/[0.03]" />
        <div className="absolute bottom-[25%] left-[-20px] w-24 h-24 rounded-full bg-white/[0.04]" />

        {/* Content */}
        <div className="relative z-10 max-w-sm text-center space-y-8">
          {/* Icon */}
          <motion.div
            className="mx-auto w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-black/10"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <HeartPulse className="w-10 h-10 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]" />
          </motion.div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              سامانه تخفیف درمانی
            </h1>
            <p className="text-emerald-100 font-medium text-base lg:text-lg">
              حامی کارت
            </p>
          </div>

          {/* Tagline */}
          <p className="text-emerald-100/80 text-sm lg:text-base leading-relaxed">
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
                className="flex items-center gap-3"
              >
                <Icon className="w-5 h-5 text-emerald-200 flex-shrink-0" />
                <span className="text-sm text-emerald-50">{text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ─── Login Form Panel ──────────────────────────────────────────────── */}
      <div className="flex-1 md:col-span-3 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 bg-background">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="w-full max-w-md"
        >
          {/* Mobile-only branding (compact) */}
          <motion.div
            variants={itemVariants}
            className="md:hidden text-center mb-8"
          >
            <div className="mx-auto w-14 h-14 rounded-xl bg-emerald-600 flex items-center justify-center mb-3">
              <HeartPulse className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-lg font-bold text-foreground">سامانه تخفیف درمانی</h1>
            <p className="text-xs text-muted-foreground mt-1">حامی کارت</p>
          </motion.div>

          {/* Back arrow */}
          <motion.div variants={itemVariants} className="flex justify-end mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => router.push('/')}
              aria-label="بازگشت به صفحه اصلی"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* Card */}
          <motion.div variants={itemVariants}>
            <Card className="w-full shadow-lg border-border/60">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl font-bold">
                  ورود به حساب کاربری
                </CardTitle>
                <CardDescription className="text-sm mt-1.5">
                  با شماره موبایل خود وارد حساب کاربری شوید
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="otp" className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="otp" className="gap-1.5 text-sm">
                      <Phone className="h-3.5 w-3.5" />
                      کد یکبار مصرف
                    </TabsTrigger>
                    <TabsTrigger value="password" className="gap-1.5 text-sm">
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
                              className="text-left pe-10 font-mono tracking-wider"
                            />
                            <Phone className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            کد تایید به این شماره ارسال خواهد شد
                          </p>
                        </div>

                        <Button
                          className="w-full"
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
                            className="h-8 w-8"
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
                            className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-center"
                          >
                            <p className="text-xs text-emerald-700 dark:text-emerald-400">
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
                          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-center">
                            <p className="text-xs text-destructive">
                              {remainingAttempts} بار تلاش باقیمانده
                            </p>
                          </div>
                        )}

                        {/* Verify button */}
                        <Button
                          className="w-full"
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
                              className="text-sm p-0 h-auto"
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
                            className="text-left pe-10 font-mono tracking-wider"
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
                            className="pe-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute end-0 top-0 h-full px-3 hover:bg-transparent"
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
                        className="w-full"
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
              <div className="px-6 pb-6">
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
            className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground text-center space-y-1"
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
